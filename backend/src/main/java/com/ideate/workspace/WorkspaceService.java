package com.ideate.workspace;

import com.ideate.Ids;
import com.ideate.attachments.AttachmentService;
import com.ideate.graph.ObjectCatalog;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
public class WorkspaceService {
    private final JdbcTemplate jdbc;
    private final AttachmentService attachments;

    public WorkspaceService(JdbcTemplate jdbc, AttachmentService attachments) {
        this.jdbc = jdbc;
        this.attachments = attachments;
    }

    public List<WorkspaceRecord> list(String accountId) {
        return jdbc.query("""
                SELECT w.*, b.id AS mainstream_branch_id
                FROM workspace w
                JOIN branch b ON b.workspace_id = w.id AND b.branch_role = 'mainstream'
                WHERE w.account_id = ?
                ORDER BY w.created_at DESC
                """, (rs, i) -> new WorkspaceRecord(
                rs.getString("id"),
                rs.getString("account_id"),
                rs.getString("name"),
                rs.getString("persona"),
                rs.getString("mainstream_branch_id"),
                rs.getTimestamp("created_at").toInstant()
        ), accountId);
    }

    public WorkspaceRecord get(String accountId, String workspaceId) {
        return list(accountId).stream()
                .filter(w -> w.id().equals(workspaceId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
    }

    @Transactional
    public WorkspaceRecord create(String accountId, String name, String persona) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workspace name is required");
        }
        if (persona == null || persona.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Persona is required");
        }
        String normalized = persona.trim().toLowerCase(Locale.ROOT);
        ObjectCatalog.requirePersona(normalized);
        String id = Ids.id("ws_");
        String branchId = Ids.id("br_");
        Instant now = Instant.now();
        jdbc.update("INSERT INTO workspace (id, account_id, name, persona, created_at) VALUES (?,?,?,?,?)",
                id, accountId, name.trim(), normalized, Timestamp.from(now));
        jdbc.update("""
                INSERT INTO branch (id, workspace_id, name, branch_role, created_at)
                VALUES (?, ?, 'Mainstream', 'mainstream', ?)
                """, branchId, id, Timestamp.from(now));
        return new WorkspaceRecord(id, accountId, name.trim(), normalized, branchId, now);
    }

    public List<BranchRecord> branches(String workspaceId) {
        return jdbc.query("""
                SELECT * FROM branch WHERE workspace_id = ? ORDER BY created_at
                """, (rs, i) -> new BranchRecord(
                rs.getString("id"),
                rs.getString("workspace_id"),
                rs.getString("name"),
                rs.getString("branch_role"),
                rs.getString("parent_branch_id")
        ), workspaceId);
    }

    public BranchRecord createOverlay(String workspaceId, String name, String parentBranchId) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Overlay branch name is required");
        }
        List<BranchRecord> existing = branches(workspaceId);
        String parent = parentBranchId;
        if (parent == null || parent.isBlank()) {
            parent = existing.stream()
                    .filter((b) -> "mainstream".equals(b.branchRole()))
                    .map(BranchRecord::id)
                    .findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mainstream branch not found"));
        } else {
            String pid = parent;
            boolean ok = existing.stream().anyMatch((b) -> b.id().equals(pid));
            if (!ok) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Parent branch not found");
            }
        }
        String id = Ids.id("br_");
        jdbc.update("""
                INSERT INTO branch (id, workspace_id, name, branch_role, parent_branch_id)
                VALUES (?, ?, ?, 'overlay', ?)
                """, id, workspaceId, name.trim(), parent);
        return new BranchRecord(id, workspaceId, name.trim(), "overlay", parent);
    }

    @Transactional
    public void deleteBranch(String workspaceId, String branchId) {
        BranchRecord branch = branches(workspaceId).stream()
                .filter((b) -> b.id().equals(branchId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Branch not found"));
        if ("mainstream".equals(branch.branchRole())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mainstream cannot be deleted");
        }
        branches(workspaceId).stream()
                .filter((b) -> branchId.equals(b.parentBranchId()))
                .forEach((child) -> deleteBranch(workspaceId, child.id()));
        jdbc.update("DELETE FROM conversation_cache WHERE workspace_id = ? AND branch_id = ?", workspaceId, branchId);
        jdbc.update("DELETE FROM transcript_message WHERE workspace_id = ? AND branch_id = ?", workspaceId, branchId);
        jdbc.update("DELETE FROM idea_edge WHERE workspace_id = ? AND branch_id = ?", workspaceId, branchId);
        jdbc.update("DELETE FROM idea_object WHERE workspace_id = ? AND branch_id = ?", workspaceId, branchId);
        jdbc.update("DELETE FROM branch WHERE workspace_id = ? AND id = ?", workspaceId, branchId);
    }

    @Transactional
    public void deleteWorkspace(String accountId, String workspaceId) {
        get(accountId, workspaceId);
        attachments.deleteWorkspaceFiles(workspaceId);
        jdbc.update("DELETE FROM workspace WHERE id = ? AND account_id = ?", workspaceId, accountId);
    }

    public List<WorkspaceSummary> dashboard(String accountId) {
        return jdbc.query("""
                SELECT w.id, w.account_id, w.name, w.persona, w.created_at, b.id AS mainstream_branch_id,
                    (SELECT COUNT(*) FROM idea_object o WHERE o.workspace_id = w.id AND o.deleted_at IS NULL) AS object_count,
                    (SELECT COUNT(*) FROM branch br WHERE br.workspace_id = w.id) AS branch_count,
                    (SELECT COUNT(*) FROM document_item d WHERE d.workspace_id = w.id) AS document_count,
                    (SELECT COUNT(*) FROM graph_problem p WHERE p.workspace_id = w.id AND p.dismissed_at IS NULL) AS problem_count,
                    (SELECT COALESCE(SUM(estimated_cost_minor),0) FROM ai_usage_event u WHERE u.workspace_id = w.id) AS usage_minor,
                    (SELECT MAX(created_at) FROM object_event e WHERE e.workspace_id = w.id) AS last_activity
                FROM workspace w
                JOIN branch b ON b.workspace_id = w.id AND b.branch_role = 'mainstream'
                WHERE w.account_id = ?
                ORDER BY COALESCE(
                    (SELECT MAX(created_at) FROM object_event e WHERE e.workspace_id = w.id),
                    w.created_at
                ) DESC
                """, (rs, i) -> {
            Timestamp last = rs.getTimestamp("last_activity");
            return new WorkspaceSummary(
                    rs.getString("id"),
                    rs.getString("account_id"),
                    rs.getString("name"),
                    rs.getString("persona"),
                    rs.getString("mainstream_branch_id"),
                    rs.getTimestamp("created_at").toInstant(),
                    rs.getInt("object_count"),
                    rs.getInt("branch_count"),
                    rs.getInt("document_count"),
                    rs.getInt("problem_count"),
                    rs.getInt("usage_minor"),
                    last == null ? null : last.toInstant()
            );
        }, accountId);
    }

    public record WorkspaceRecord(String id, String accountId, String name, String persona,
                                  String mainstreamBranchId, Instant createdAt) {}

    public record BranchRecord(String id, String workspaceId, String name, String branchRole, String parentBranchId) {}

    public record WorkspaceSummary(
            String id,
            String accountId,
            String name,
            String persona,
            String mainstreamBranchId,
            Instant createdAt,
            int objectCount,
            int branchCount,
            int documentCount,
            int problemCount,
            int usageMinor,
            Instant lastActivity
    ) {}
}
