package com.ideate.workspace;

import com.ideate.Ids;
import com.ideate.attachments.AttachmentService;
import com.ideate.db.AgeClient;
import com.ideate.graph.ObjectCatalog;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class WorkspaceService {
    private final JdbcTemplate jdbc;
    private final AttachmentService attachments;
    private final AgeClient age;

    public WorkspaceService(JdbcTemplate jdbc, AttachmentService attachments, AgeClient age) {
        this.jdbc = jdbc;
        this.attachments = attachments;
        this.age = age;
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

    @Transactional
    public WorkspaceRecord updatePersona(String accountId, String workspaceId, String persona) {
        get(accountId, workspaceId);
        if (persona == null || persona.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Persona is required");
        }
        String normalized = persona.trim().toLowerCase(Locale.ROOT);
        ObjectCatalog.requirePersona(normalized);
        jdbc.update("UPDATE workspace SET persona = ? WHERE id = ? AND account_id = ?",
                normalized, workspaceId, accountId);
        return get(accountId, workspaceId);
    }

    @Transactional
    public WorkspaceRecord cloneWorkspace(String accountId, String sourceWorkspaceId, String name, String persona) {
        WorkspaceRecord source = get(accountId, sourceWorkspaceId);
        if (persona == null || persona.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Persona is required");
        }
        String normalized = persona.trim().toLowerCase(Locale.ROOT);
        ObjectCatalog.requirePersona(normalized);
        String cloneName = (name == null || name.isBlank())
                ? source.name() + " — " + Character.toUpperCase(normalized.charAt(0)) + normalized.substring(1)
                : name.trim();
        WorkspaceRecord created = create(accountId, cloneName, normalized);
        copyMainstreamGraph(source.id(), source.mainstreamBranchId(), created.id(), created.mainstreamBranchId());
        return created;
    }

    private void copyMainstreamGraph(String sourceWs, String sourceBranch, String destWs, String destBranch) {
        List<Map<String, Object>> objects = jdbc.queryForList("""
                SELECT * FROM idea_object
                WHERE workspace_id = ? AND branch_id = ? AND deleted_at IS NULL
                ORDER BY created_at
                """, sourceWs, sourceBranch);
        Map<String, String> ids = new HashMap<>();
        for (Map<String, Object> row : objects) {
            String oldId = str(row.get("id"));
            String newId = Ids.id("obj_");
            ids.put(oldId, newId);
            jdbc.update("""
                    INSERT INTO idea_object (
                        id, workspace_id, branch_id, display_id, type, origin, derived_via, object_category,
                        title, summary, body, details, version, generated_by, canvas_x, canvas_y, created_at, updated_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?::jsonb,?,?,?,?,?,?)
                    """,
                    newId, destWs, destBranch,
                    row.get("display_id"), row.get("type"), row.get("origin"), row.get("derived_via"),
                    row.get("object_category"), row.get("title"), row.get("summary"), row.get("body"),
                    row.get("details") == null ? "{}" : jsonb(row.get("details")),
                    row.get("version"), row.get("generated_by"),
                    row.get("canvas_x"), row.get("canvas_y"),
                    row.get("created_at"), row.get("updated_at"));
            age.upsertVertex(newId, str(row.get("type")), destWs, str(row.get("display_id")), str(row.get("title")));
        }
        for (Map<String, Object> row : objects) {
            String newId = ids.get(str(row.get("id")));
            jdbc.queryForList("SELECT tag FROM idea_tag WHERE object_id = ?", str(row.get("id")))
                    .forEach(tagRow -> jdbc.update(
                            "INSERT INTO idea_tag (object_id, tag) VALUES (?, ?) ON CONFLICT DO NOTHING",
                            newId, tagRow.get("tag")));
            jdbc.queryForList("SELECT alias FROM idea_object_alias WHERE object_id = ?", str(row.get("id")))
                    .forEach(aliasRow -> jdbc.update(
                            "INSERT INTO idea_object_alias (object_id, alias) VALUES (?, ?) ON CONFLICT DO NOTHING",
                            newId, aliasRow.get("alias")));
            jdbc.queryForList("SELECT parent_id FROM idea_object_derived_from WHERE object_id = ?", str(row.get("id")))
                    .forEach(parentRow -> {
                        String parent = ids.get(str(parentRow.get("parent_id")));
                        if (parent != null) {
                            jdbc.update("INSERT INTO idea_object_derived_from (object_id, parent_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                                    newId, parent);
                        }
                    });
            jdbc.queryForList("SELECT * FROM idea_object_version WHERE object_id = ? ORDER BY version", str(row.get("id")))
                    .forEach(ver -> jdbc.update("""
                            INSERT INTO idea_object_version (
                                id, object_id, version, title, summary, body, type, object_category, details,
                                generated_by, created_at)
                            VALUES (?,?,?,?,?,?,?,?,?::jsonb,?,?)
                            """,
                            Ids.id("ver_"), newId, ver.get("version"), ver.get("title"), ver.get("summary"),
                            ver.get("body"), ver.get("type"), ver.get("object_category"),
                            ver.get("details") == null ? "{}" : jsonb(ver.get("details")),
                            ver.get("generated_by"), ver.get("created_at")));
        }
        List<Map<String, Object>> edges = jdbc.queryForList("""
                SELECT * FROM idea_edge
                WHERE workspace_id = ? AND branch_id = ? AND deleted_at IS NULL
                """, sourceWs, sourceBranch);
        for (Map<String, Object> edge : edges) {
            String from = ids.get(str(edge.get("from_object_id")));
            String to = ids.get(str(edge.get("to_object_id")));
            if (from == null || to == null) {
                continue;
            }
            String edgeId = Ids.id("edge_");
            jdbc.update("""
                    INSERT INTO idea_edge (id, workspace_id, branch_id, display_id, type, from_object_id, to_object_id, why,
                        source_workspace_id, source_object_id)
                    VALUES (?,?,?,?,?,?,?,?,?,?)
                    """,
                    edgeId, destWs, destBranch, edge.get("display_id"), edge.get("type"), from, to, edge.get("why"),
                    edge.get("source_workspace_id"), edge.get("source_object_id"));
            age.upsertEdge(edgeId, str(edge.get("type")), from, to, destWs);
        }
    }

    private static String jsonb(Object value) {
        if (value == null) {
            return "{}";
        }
        if (value instanceof org.postgresql.util.PGobject pg) {
            String raw = pg.getValue();
            return raw == null || raw.isBlank() ? "{}" : raw;
        }
        return value.toString();
    }

    private static String str(Object value) {
        return value == null ? null : value.toString();
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
        jdbc.update("DELETE FROM workspace_report WHERE workspace_id = ? AND branch_id = ?", workspaceId, branchId);
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
