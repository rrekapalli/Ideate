package com.ideate.orchestrator;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ideate.IdeateProperties;
import com.ideate.attachments.AttachmentService;
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
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

@Service
public class TurnOrchestrator {
    private static final Logger log = LoggerFactory.getLogger(TurnOrchestrator.class);

    private static final String SYSTEM = """
            You are Ideate, a careful science tutor — as useful as ChatGPT, but more precise.
            Answer ONLY the latest user question. Workspace notes and earlier chat are optional background.
            If this question is a new topic, answer that topic. Do not reuse or paraphrase a previous reply.
            Write 2–4 short Markdown paragraphs, not a bullet dump.
            Lead with the mechanism in **bold**, then explain why it is true. Name the relevant principle.
            When quantities exist, give typical measured values with units for THIS topic. Use accepted round figures.
            When a claim rests on published science, cite a real paper. End with:

            ### Citations
            1. FirstAuthor et al. (Year). Paper title. Journal or venue. DOI: 10.xxxx/xxxx

            Name only well-known real papers. If you cannot name a real source, omit the Citations section — never invent authors, titles, years, or DOIs.
            You may create_node type "citation" for each paper (title = the paper title).
            Stay concise and accurate: no filler, no chat recap.
            Do not wrap the whole reply in a code fence. A list is only for 3+ comparable numbers.
            Never mention graphs, cards, nodes, edges, display ids, tools, JSON, or that you are storing ideas.
            Never say "the graph includes" or recap what you created.
            After you answer, you may silently call tools to capture a small thinking graph from THIS turn.
            If a mechanism, sequence, comparison, or structure is clearer as a picture, put one ```mermaid fence in that card's create_node body (flowchart, sequenceDiagram, or stateDiagram-v2). Keep summary as prose. The chat reply stays prose.
            If the notes name a focus card, grow from that card only when the new question continues it.
            Otherwise attach new cards to the closest existing idea. Never leave a card isolated.
            Do not create a theory unless an evaluation already exists.
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
    private final AttachmentService attachments;
    private final ConversationGraphHydrator hydrator = new ConversationGraphHydrator();
    private final Executor turnPool = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "ideate-turn");
        t.setDaemon(true);
        return t;
    });

    public TurnOrchestrator(WorkspaceService workspaces, TranscriptService transcript, GraphService graph,
                            ProjectStateAssembler assembler, JobClassifier classifier, CreditService credits,
                            UsageService usage, JobService jobs, OpenAiCompatibleChatClient chatClient,
                            IdeateProperties properties, JdbcTemplate jdbc, ObjectMapper mapper,
                            EmbedService embedService, ConversationCacheService cacheService,
                            AttachmentService attachments) {
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
        this.attachments = attachments;
    }

    public TurnResult turn(String accountId, String workspaceId, TurnRequest request) {
        var ws = workspaces.get(accountId, workspaceId);
        String branchId = request.branchId() == null ? ws.mainstreamBranchId() : request.branchId();
        String mode = request.mode() == null ? "explore" : request.mode();
        String content = request.content() == null ? "" : request.content();
        List<String> attachmentIds = request.attachmentIds() == null ? List.of() : request.attachmentIds();
        if (content.isBlank() && attachmentIds.isEmpty()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Message or attachment required");
        }
        String jobClass = classifier.classify(mode, content, request.jobClass());
        credits.require(accountId, jobClass);

        var userMsg = transcript.append(workspaceId, branchId, "user", content, mode);
        if (!attachmentIds.isEmpty()) {
            attachments.linkToMessage(workspaceId, attachmentIds, userMsg.id());
        }
        var job = jobs.enqueue(workspaceId, accountId, jobClass, mode, "orchestrator", request.focusObjectIds());
        jobs.markRunning(job.id());
        turnPool.execute(() -> finishTurn(accountId, workspaceId, branchId, mode, jobClass, request, userMsg.id(), job.id()));
        return new TurnResult(null, "", jobClass, job.id(), List.of(), null, userMsg.id());
    }

    private void finishTurn(String accountId, String workspaceId, String branchId, String mode, String jobClass,
                            TurnRequest request, String userMsgId, String jobId) {
        try {
            String projectState = assembler.assemble(workspaceId, branchId, request.content(),
                    request.focusObjectIds(), request.attachmentIds(), mode);
            ProviderTarget target = resolveProvider(accountId, workspaceId, jobClass);
            ChatClient.ChatResult completion = completeWithRetry(target, projectState, true, request.attachmentIds(), workspaceId);
            usage.record(workspaceId, accountId, jobId, target.provider(), target.model(), jobClass,
                    completion.inputTokens(), completion.outputTokens(), 0);
            if (completion.error() != null) {
                log.warn("Turn {} still waiting on model: {}", jobId, completion.error());
                jobs.markFailed(jobId, completion.error());
                insertProblem(workspaceId, "provider", completion.error(), List.of());
                return;
            }
            String assistantText = ChatReplyCleaner.visible(completion.text());
            if (!ChatReplyCleaner.isUsable(assistantText)) {
                ChatClient.ChatResult spoken = completeWithRetry(target, projectState + """

                        Repeat: answer ONLY the latest user message above. New topic → new facts.
                        Write 2–4 Markdown paragraphs with typical measured values and units for this topic.
                        If a real paper supports the claim, end with a ### Citations list (Author et al. (Year). Title. Venue. DOI).
                        Never invent citations. Do not reply with bullets only. Do not call tools or mention graphs.
                        """, false, request.attachmentIds(), workspaceId);
                if (spoken != null && spoken.error() == null) {
                    usage.record(workspaceId, accountId, jobId, target.provider(), target.model(), jobClass,
                            spoken.inputTokens(), spoken.outputTokens(), 0);
                    assistantText = ChatReplyCleaner.visible(spoken.text());
                }
            }
            if (!ChatReplyCleaner.isUsable(assistantText)) {
                assistantText = ChatReplyCleaner.fallback(request.content());
            }
            var assistantMsg = transcript.append(workspaceId, branchId, "assistant", assistantText, mode);
            String generatedBy = target.provider() + ":" + target.model();
            List<String> createdIds = new ArrayList<>();
            createdIds.addAll(applyTools(workspaceId, completion.toolCalls(), userMsgId, assistantMsg.id(),
                    generatedBy));
            createdIds.addAll(hydrateGraph(workspaceId, createdIds, request.content(), assistantText,
                    userMsgId, assistantMsg.id(), generatedBy, request.focusObjectIds()));
            jobs.markApplied(jobId, createdIds);
            credits.debit(accountId, workspaceId, jobId, jobClass);
            if ("NORMAL".equals(jobClass) || "DEEP".equals(jobClass)) {
                cacheService.refresh(accountId, workspaceId, branchId, userMsgId);
            }
        } catch (Exception ex) {
            log.error("Turn {} failed after accept: {}", jobId, ex.getMessage(), ex);
            jobs.markFailed(jobId, ex.getMessage() == null ? "turn failed" : ex.getMessage());
        }
    }

    private ChatClient.ChatResult completeWithRetry(ProviderTarget target, String projectState, boolean enableTools) {
        return completeWithRetry(target, projectState, enableTools, List.of(), null);
    }

    private ChatClient.ChatResult completeWithRetry(ProviderTarget target, String projectState, boolean enableTools,
                                                    List<String> attachmentIds, String workspaceId) {
        List<String> bases = new ArrayList<>();
        addUnique(bases, target.baseUrl());
        addUnique(bases, properties.getOllama().getBaseUrl());
        addUnique(bases, "http://127.0.0.1:11434");
        List<String> models = new ArrayList<>();
        addUnique(models, target.model());
        addUnique(models, properties.getOllama().getModel());
        addUnique(models, "llama3.2");
        addUnique(models, "mistral");

        ChatClient.ChatResult last = null;
        for (String base : bases) {
            boolean hostDead = false;
            for (String model : models) {
                for (int attempt = 1; attempt <= 2; attempt++) {
                    List<ChatClient.ContentPart> vision = workspaceId == null
                            ? List.of()
                            : attachments.visionParts(workspaceId, attachmentIds, model);
                    ChatClient.Message user = vision.isEmpty()
                            ? new ChatClient.Message("user", projectState)
                            : new ChatClient.Message("user", projectState, vision);
                    last = chatClient.complete(new ChatClient.ChatRequest(
                            model,
                            base,
                            target.apiKey(),
                            List.of(
                                    new ChatClient.Message("system", SYSTEM),
                                    user
                            ),
                            1600,
                            enableTools
                    ));
                    if (last.error() == null) {
                        if (!base.equals(target.baseUrl()) || !model.equals(target.model())) {
                            log.info("Turn used fallback model {} at {}", model, base);
                        }
                        return last;
                    }
                    log.warn("Model {} at {} attempt {} failed: {}", model, base, attempt, last.error());
                    if (isMissingModel(last.error())) {
                        break;
                    }
                    if (isUnreachable(last.error())) {
                        hostDead = true;
                        break;
                    }
                    try {
                        Thread.sleep(800L * attempt);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        return last;
                    }
                }
                if (hostDead) {
                    break;
                }
            }
        }
        return last;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static void addUnique(List<String> values, String value) {
        if (hasText(value) && values.stream().noneMatch(value::equalsIgnoreCase)) {
            values.add(value);
        }
    }

    private static boolean isMissingModel(String error) {
        return error != null && error.toLowerCase(Locale.ROOT).contains("not found");
    }

    private static boolean isUnreachable(String error) {
        if (error == null) {
            return false;
        }
        String e = error.toLowerCase(Locale.ROOT);
        return e.contains("timed out") || e.contains("i/o error") || e.contains("connection refused")
                || e.contains("unreachable") || e.contains("unknownhost") || e.contains("connect timed out")
                || e.contains("no route to host") || e.contains("failed to connect");
    }

    List<String> hydrateGraph(String workspaceId, List<String> createdIds, String userText, String assistantText,
                              String userMsgId, String assistantMsgId, String generatedBy) {
        return hydrateGraph(workspaceId, createdIds, userText, assistantText, userMsgId, assistantMsgId,
                generatedBy, List.of());
    }

    List<String> hydrateGraph(String workspaceId, List<String> createdIds, String userText, String assistantText,
                              String userMsgId, String assistantMsgId, String generatedBy, List<String> focusKeys) {
        List<String> ids = new ArrayList<>();
        List<IdeaObject> created = new ArrayList<>();
        for (String id : createdIds) {
            try {
                created.add(graph.getObject(workspaceId, id));
            } catch (Exception ignored) {
                // skip vanished ids
            }
        }
        var snapshot = graph.graph(workspaceId, null);
        for (IdeaObject existing : snapshot.nodes()) {
            boolean mentioned = userText != null
                    && userText.toUpperCase(Locale.ROOT).contains(existing.displayId().toUpperCase(Locale.ROOT));
            if (mentioned && created.stream().noneMatch(o -> o.id().equals(existing.id()))) {
                created.add(existing);
            }
        }
        var plan = hydrator.plan(userText, assistantText, created, snapshot.nodes(),
                focusKeys == null ? List.of() : focusKeys);
        for (var patch : plan.nodes()) {
            try {
                graph.updateObject(workspaceId, patch.objectId(), new GraphService.UpdateObjectRequest(
                        patch.type(), patch.title(), patch.summary(), patch.body(),
                        null, true, generatedBy, userMsgId, assistantMsgId,
                        null, null, null, null));
                ids.add(patch.objectId());
            } catch (Exception ex) {
                log.warn("Hydrate node {} failed: {}", patch.objectId(), ex.getMessage());
            }
        }
        List<IdeaObject> minted = new ArrayList<>();
        for (var extra : plan.extras()) {
            try {
                var createdExtra = graph.createObject(workspaceId, null, new GraphService.CreateObjectRequest(
                        extra.type(), extra.title(), extra.summary(), extra.body(),
                        null, "original", null,
                        "misconception".equals(extra.type()) ? "misconception" : null,
                        generatedBy, userMsgId, assistantMsgId,
                        null, null, List.of(), List.of(), null));
                ids.add(createdExtra.id());
                created.add(createdExtra);
                minted.add(createdExtra);
            } catch (Exception ex) {
                log.warn("Hydrate extra card failed: {}", ex.getMessage());
            }
        }
        List<ConversationGraphHydrator.EdgeSpec> edges = new ArrayList<>(plan.edges());
        edges.addAll(hydrator.suggestedEdges(minted));
        edges.addAll(hydrator.attachToAnchor(minted, snapshot.nodes(),
                focusKeys == null ? List.of() : focusKeys, userText));
        var after = graph.graph(workspaceId, null);
        for (var edge : edges) {
            try {
                IdeaObject from = resolveKey(workspaceId, edge.fromDisplayId());
                IdeaObject to = resolveKey(workspaceId, edge.toDisplayId());
                if (from == null || to == null || from.id().equals(to.id())) {
                    continue;
                }
                boolean exists = after.edges().stream().anyMatch(e ->
                        e.fromObjectId().equals(from.id()) && e.toObjectId().equals(to.id())
                                && e.type().equals(edge.type()));
                if (exists) {
                    continue;
                }
                graph.createEdge(workspaceId, new GraphService.CreateEdgeRequest(
                        edge.type(), from.id(), to.id(), edge.why(),
                        null, userMsgId, assistantMsgId, null, null));
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
                                List.of(),
                                null
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
                                null, null, readTags(args), null
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
                                null, userMsgId, assistantMsgId, null, null
                        ));
                    }
                    case "attach_file" -> {
                        String attachmentId = textOrNull(args, "attachmentId");
                        IdeaObject targetObj = resolveByKey(workspaceId, args, "displayId", "objectId");
                        if (attachmentId != null && targetObj != null) {
                            attachments.linkToObject(workspaceId, attachmentId, targetObj.id());
                        } else {
                            log.debug("attach_file needs attachmentId and a target node");
                        }
                    }
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
                                List.of(), List.of(hyp.id()), null
                        ));
                        graph.createEdge(workspaceId, new GraphService.CreateEdgeRequest(
                                "evaluated-by", hyp.id(), ev.id(), "AI evaluation",
                                null, userMsgId, assistantMsgId, null, null
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
            if (hasText(account.getFirst().provider())) {
                provider = account.getFirst().provider();
            }
            if (hasText(account.getFirst().model())) {
                model = account.getFirst().model();
            }
            if (hasText(account.getFirst().ollamaBaseUrl())) {
                base = account.getFirst().ollamaBaseUrl();
            }
        }
        List<SettingsRow> ws = jdbc.query(
                "SELECT provider_override, model_override, ollama_base_url FROM workspace_ai_settings WHERE workspace_id = ?",
                (rs, i) -> new SettingsRow(rs.getString("provider_override"), rs.getString("model_override"), rs.getString("ollama_base_url")),
                workspaceId);
        if (!ws.isEmpty()) {
            if (hasText(ws.getFirst().provider())) {
                provider = ws.getFirst().provider();
            }
            if (hasText(ws.getFirst().model())) {
                model = ws.getFirst().model();
            }
            if (hasText(ws.getFirst().ollamaBaseUrl())) {
                base = ws.getFirst().ollamaBaseUrl();
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

    public record TurnRequest(String content, String mode, String branchId, String jobClass, List<String> focusObjectIds,
                             List<String> attachmentIds) {}

    public record BatchRequest(String mode, String agent, List<String> focusObjectIds) {}

    public record TurnResult(String assistantMessageId, String assistantText, String jobClass, String jobId,
                             List<String> objectIds, String error, String userMessageId) {}

    private record ProviderTarget(String provider, String model, String baseUrl, String apiKey) {}

    private record SettingsRow(String provider, String model, String ollamaBaseUrl) {}
}
