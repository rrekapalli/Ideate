package com.ideate.orchestrator;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ideate.IdeateProperties;
import com.ideate.context.ProjectStateAssembler;
import com.ideate.credits.CreditService;
import com.ideate.embed.EmbedService;
import com.ideate.graph.GraphService;
import com.ideate.graph.IdeaObject;
import com.ideate.graph.ObjectCatalog;
import com.ideate.jobs.JobService;
import com.ideate.providers.ChatClient;
import com.ideate.providers.OpenAiCompatibleChatClient;
import com.ideate.routing.JobClassifier;
import com.ideate.transcript.TranscriptService;
import com.ideate.usage.UsageService;
import com.ideate.workspace.WorkspaceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class TurnOrchestrator {
    private static final Logger log = LoggerFactory.getLogger(TurnOrchestrator.class);

    private static final String SYSTEM = """
            You are Ideate, a graph writer with a conversational face.
            Persist thinking as typed cards and typed edges. Be aggressive about creating objects.
            Never dump essays that should be cards. Reply with a short conversational message AND a JSON object:
            {
              "text": "assistant reply shown in chat",
              "tools": [
                {"name":"create_node","args":{"type":"thought","title":"...","summary":"...","body":"...","tags":["estimate"]}},
                {"name":"create_edge","args":{"type":"supports","fromDisplayId":"H-001","toDisplayId":"E-001","why":"..."}},
                {"name":"update_node","args":{"displayId":"H-001","summary":"..."}},
                {"name":"start_evaluation","args":{"hypothesisDisplayId":"H-001","title":"...","body":"..."}},
                {"name":"propose_theory","args":{"evaluationDisplayId":"EV-001","title":"...","body":"..."}}
              ]
            }
            Card types: thought, concept, unknown, question, hypothesis, assumption, evidence, experiment,
            observation, claim, critique, decision, evaluation, theory, misconception, constraint,
            calculation, target, design_artifact, architecture, component.
            Do not create a theory unless an evaluation exists. Use epistemic tags: fact, inference, speculation, target, estimate.
            Every create_node MUST include a non-empty title, summary, and body copied from the idea. Never call tools with empty arguments.
            """;

    private final WorkspaceService workspaces;
    private final TranscriptService transcript;
    private final GraphService graph;
    private final ProjectStateAssembler assembler;
    private final JobClassifier classifier;
    private final CreditService credits;
    private final UsageService usage;
    private final JobService jobs;
    private final OpenAiCompatibleChatClient chatClient;
    private final IdeateProperties properties;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final EmbedService embedService;
    private final ConversationCacheService cacheService;
    private final ConversationGraphHydrator hydrator = new ConversationGraphHydrator();

    public TurnOrchestrator(WorkspaceService workspaces, TranscriptService transcript, GraphService graph,
                            ProjectStateAssembler assembler, JobClassifier classifier, CreditService credits,
                            UsageService usage, JobService jobs, OpenAiCompatibleChatClient chatClient,
                            IdeateProperties properties, JdbcTemplate jdbc, ObjectMapper mapper,
                            EmbedService embedService, ConversationCacheService cacheService) {
        this.workspaces = workspaces;
        this.transcript = transcript;
        this.graph = graph;
        this.assembler = assembler;
        this.classifier = classifier;
        this.credits = credits;
        this.usage = usage;
        this.jobs = jobs;
        this.chatClient = chatClient;
        this.properties = properties;
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.embedService = embedService;
        this.cacheService = cacheService;
    }

    public TurnResult turn(String accountId, String workspaceId, TurnRequest request) {
        var ws = workspaces.get(accountId, workspaceId);
        String branchId = request.branchId() == null ? ws.mainstreamBranchId() : request.branchId();
        String mode = request.mode() == null ? "explore" : request.mode();
        String jobClass = classifier.classify(mode, request.content(), request.jobClass());
        credits.require(accountId, jobClass);

        var userMsg = transcript.append(workspaceId, branchId, "user", request.content(), mode);
        var job = jobs.enqueue(workspaceId, accountId, jobClass, mode, "orchestrator", request.focusObjectIds());
        jobs.markRunning(job.id());

        String projectState = assembler.assemble(workspaceId, branchId, request.content(), request.focusObjectIds());
        ProviderTarget target = resolveProvider(accountId, workspaceId, jobClass);
        ChatClient.ChatResult completion = chatClient.complete(new ChatClient.ChatRequest(
                target.model(),
                target.baseUrl(),
                target.apiKey(),
                List.of(
                        new ChatClient.Message("system", SYSTEM),
                        new ChatClient.Message("user", projectState)
                ),
                1600
        ));

        String assistantText;
        List<String> createdIds = new ArrayList<>();
        if (completion.error() != null) {
            assistantText = "I saved your message, but the model was unreachable: " + completion.error()
                    + ". The graph was not changed.";
            jobs.markFailed(job.id(), completion.error());
            insertProblem(workspaceId, "provider", completion.error(), List.of());
        } else {
            assistantText = completion.text() == null || completion.text().isBlank()
                    ? "Updated the workspace graph."
                    : completion.text();
        }
        var assistantMsg = transcript.append(workspaceId, branchId, "assistant", assistantText, mode);
        if (completion.error() == null) {
            String generatedBy = target.provider() + ":" + target.model();
            createdIds.addAll(applyTools(workspaceId, completion.toolCalls(), userMsg.id(), assistantMsg.id(),
                    generatedBy));
            createdIds.addAll(hydrateGraph(workspaceId, createdIds, request.content(), assistantText,
                    userMsg.id(), assistantMsg.id(), generatedBy));
            jobs.markApplied(job.id(), createdIds);
        }

        usage.record(workspaceId, accountId, job.id(), target.provider(), target.model(), jobClass,
                completion.inputTokens(), completion.outputTokens(), 0);
        if (completion.error() == null) {
            credits.debit(accountId, workspaceId, job.id(), jobClass);
        }

        if (("NORMAL".equals(jobClass) || "DEEP".equals(jobClass)) && completion.error() == null) {
            cacheService.refresh(accountId, workspaceId, branchId, userMsg.id());
        }

        return new TurnResult(
                assistantMsg.id(),
                assistantText,
                jobClass,
                job.id(),
                createdIds,
                completion.error()
        );
    }

    List<String> hydrateGraph(String workspaceId, List<String> createdIds, String userText, String assistantText,
                              String userMsgId, String assistantMsgId, String generatedBy) {
        List<String> ids = new ArrayList<>();
        List<IdeaObject> created = new ArrayList<>();
        for (String id : createdIds) {
            try {
                created.add(graph.getObject(workspaceId, id));
            } catch (Exception ignored) {
                // skip vanished ids
            }
        }
        for (IdeaObject existing : graph.graph(workspaceId, null).nodes()) {
            boolean mentioned = userText != null
                    && userText.toUpperCase(Locale.ROOT).contains(existing.displayId().toUpperCase(Locale.ROOT));
            if ((mentioned || hydrator.needsFill(existing))
                    && created.stream().noneMatch(o -> o.id().equals(existing.id()))) {
                created.add(existing);
            }
        }
        if (created.isEmpty() && assistantText != null && assistantText.length() > 40
                && !assistantText.startsWith("I saved your message")) {
            var thought = graph.createObject(workspaceId, null, new GraphService.CreateObjectRequest(
                    "thought",
                    trimTitle(assistantText),
                    trimSummary(assistantText),
                    assistantText,
                    null, "original", null, null,
                    generatedBy, userMsgId, assistantMsgId,
                    null, null, List.of(), List.of()));
            created.add(thought);
            ids.add(thought.id());
        }
        var plan = hydrator.plan(userText, assistantText, created);
        for (var patch : plan.nodes()) {
            try {
                graph.updateObject(workspaceId, patch.objectId(), new GraphService.UpdateObjectRequest(
                        patch.type(), patch.title(), patch.summary(), patch.body(),
                        null, true, generatedBy, userMsgId, assistantMsgId,
                        null, null, null));
                ids.add(patch.objectId());
            } catch (Exception ex) {
                log.warn("Hydrate node {} failed: {}", patch.objectId(), ex.getMessage());
            }
        }
        for (var extra : plan.extras()) {
            try {
                var createdExtra = graph.createObject(workspaceId, null, new GraphService.CreateObjectRequest(
                        extra.type(), extra.title(), extra.summary(), extra.body(),
                        null, "original", null, null,
                        generatedBy, userMsgId, assistantMsgId,
                        null, null, List.of(), List.of()));
                ids.add(createdExtra.id());
                created.add(createdExtra);
            } catch (Exception ex) {
                log.warn("Hydrate extra card failed: {}", ex.getMessage());
            }
        }
        for (var edge : plan.edges()) {
            try {
                IdeaObject from = resolveKey(workspaceId, edge.fromDisplayId());
                IdeaObject to = resolveKey(workspaceId, edge.toDisplayId());
                if (from == null || to == null) {
                    continue;
                }
                graph.createEdge(workspaceId, new GraphService.CreateEdgeRequest(
                        edge.type(), from.id(), to.id(), edge.why(),
                        null, userMsgId, assistantMsgId));
            } catch (Exception ex) {
                log.warn("Hydrate edge {} failed: {}", edge.type(), ex.getMessage());
            }
        }
        return ids;
    }

    private IdeaObject resolveKey(String workspaceId, String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        try {
            return graph.getObject(workspaceId, key);
        } catch (Exception ignored) {
            return graph.findByDisplayId(workspaceId, key);
        }
    }

    private static String trimTitle(String text) {
        String first = text.split("[.\\n]")[0].trim();
        return first.length() > 120 ? first.substring(0, 119) + "…" : first;
    }

    private static String trimSummary(String text) {
        String t = text.trim();
        return t.length() > 240 ? t.substring(0, 239) + "…" : t;
    }

    public List<String> applyTools(String workspaceId, List<ChatClient.ToolCall> tools,
                                   String userMsgId, String assistantMsgId, String generatedBy) {
        List<String> ids = new ArrayList<>();
        if (tools == null) {
            return ids;
        }
        for (ChatClient.ToolCall call : tools) {
            try {
                JsonNode args = mapper.readTree(call.argumentsJson() == null ? "{}" : call.argumentsJson());
                switch (call.name()) {
                    case "create_node" -> {
                        String type = args.path("type").asText("thought").toLowerCase(Locale.ROOT);
                        if (!ObjectCatalog.NODE_TYPES.contains(type) || "theory".equals(type)) {
                            if ("theory".equals(type)) {
                                continue;
                            }
                            type = "thought";
                        }
                        var created = graph.createObject(workspaceId, null, new GraphService.CreateObjectRequest(
                                type,
                                args.path("title").asText("Untitled"),
                                args.path("summary").asText(""),
                                args.path("body").asText(""),
                                null, "original", null, null,
                                generatedBy, userMsgId, assistantMsgId,
                                args.path("canvasX").isMissingNode() ? null : args.path("canvasX").asDouble(),
                                args.path("canvasY").isMissingNode() ? null : args.path("canvasY").asDouble(),
                                readTags(args),
                                List.of()
                        ));
                        embedService.embedLater(created.id(), created.summary() + " " + created.body());
                        ids.add(created.id());
                    }
                    case "update_node" -> {
                        IdeaObject existing = resolve(workspaceId, args);
                        if (existing == null) {
                            continue;
                        }
                        var updated = graph.updateObject(workspaceId, existing.id(), new GraphService.UpdateObjectRequest(
                                textOrNull(args, "type"),
                                textOrNull(args, "title"),
                                textOrNull(args, "summary"),
                                textOrNull(args, "body"),
                                textOrNull(args, "objectCategory"),
                                true,
                                generatedBy, userMsgId, assistantMsgId,
                                null, null, readTags(args)
                        ));
                        ids.add(updated.id());
                    }
                    case "create_edge" -> {
                        IdeaObject from = resolveByKey(workspaceId, args, "fromDisplayId", "fromId");
                        IdeaObject to = resolveByKey(workspaceId, args, "toDisplayId", "toId");
                        if (from == null || to == null) {
                            continue;
                        }
                        String type = args.path("type").asText("mentions");
                        if (!ObjectCatalog.EDGE_TYPES.contains(type) || "promoted-to".equals(type)) {
                            if (!ObjectCatalog.EDGE_TYPES.contains(type)) {
                                type = "mentions";
                            }
                        }
                        graph.createEdge(workspaceId, new GraphService.CreateEdgeRequest(
                                type, from.id(), to.id(), args.path("why").asText(""),
                                null, userMsgId, assistantMsgId
                        ));
                    }
                    case "attach_file" -> log.debug("attach_file is a later object-store path");
                    case "start_evaluation" -> {
                        IdeaObject hyp = resolveByKey(workspaceId, args, "hypothesisDisplayId", "hypothesisId");
                        if (hyp == null) {
                            continue;
                        }
                        var ev = graph.createObject(workspaceId, null, new GraphService.CreateObjectRequest(
                                "evaluation",
                                args.path("title").asText("Evaluation of " + hyp.displayId()),
                                args.path("summary").asText(""),
                                args.path("body").asText(""),
                                null, "original", null, "active",
                                generatedBy, userMsgId, assistantMsgId,
                                nearby(hyp.canvasX()), nearby(hyp.canvasY()),
                                List.of(), List.of(hyp.id())
                        ));
                        graph.createEdge(workspaceId, new GraphService.CreateEdgeRequest(
                                "evaluated-by", hyp.id(), ev.id(), "AI evaluation",
                                null, userMsgId, assistantMsgId
                        ));
                        ids.add(ev.id());
                    }
                    case "propose_theory" -> {
                        IdeaObject ev = resolveByKey(workspaceId, args, "evaluationDisplayId", "evaluationId");
                        if (ev == null || !"evaluation".equals(ev.type())) {
                            continue;
                        }
                        var theory = graph.createTheoryFromEvaluation(
                                workspaceId, ev.id(),
                                args.path("title").asText("Proposed theory"),
                                args.path("summary").asText(""),
                                args.path("body").asText(""),
                                generatedBy, userMsgId, assistantMsgId);
                        ids.add(theory.id());
                    }
                    default -> log.debug("Unknown tool {}", call.name());
                }
            } catch (Exception ex) {
                log.warn("Tool {} failed: {}", call.name(), ex.getMessage());
                insertProblem(workspaceId, "tool", call.name() + ": " + ex.getMessage(), List.of());
            }
        }
        return ids;
    }

    public JobService.JobRecord enqueueBatch(String accountId, String workspaceId, BatchRequest request) {
        credits.require(accountId, "BATCH");
        var ws = workspaces.get(accountId, workspaceId);
        var job = jobs.enqueue(workspaceId, accountId, "BATCH", request.mode(), request.agent(), request.focusObjectIds());
        runGraphReview(workspaceId, job.id());
        credits.debit(accountId, workspaceId, job.id(), "BATCH");
        return jobs.get(workspaceId, job.id());
    }

    public void runGraphReview(String workspaceId, String jobId) {
        jobs.markRunning(jobId);
        var snapshot = graph.graph(workspaceId, null);
        List<String> ids = new ArrayList<>();
        boolean hasHypothesis = snapshot.nodes().stream().anyMatch(n -> "hypothesis".equals(n.type()));
        boolean hasEvaluation = snapshot.nodes().stream().anyMatch(n -> "evaluation".equals(n.type()));
        if (hasHypothesis && !hasEvaluation) {
            List<String> hypIds = snapshot.nodes().stream()
                    .filter(n -> "hypothesis".equals(n.type()))
                    .map(IdeaObject::id)
                    .toList();
            insertProblem(workspaceId, "review", "Hypothesis exists without Evaluation", hypIds);
            ids.addAll(hypIds);
        }
        jobs.markApplied(jobId, ids);
    }

    private ProviderTarget resolveProvider(String accountId, String workspaceId, String jobClass) {
        String provider = "ollama";
        String model = properties.getOllama().getModel();
        String base = properties.getOllama().getBaseUrl();
        String apiKey = "";
        List<SettingsRow> account = jdbc.query(
                "SELECT provider, model, ollama_base_url FROM account_ai_settings WHERE account_id = ?",
                (rs, i) -> new SettingsRow(rs.getString("provider"), rs.getString("model"), rs.getString("ollama_base_url")),
                accountId);
        if (!account.isEmpty()) {
            if (account.getFirst().provider != null) {
                provider = account.getFirst().provider;
            }
            if (account.getFirst().model != null) {
                model = account.getFirst().model;
            }
            if (account.getFirst().ollamaBaseUrl != null) {
                base = account.getFirst().ollamaBaseUrl;
            }
        }
        List<SettingsRow> ws = jdbc.query(
                "SELECT provider_override, model_override, ollama_base_url FROM workspace_ai_settings WHERE workspace_id = ?",
                (rs, i) -> new SettingsRow(rs.getString("provider_override"), rs.getString("model_override"), rs.getString("ollama_base_url")),
                workspaceId);
        if (!ws.isEmpty()) {
            if (ws.getFirst().provider != null) {
                provider = ws.getFirst().provider;
            }
            if (ws.getFirst().model != null) {
                model = ws.getFirst().model;
            }
            if (ws.getFirst().ollamaBaseUrl != null) {
                base = ws.getFirst().ollamaBaseUrl;
            }
        }
        if ("SIMPLE".equals(jobClass)) {
            provider = "ollama";
            model = properties.getOllama().getModel();
            base = properties.getOllama().getBaseUrl();
        } else if ("openai".equalsIgnoreCase(provider) && properties.getOpenai().getApiKey() != null
                && !properties.getOpenai().getApiKey().isBlank()) {
            base = properties.getOpenai().getBaseUrl();
            apiKey = properties.getOpenai().getApiKey();
            if (model == null || model.isBlank() || "llama3.2".equals(model)) {
                model = properties.getOpenai().getModel();
            }
        }
        return new ProviderTarget(provider, model, base, apiKey);
    }

    private void insertProblem(String workspaceId, String kind, String message, List<String> objectIds) {
        String[] ids = objectIds == null ? new String[0] : objectIds.toArray(String[]::new);
        jdbc.update(connection -> {
            var ps = connection.prepareStatement("""
                    INSERT INTO graph_problem (id, workspace_id, kind, message, object_ids)
                    VALUES (gen_random_uuid()::text, ?, ?, ?, ?)
                    """);
            ps.setString(1, workspaceId);
            ps.setString(2, kind);
            ps.setString(3, message);
            ps.setArray(4, connection.createArrayOf("text", ids));
            return ps;
        });
    }

    private IdeaObject resolve(String workspaceId, JsonNode args) {
        return resolveByKey(workspaceId, args, "displayId", "id");
    }

    private IdeaObject resolveByKey(String workspaceId, JsonNode args, String displayKey, String idKey) {
        if (args.hasNonNull(idKey)) {
            try {
                return graph.getObject(workspaceId, args.path(idKey).asText());
            } catch (Exception ignored) {
                return null;
            }
        }
        if (args.hasNonNull(displayKey)) {
            return graph.findByDisplayId(workspaceId, args.path(displayKey).asText());
        }
        return null;
    }

    private List<String> readTags(JsonNode args) {
        JsonNode tags = args.path("tags");
        if (!tags.isArray()) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        tags.forEach(n -> out.add(n.asText()));
        return out;
    }

    private static String textOrNull(JsonNode args, String field) {
        return args.hasNonNull(field) ? args.path(field).asText() : null;
    }

    private static Double nearby(Double value) {
        return value == null ? 160.0 : value + 90;
    }

    public record TurnRequest(String content, String mode, String branchId, String jobClass, List<String> focusObjectIds) {}

    public record BatchRequest(String mode, String agent, List<String> focusObjectIds) {}

    public record TurnResult(String assistantMessageId, String assistantText, String jobClass, String jobId,
                             List<String> objectIds, String error) {}

    private record ProviderTarget(String provider, String model, String baseUrl, String apiKey) {}

    private record SettingsRow(String provider, String model, String ollamaBaseUrl) {}
}
