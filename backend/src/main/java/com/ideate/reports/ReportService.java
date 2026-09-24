package com.ideate.reports;

import com.ideate.Ids;
import com.ideate.IdeateProperties;
import com.ideate.attachments.AttachmentService;
import com.ideate.credits.CreditService;
import com.ideate.graph.GraphService;
import com.ideate.jobs.JobService;
import com.ideate.providers.ChatClient;
import com.ideate.providers.OpenAiCompatibleChatClient;
import com.ideate.usage.UsageService;
import com.ideate.workspace.WorkspaceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

@Service
public class ReportService {
    private static final Logger log = LoggerFactory.getLogger(ReportService.class);
    private static final String SYSTEM = """
            You write a publication-quality research report from a workspace idea graph.
            The graph is the only source of claims. Do not invent numbers, papers, authors, DOIs, or stronger conclusions.
            Call a hypothesis conclusive only when an Evaluation outcome is supported, or a Theory exists via promoted-to.
            Keep abandoned hypotheses and misconceptions as history. Keep unknowns, questions, targets, and estimates labeled.
            If the graph is thin, say the exploration has not reached a conclusion.
            Do not mention cards, nodes, edges, tools, JSON, or that you are an AI.
            You may include at most one mermaid fence when a figure carries the argument. Use one diagram type and matching syntax only:
            flowchart TD  OR  sequenceDiagram (participant / Note left of Name:)  OR  stateDiagram-v2 (state and [*] transitions).
            Never mix those. Never put participant lines in a stateDiagram.
            Reply in this exact shape:

            TITLE: <the workspace's central question, or the workspace name — never the words Title, Question, or Report>
            SUMMARY: <2–4 sentences>
            BODY:
            Markdown report with sections for the question, established facts (cite display ids), reasoning, conclusions, dropped lines, and still open.
            Do not repeat TITLE, SUMMARY, or BODY labels inside the markdown.
            """;

    private final JdbcTemplate jdbc;
    private final GraphService graph;
    private final WorkspaceService workspaces;
    private final JobService jobs;
    private final CreditService credits;
    private final UsageService usage;
    private final OpenAiCompatibleChatClient chatClient;
    private final IdeateProperties properties;
    private final ReportExport export;
    private final AttachmentService attachments;
    private final Executor pool = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "ideate-report");
        t.setDaemon(true);
        return t;
    });

    public ReportService(JdbcTemplate jdbc, GraphService graph, WorkspaceService workspaces, JobService jobs,
                         CreditService credits, UsageService usage, OpenAiCompatibleChatClient chatClient,
                         IdeateProperties properties, ReportExport export, AttachmentService attachments) {
        this.jdbc = jdbc;
        this.graph = graph;
        this.workspaces = workspaces;
        this.jobs = jobs;
        this.credits = credits;
        this.usage = usage;
        this.chatClient = chatClient;
        this.properties = properties;
        this.export = export;
        this.attachments = attachments;
    }

    public ReportBundle get(String workspaceId, String branchId) {
        String branch = resolveBranch(workspaceId, branchId);
        ReportRecord report = find(workspaceId, branch);
        if (report == null) {
            return new ReportBundle(null, List.of());
        }
        List<ReportVersion> vers = versions(report.id());
        if ("ready".equals(report.status())) {
            for (ReportVersion ver : vers) {
                storeMarkdownInDocsIfMissing(workspaceId, ver);
            }
        }
        return new ReportBundle(report, vers);
    }

    public JobService.JobRecord prepare(String accountId, String workspaceId, String branchId) {
        String branch = resolveBranch(workspaceId, branchId);
        ReportRecord existing = find(workspaceId, branch);
        if (existing != null && !"failed".equals(existing.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A report already exists for this branch");
        }
        if (existing != null && existing.currentVersion() > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Use update to refresh this report");
        }
        if (existing != null && busy(existing.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A report job is already running");
        }
        credits.require(accountId, "DEEP");
        var ws = workspaces.get(accountId, workspaceId);
        var job = jobs.enqueue(workspaceId, accountId, "DEEP", "review", "report", List.of());
        String reportId;
        if (existing == null) {
            reportId = Ids.id("rpt_");
            Instant now = Instant.now();
            jdbc.update("""
                    INSERT INTO workspace_report (
                        id, workspace_id, branch_id, status, current_version, title, last_job_id, created_at, updated_at)
                    VALUES (?,?,?,'preparing',0,'',?,?,?)
                    """, reportId, workspaceId, branch, job.id(), Timestamp.from(now), Timestamp.from(now));
        } else {
            reportId = existing.id();
            jdbc.update("""
                    UPDATE workspace_report
                    SET status = 'preparing', error = NULL, last_job_id = ?, updated_at = now()
                    WHERE id = ?
                    """, job.id(), reportId);
        }
        pool.execute(() -> runJob(accountId, workspaceId, branch, reportId, job.id(), ws.name(), ws.persona(), false));
        return job;
    }

    public JobService.JobRecord update(String accountId, String workspaceId, String branchId) {
        String branch = resolveBranch(workspaceId, branchId);
        ReportRecord existing = find(workspaceId, branch);
        if (existing == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No report yet. Prepare one first.");
        }
        if (busy(existing.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A report job is already running");
        }
        if (!"ready".equals(existing.status()) && !("failed".equals(existing.status()) && existing.currentVersion() > 0)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Report is not ready to update");
        }
        credits.require(accountId, "DEEP");
        var ws = workspaces.get(accountId, workspaceId);
        var job = jobs.enqueue(workspaceId, accountId, "DEEP", "review", "report", List.of());
        jdbc.update("""
                UPDATE workspace_report
                SET status = 'updating', error = NULL, last_job_id = ?, updated_at = now()
                WHERE id = ?
                """, job.id(), existing.id());
        pool.execute(() -> runJob(accountId, workspaceId, branch, existing.id(), job.id(), ws.name(), ws.persona(), true));
        return job;
    }

    public void delete(String workspaceId, String reportId) {
        int n = jdbc.update("DELETE FROM workspace_report WHERE workspace_id = ? AND id = ?", workspaceId, reportId);
        if (n == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found");
        }
    }

    public ExportedFile export(String workspaceId, String reportId, int version, String format, List<String> diagrams) {
        ReportRecord report = getById(workspaceId, reportId);
        ReportVersion ver = versions(report.id()).stream()
                .filter(v -> v.version() == version)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report version not found"));
        byte[] bytes = export.render(ver.title(), ver.summary(), ver.body(), format, diagrams);
        String filename = export.filename(ver.title(), version, format);
        String contentType = export.contentType(format);
        try {
            attachments.storeGenerated(workspaceId, "Reports", filename, contentType, bytes);
        } catch (Exception ex) {
            log.warn("Could not keep exported report in Docs: {}", ex.getMessage());
        }
        return new ExportedFile(filename, contentType, bytes);
    }

    private void runJob(String accountId, String workspaceId, String branchId, String reportId, String jobId,
                        String workspaceName, String persona, boolean update) {
        jobs.markRunning(jobId);
        try {
            GraphService.GraphSnapshot snapshot = graph.graph(workspaceId, branchId);
            String projection = ReportProjection.assemble(snapshot, workspaceName, persona);
            ProviderTarget target = resolveProvider(accountId, workspaceId);
            ChatClient.ChatResult completion = complete(target, projection);
            usage.record(workspaceId, accountId, jobId, target.provider(), target.model(), "DEEP",
                    completion.inputTokens(), completion.outputTokens(), 0);
            if (completion.error() != null) {
                fail(reportId, jobId, completion.error(), update);
                return;
            }
            ReportDraftParser.Draft draft = ReportDraftParser.parse(
                    completion.text(), workspaceName, primaryQuestionTitle(snapshot));
            if (draft.body() == null || draft.body().isBlank()) {
                fail(reportId, jobId, "The model returned an empty report.", update);
                return;
            }
            Integer next = jdbc.queryForObject(
                    "SELECT current_version FROM workspace_report WHERE id = ?", Integer.class, reportId);
            int version = (next == null ? 0 : next) + 1;
            String generatedBy = target.provider() + ":" + target.model();
            jdbc.update("""
                    INSERT INTO workspace_report_version (
                        id, report_id, version, title, summary, body, generated_by, job_id, created_at)
                    VALUES (?,?,?,?,?,?,?,?, now())
                    """, Ids.id("rptv_"), reportId, version, draft.title(), draft.summary(), draft.body(),
                    generatedBy, jobId);
            jdbc.update("""
                    UPDATE workspace_report
                    SET status = 'ready', current_version = ?, title = ?, error = NULL, updated_at = now()
                    WHERE id = ?
                    """, version, draft.title(), reportId);
            storeMarkdownInDocs(workspaceId, draft.title(), draft.summary(), draft.body(), version);
            jobs.markApplied(jobId, List.of(reportId));
            credits.debit(accountId, workspaceId, jobId, "DEEP");
        } catch (Exception ex) {
            log.error("Report job {} failed: {}", jobId, ex.getMessage(), ex);
            fail(reportId, jobId, ex.getMessage() == null ? "report failed" : ex.getMessage(), update);
        }
    }

    private void fail(String reportId, String jobId, String error, boolean update) {
        String fallback = update ? "failed" : "failed";
        jdbc.update("""
                UPDATE workspace_report
                SET status = ?, error = ?, updated_at = now()
                WHERE id = ?
                """, fallback, error, reportId);
        jobs.markFailed(jobId, error);
    }

    private ChatClient.ChatResult complete(ProviderTarget target, String projection) {
        List<String> bases = new ArrayList<>();
        addUnique(bases, target.baseUrl());
        addUnique(bases, properties.getOllama().getBaseUrl());
        addUnique(bases, "http://127.0.0.1:11434");
        List<String> models = new ArrayList<>();
        addUnique(models, target.model());
        addUnique(models, properties.getOllama().getModel());
        addUnique(models, "llama3.2");

        ChatClient.ChatResult last = null;
        for (String base : bases) {
            boolean hostDead = false;
            for (String model : models) {
                last = chatClient.complete(new ChatClient.ChatRequest(
                        model,
                        base,
                        target.apiKey(),
                        List.of(
                                new ChatClient.Message("system", SYSTEM),
                                new ChatClient.Message("user", projection)
                        ),
                        4000,
                        false
                ));
                if (last.error() == null) {
                    return last;
                }
                String err = last.error().toLowerCase(Locale.ROOT);
                if (err.contains("timed out") || err.contains("i/o error") || err.contains("connection refused")
                        || err.contains("unreachable") || err.contains("failed to connect")) {
                    hostDead = true;
                    break;
                }
                if (err.contains("not found")) {
                    break;
                }
            }
            if (hostDead) {
                continue;
            }
        }
        return last == null ? ChatClient.ChatResult.error("No model available for the report") : last;
    }

    private ProviderTarget resolveProvider(String accountId, String workspaceId) {
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
        if ("openai".equalsIgnoreCase(provider) && properties.getOpenai().getApiKey() != null
                && !properties.getOpenai().getApiKey().isBlank()) {
            base = properties.getOpenai().getBaseUrl();
            apiKey = properties.getOpenai().getApiKey();
            if (model == null || model.isBlank() || "llama3.2".equals(model)) {
                model = properties.getOpenai().getModel();
            }
        }
        return new ProviderTarget(provider, model, base, apiKey);
    }

    private ReportRecord find(String workspaceId, String branchId) {
        List<ReportRecord> found = jdbc.query(
                "SELECT * FROM workspace_report WHERE workspace_id = ? AND branch_id = ?",
                reportMapper(), workspaceId, branchId);
        return found.isEmpty() ? null : found.getFirst();
    }

    private ReportRecord getById(String workspaceId, String reportId) {
        List<ReportRecord> found = jdbc.query(
                "SELECT * FROM workspace_report WHERE workspace_id = ? AND id = ?",
                reportMapper(), workspaceId, reportId);
        if (found.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found");
        }
        return found.getFirst();
    }

    private List<ReportVersion> versions(String reportId) {
        return jdbc.query("""
                SELECT * FROM workspace_report_version WHERE report_id = ? ORDER BY version
                """, versionMapper(), reportId);
    }

    private String resolveBranch(String workspaceId, String branchId) {
        if (branchId != null && !branchId.isBlank()) {
            return branchId;
        }
        return jdbc.queryForObject(
                "SELECT id FROM branch WHERE workspace_id = ? AND branch_role = 'mainstream'",
                String.class, workspaceId);
    }

    private void storeMarkdownInDocsIfMissing(String workspaceId, ReportVersion ver) {
        String filename = export.filename(ver.title(), ver.version(), "md");
        try {
            if (attachments.hasGenerated(workspaceId, "Reports", filename)) {
                return;
            }
        } catch (Exception ex) {
            log.warn("Could not check Docs for generated report markdown: {}", ex.getMessage());
        }
        storeMarkdownInDocs(workspaceId, ver.title(), ver.summary(), ver.body(), ver.version());
    }

    private void storeMarkdownInDocs(String workspaceId, String title, String summary, String body, int version) {
        try {
            byte[] bytes = export.render(title, summary, body, "md", List.of());
            String filename = export.filename(title, version, "md");
            attachments.storeGenerated(workspaceId, "Reports", filename, export.contentType("md"), bytes);
        } catch (Exception ex) {
            log.warn("Could not keep generated report markdown in Docs: {}", ex.getMessage());
        }
    }

    private static boolean busy(String status) {
        return "preparing".equals(status) || "updating".equals(status);
    }

    private static String primaryQuestionTitle(GraphService.GraphSnapshot snapshot) {
        if (snapshot == null || snapshot.nodes() == null) {
            return null;
        }
        return snapshot.nodes().stream()
                .filter(n -> "question".equals(n.type()) && hasText(n.title()))
                .sorted((a, b) -> String.valueOf(a.displayId()).compareToIgnoreCase(String.valueOf(b.displayId())))
                .map(n -> n.title().trim())
                .findFirst()
                .orElse(null);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static void addUnique(List<String> values, String value) {
        if (hasText(value) && values.stream().noneMatch(value::equalsIgnoreCase)) {
            values.add(value);
        }
    }

    private static RowMapper<ReportRecord> reportMapper() {
        return (rs, i) -> new ReportRecord(
                rs.getString("id"),
                rs.getString("workspace_id"),
                rs.getString("branch_id"),
                rs.getString("status"),
                rs.getInt("current_version"),
                rs.getString("title"),
                rs.getString("error"),
                rs.getString("last_job_id"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant()
        );
    }

    private static RowMapper<ReportVersion> versionMapper() {
        return (rs, i) -> new ReportVersion(
                rs.getString("id"),
                rs.getString("report_id"),
                rs.getInt("version"),
                rs.getString("title"),
                rs.getString("summary"),
                rs.getString("body"),
                rs.getString("generated_by"),
                rs.getString("job_id"),
                rs.getTimestamp("created_at").toInstant()
        );
    }

    public record ReportRecord(
            String id,
            String workspaceId,
            String branchId,
            String status,
            int currentVersion,
            String title,
            String error,
            String lastJobId,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record ReportVersion(
            String id,
            String reportId,
            int version,
            String title,
            String summary,
            String body,
            String generatedBy,
            String jobId,
            Instant createdAt
    ) {}

    public record ReportBundle(ReportRecord report, List<ReportVersion> versions) {}

    public record ExportedFile(String filename, String contentType, byte[] bytes) {}

    private record ProviderTarget(String provider, String model, String baseUrl, String apiKey) {}

    private record SettingsRow(String provider, String model, String ollamaBaseUrl) {}
}
