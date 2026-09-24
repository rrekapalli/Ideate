package com.ideate.api;

import com.ideate.api.dto.ApiDtos;
import com.ideate.attachments.AttachmentService;
import com.ideate.auth.CurrentUserHolder;
import com.ideate.credits.CreditService;
import com.ideate.documents.DocumentService;
import com.ideate.graph.GraphService;
import com.ideate.jobs.JobService;
import com.ideate.orchestrator.TurnOrchestrator;
import com.ideate.search.SearchService;
import com.ideate.transcript.TranscriptService;
import com.ideate.usage.UsageService;
import com.ideate.workspace.WorkspaceService;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1")
public class IdeateApiController {
    private final CurrentUserHolder currentUser;
    private final WorkspaceService workspaces;
    private final GraphService graph;
    private final TranscriptService transcript;
    private final TurnOrchestrator turns;
    private final JobService jobs;
    private final UsageService usage;
    private final CreditService credits;
    private final DocumentService documents;
    private final AttachmentService attachments;
    private final SearchService search;
    private final JdbcTemplate jdbc;

    public IdeateApiController(CurrentUserHolder currentUser, WorkspaceService workspaces, GraphService graph,
                               TranscriptService transcript, TurnOrchestrator turns, JobService jobs,
                               UsageService usage, CreditService credits, DocumentService documents,
                               AttachmentService attachments, SearchService search, JdbcTemplate jdbc) {
        this.currentUser = currentUser;
        this.workspaces = workspaces;
        this.graph = graph;
        this.transcript = transcript;
        this.turns = turns;
        this.jobs = jobs;
        this.usage = usage;
        this.credits = credits;
        this.documents = documents;
        this.attachments = attachments;
        this.search = search;
        this.jdbc = jdbc;
    }

    @GetMapping("/me")
    public Object me() {
        var user = currentUser.get();
        return Map.of("accountId", user.accountId(), "email", user.email(), "displayName", user.displayName());
    }

    @GetMapping("/me/credits")
    public CreditService.CreditBalance credits() {
        return credits.balance(currentUser.get().accountId());
    }

    @GetMapping("/me/ai-settings")
    public Map<String, Object> accountSettings() {
        return jdbc.query("""
                SELECT provider, model, ollama_base_url FROM account_ai_settings WHERE account_id = ?
                """, rs -> {
            if (!rs.next()) {
                return Map.<String, Object>of();
            }
            return Map.<String, Object>of(
                    "provider", n(rs.getString("provider")),
                    "model", n(rs.getString("model")),
                    "ollamaBaseUrl", n(rs.getString("ollama_base_url")));
        }, currentUser.get().accountId());
    }

    @PutMapping("/me/ai-settings")
    public void putAccountSettings(@RequestBody ApiDtos.AiSettingsBody body) {
        jdbc.update("""
                INSERT INTO account_ai_settings (account_id, provider, model, ollama_base_url)
                VALUES (?,?,?,?)
                ON CONFLICT (account_id) DO UPDATE SET provider = EXCLUDED.provider, model = EXCLUDED.model,
                    ollama_base_url = EXCLUDED.ollama_base_url
                """, currentUser.get().accountId(), body.provider(), body.model(), body.ollamaBaseUrl());
    }

    @GetMapping("/workspaces")
    public List<WorkspaceService.WorkspaceRecord> listWorkspaces() {
        return workspaces.list(currentUser.get().accountId());
    }

    @GetMapping("/me/workspaces")
    public List<WorkspaceService.WorkspaceSummary> dashboard() {
        return workspaces.dashboard(currentUser.get().accountId());
    }

    @PostMapping("/workspaces")
    @ResponseStatus(HttpStatus.CREATED)
    public WorkspaceService.WorkspaceRecord createWorkspace(@RequestBody ApiDtos.CreateWorkspaceRequest body) {
        return workspaces.create(currentUser.get().accountId(), body.name(), body.persona());
    }

    @GetMapping("/workspaces/{id}")
    public Map<String, Object> getWorkspace(@PathVariable String id) {
        var ws = workspaces.get(currentUser.get().accountId(), id);
        return Map.of("workspace", ws, "branches", workspaces.branches(id));
    }

    @DeleteMapping("/workspaces/{id}")
    public void deleteWorkspace(@PathVariable String id) {
        workspaces.deleteWorkspace(currentUser.get().accountId(), id);
    }

    @PostMapping("/workspaces/{id}/branches")
    @ResponseStatus(HttpStatus.CREATED)
    public WorkspaceService.BranchRecord createWorkspaceBranch(@PathVariable String id, @RequestBody ApiDtos.BranchBody body) {
        workspaces.get(currentUser.get().accountId(), id);
        return workspaces.createOverlay(id, body.name(), body.parentBranchId());
    }

    @DeleteMapping("/workspaces/{id}/branches/{branchId}")
    public void deleteWorkspaceBranch(@PathVariable String id, @PathVariable String branchId) {
        workspaces.get(currentUser.get().accountId(), id);
        workspaces.deleteBranch(id, branchId);
    }

    @GetMapping("/workspaces/{id}/graph")
    public GraphService.GraphSnapshot graph(@PathVariable String id, @RequestParam(required = false) String branchId) {
        workspaces.get(currentUser.get().accountId(), id);
        return graph.graph(id, branchId);
    }

    @PostMapping("/workspaces/{id}/objects")
    @ResponseStatus(HttpStatus.CREATED)
    public Object createObject(@PathVariable String id, @RequestBody ApiDtos.CreateObjectBody body) {
        workspaces.get(currentUser.get().accountId(), id);
        return graph.createObject(id, currentUser.get().accountId(), new GraphService.CreateObjectRequest(
                body.type(), body.title(), body.summary(), body.body(), body.branchId(), body.origin(),
                body.derivedVia(), body.objectCategory(), null, null, null,
                body.canvasX(), body.canvasY(), body.tags(), body.derivedFrom()
        ));
    }

    @GetMapping("/workspaces/{id}/objects/{objectId}")
    public Object getObject(@PathVariable String id, @PathVariable String objectId) {
        workspaces.get(currentUser.get().accountId(), id);
        return graph.getObject(id, objectId);
    }

    @PatchMapping("/workspaces/{id}/objects/{objectId}")
    public Object updateObject(@PathVariable String id, @PathVariable String objectId,
                               @RequestBody ApiDtos.UpdateObjectBody body) {
        workspaces.get(currentUser.get().accountId(), id);
        return graph.updateObject(id, objectId, new GraphService.UpdateObjectRequest(
                body.type(), body.title(), body.summary(), body.body(), body.objectCategory(),
                body.newVersion(), null, null, null, body.canvasX(), body.canvasY(), body.tags()
        ));
    }

    @DeleteMapping("/workspaces/{id}/objects/{objectId}")
    public void deleteObject(@PathVariable String id, @PathVariable String objectId) {
        workspaces.get(currentUser.get().accountId(), id);
        graph.deleteObject(id, objectId);
    }

    @PostMapping("/workspaces/{id}/objects/{objectId}/undo-delete")
    public void undoDelete(@PathVariable String id, @PathVariable String objectId) {
        workspaces.get(currentUser.get().accountId(), id);
        graph.undoDelete(id, objectId);
    }

    @PostMapping("/workspaces/{id}/objects/{objectId}/nodes")
    public Object newNode(@PathVariable String id, @PathVariable String objectId, @RequestBody ApiDtos.NewNodeBody body) {
        workspaces.get(currentUser.get().accountId(), id);
        return graph.createLinkedNode(id, objectId, new GraphService.CreateObjectRequest(
                body.type(), body.title(), body.summary(), body.body(), null, "original", null, null,
                "user", null, null, null, null, body.tags(), List.of(objectId)
        ));
    }

    @PostMapping("/workspaces/{id}/objects/{objectId}/branches")
    public Map<String, String> newBranch(@PathVariable String id, @PathVariable String objectId,
                                         @RequestBody ApiDtos.BranchBody body) {
        workspaces.get(currentUser.get().accountId(), id);
        String branchId = graph.createOverlayBranch(id, objectId, body.name());
        return Map.of("branchId", branchId);
    }

    @PostMapping("/workspaces/{id}/batch-delete")
    public Map<String, Integer> batchDelete(@PathVariable String id, @RequestParam String assistantMessageId) {
        workspaces.get(currentUser.get().accountId(), id);
        return Map.of("deleted", graph.batchDeleteByAssistantMessage(id, assistantMessageId));
    }

    @PostMapping("/workspaces/{id}/edges")
    public Object createEdge(@PathVariable String id, @RequestBody ApiDtos.CreateEdgeBody body) {
        workspaces.get(currentUser.get().accountId(), id);
        return graph.createEdge(id, new GraphService.CreateEdgeRequest(
                body.type(), body.fromObjectId(), body.toObjectId(), body.why(), body.branchId(), null, null
        ));
    }

    @DeleteMapping("/workspaces/{id}/edges/{edgeId}")
    public void deleteEdge(@PathVariable String id, @PathVariable String edgeId) {
        workspaces.get(currentUser.get().accountId(), id);
        graph.deleteEdge(id, edgeId);
    }

    @GetMapping("/workspaces/{id}/transcript")
    public List<TranscriptService.TranscriptMessage> transcript(@PathVariable String id,
                                                                @RequestParam(required = false) String branchId) {
        workspaces.get(currentUser.get().accountId(), id);
        return transcript.list(id, branchId);
    }

    @PostMapping("/workspaces/{id}/turns")
    public TurnOrchestrator.TurnResult turn(@PathVariable String id, @RequestBody ApiDtos.TurnBody body) {
        workspaces.get(currentUser.get().accountId(), id);
        return turns.turn(currentUser.get().accountId(), id, new TurnOrchestrator.TurnRequest(
                body.content(), body.mode(), body.branchId(), body.jobClass(), body.focusObjectIds(),
                body.attachmentIds()
        ));
    }

    @PostMapping("/workspaces/{id}/jobs")
    public JobService.JobRecord enqueueJob(@PathVariable String id, @RequestBody ApiDtos.JobBody body) {
        workspaces.get(currentUser.get().accountId(), id);
        String jobClass = body.jobClass() == null ? "BATCH" : body.jobClass();
        if ("BATCH".equalsIgnoreCase(jobClass)) {
            return turns.enqueueBatch(currentUser.get().accountId(), id,
                    new TurnOrchestrator.BatchRequest(body.mode(), body.agent(), body.focusObjectIds()));
        }
        return jobs.enqueue(id, currentUser.get().accountId(), jobClass, body.mode(), body.agent(), body.focusObjectIds());
    }

    @GetMapping("/workspaces/{id}/jobs")
    public List<JobService.JobRecord> listJobs(@PathVariable String id) {
        workspaces.get(currentUser.get().accountId(), id);
        return jobs.list(id);
    }

    @GetMapping("/workspaces/{id}/jobs/{jobId}")
    public JobService.JobRecord getJob(@PathVariable String id, @PathVariable String jobId) {
        workspaces.get(currentUser.get().accountId(), id);
        return jobs.get(id, jobId);
    }

    @GetMapping("/workspaces/{id}/usage")
    public UsageService.UsageRollup usage(@PathVariable String id) {
        workspaces.get(currentUser.get().accountId(), id);
        return usage.rollup(id);
    }

    @GetMapping("/workspaces/{id}/ai-settings")
    public Map<String, Object> workspaceSettings(@PathVariable String id) {
        workspaces.get(currentUser.get().accountId(), id);
        return jdbc.query("""
                SELECT provider_override, model_override, ollama_base_url
                FROM workspace_ai_settings WHERE workspace_id = ?
                """, rs -> {
            if (!rs.next()) {
                return Map.<String, Object>of();
            }
            return Map.<String, Object>of(
                    "provider", n(rs.getString("provider_override")),
                    "model", n(rs.getString("model_override")),
                    "ollamaBaseUrl", n(rs.getString("ollama_base_url")));
        }, id);
    }

    @PutMapping("/workspaces/{id}/ai-settings")
    public void putWorkspaceSettings(@PathVariable String id, @RequestBody ApiDtos.AiSettingsBody body) {
        workspaces.get(currentUser.get().accountId(), id);
        jdbc.update("""
                INSERT INTO workspace_ai_settings (workspace_id, provider_override, model_override, ollama_base_url)
                VALUES (?,?,?,?)
                ON CONFLICT (workspace_id) DO UPDATE SET provider_override = EXCLUDED.provider_override,
                    model_override = EXCLUDED.model_override, ollama_base_url = EXCLUDED.ollama_base_url
                """, id, body.provider(), body.model(), body.ollamaBaseUrl());
    }

    @GetMapping("/workspaces/{id}/documents")
    public Map<String, Object> documents(@PathVariable String id) {
        workspaces.get(currentUser.get().accountId(), id);
        return Map.of("folders", documents.folders(id), "items", documents.items(id));
    }

    @PostMapping("/workspaces/{id}/document-folders")
    public DocumentService.Folder createFolder(@PathVariable String id, @RequestBody ApiDtos.FolderBody body) {
        workspaces.get(currentUser.get().accountId(), id);
        return documents.createFolder(id, body.name(), body.parentId());
    }

    @PostMapping("/workspaces/{id}/documents")
    public DocumentService.Item createDocument(@PathVariable String id, @RequestBody ApiDtos.DocumentBody body) {
        workspaces.get(currentUser.get().accountId(), id);
        return documents.createItem(id, body.folderId(), body.name(), body.url(), body.note());
    }

    @DeleteMapping("/workspaces/{id}/document-folders/{folderId}")
    public void deleteFolder(@PathVariable String id, @PathVariable String folderId) {
        workspaces.get(currentUser.get().accountId(), id);
        documents.deleteFolder(id, folderId);
    }

    @DeleteMapping("/workspaces/{id}/documents/{itemId}")
    public void deleteDocument(@PathVariable String id, @PathVariable String itemId) {
        workspaces.get(currentUser.get().accountId(), id);
        documents.deleteItem(id, itemId);
    }

    @PostMapping("/workspaces/{id}/documents/{itemId}/attach")
    public Map<String, String> attach(@PathVariable String id, @PathVariable String itemId,
                                      @RequestBody ApiDtos.AttachBody body) {
        workspaces.get(currentUser.get().accountId(), id);
        return Map.of("objectId", documents.attachToCard(id, itemId, body.objectId()));
    }

    @GetMapping("/workspaces/{id}/attachments")
    public List<AttachmentService.Attachment> listAttachments(@PathVariable String id) {
        workspaces.get(currentUser.get().accountId(), id);
        return attachments.list(id);
    }

    @PostMapping(path = "/workspaces/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AttachmentService.Attachment uploadAttachment(@PathVariable String id,
                                                         @RequestParam("file") MultipartFile file,
                                                         @RequestParam(required = false) String objectId) {
        workspaces.get(currentUser.get().accountId(), id);
        return attachments.upload(id, objectId, file);
    }

    @GetMapping("/workspaces/{id}/attachments/{attId}")
    public AttachmentService.Attachment getAttachment(@PathVariable String id, @PathVariable String attId) {
        workspaces.get(currentUser.get().accountId(), id);
        return attachments.get(id, attId);
    }

    @GetMapping("/workspaces/{id}/attachments/{attId}/content")
    public ResponseEntity<Resource> attachmentContent(@PathVariable String id, @PathVariable String attId) {
        workspaces.get(currentUser.get().accountId(), id);
        var stored = attachments.content(id, attId);
        MediaType media = MediaType.APPLICATION_OCTET_STREAM;
        try {
            media = MediaType.parseMediaType(stored.contentType());
        } catch (Exception ignored) {
            // keep octet-stream
        }
        ContentDisposition disposition = ContentDisposition.inline()
                .filename(stored.originalName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(media)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(stored.resource());
    }

    @DeleteMapping("/workspaces/{id}/attachments/{attId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAttachment(@PathVariable String id, @PathVariable String attId) {
        workspaces.get(currentUser.get().accountId(), id);
        attachments.delete(id, attId);
    }

    @PostMapping("/workspaces/{id}/attachments/{attId}/link")
    public AttachmentService.Attachment linkAttachment(@PathVariable String id, @PathVariable String attId,
                                                       @RequestBody ApiDtos.LinkAttachmentBody body) {
        workspaces.get(currentUser.get().accountId(), id);
        return attachments.linkToObject(id, attId, body.objectId());
    }

    @GetMapping("/workspaces/{id}/search")
    public SearchService.SearchResult search(@PathVariable String id, @RequestParam String q) {
        workspaces.get(currentUser.get().accountId(), id);
        return search.search(id, q);
    }

    @GetMapping("/workspaces/{id}/timeline")
    public List<Map<String, Object>> timeline(@PathVariable String id) {
        workspaces.get(currentUser.get().accountId(), id);
        return jdbc.query("""
                SELECT id, object_id, event_type, payload::text AS payload, created_at
                FROM object_event WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 200
                """, (rs, i) -> Map.of(
                "id", rs.getString("id"),
                "objectId", n(rs.getString("object_id")),
                "eventType", rs.getString("event_type"),
                "payload", n(rs.getString("payload")),
                "createdAt", rs.getTimestamp("created_at").toInstant().toString()
        ), id);
    }

    @GetMapping("/workspaces/{id}/problems")
    public List<Map<String, Object>> problems(@PathVariable String id) {
        workspaces.get(currentUser.get().accountId(), id);
        return jdbc.query("""
                SELECT id, kind, message, object_ids, created_at
                FROM graph_problem WHERE workspace_id = ? AND dismissed_at IS NULL
                ORDER BY created_at DESC
                """, (rs, i) -> {
            java.sql.Array arr = rs.getArray("object_ids");
            List<String> ids = List.of();
            if (arr != null && arr.getArray() instanceof String[] strings) {
                ids = java.util.Arrays.asList(strings);
            }
            java.util.Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("id", rs.getString("id"));
            row.put("kind", rs.getString("kind"));
            row.put("message", rs.getString("message"));
            row.put("objectIds", ids);
            row.put("createdAt", rs.getTimestamp("created_at").toInstant().toString());
            return row;
        }, id);
    }

    private static String n(String value) {
        return value == null ? "" : value;
    }
}
