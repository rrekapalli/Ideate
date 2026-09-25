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

import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
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
                FROM public.workspace w
                JOIN public.branch b ON b.workspace_id = w.id AND b.branch_role = 'mainstream'
                WHERE w.account_id = ?
                ORDER BY w.created_at DESC
                """, (rs, i) -> new WorkspaceRecord(
                rs.getString("id"),
                rs.getString("account_id"),
                rs.getString("name"),
                rs.getString("persona"),
                rs.getString("mainstream_branch_id"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getString("pinned_object_id")
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
        return new WorkspaceRecord(id, accountId, name.trim(), normalized, branchId, now, null);
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
    public WorkspaceRecord pinProblem(String accountId, String workspaceId, String objectId) {
        get(accountId, workspaceId);
        if (objectId == null || objectId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A Question is required to pin");
        }
        List<Map<String, Object>> found = jdbc.queryForList("""
                SELECT id, type FROM idea_object
                WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL
                """, workspaceId, objectId.trim());
        if (found.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Object not found");
        }
        if (!"question".equals(found.getFirst().get("type"))) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Only a Question can be pinned as the problem");
        }
        jdbc.update("UPDATE workspace SET pinned_object_id = ? WHERE id = ? AND account_id = ?",
                objectId.trim(), workspaceId, accountId);
        return get(accountId, workspaceId);
    }

    @Transactional
    public WorkspaceRecord clearPin(String accountId, String workspaceId) {
        get(accountId, workspaceId);
        jdbc.update("UPDATE workspace SET pinned_object_id = NULL WHERE id = ? AND account_id = ?",
                workspaceId, accountId);
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
        copyWorkspaceContents(source, created);
        return get(accountId, created.id());
    }

    private void copyWorkspaceContents(WorkspaceRecord source, WorkspaceRecord dest) {
        Map<String, String> branches = copyBranches(source, dest);
        Map<String, String> messages = copyTranscript(source.id(), dest.id(), branches);
        Map<String, String> jobs = copyJobs(source.id(), dest.id(), accountOf(dest));
        Map<String, String> objects = copyObjects(source.id(), dest.id(), branches, messages);
        copyObjectChildren(objects, messages);
        copyEdges(source.id(), dest.id(), branches, objects);
        copyDocuments(source.id(), dest.id());
        copyConversation(source.id(), dest.id(), branches, messages);
        copyReports(source.id(), dest.id(), branches, jobs);
        copyProblems(source.id(), dest.id(), objects);
        copyEvents(source.id(), dest.id(), objects, messages);
        copyAiSettings(source.id(), dest.id());
        copyDisplaySeq(source.id(), dest.id());
        copyEmbeddings(objects);
        remapJobObjects(jobs, objects);
        attachments.copyWorkspace(source.id(), dest.id(), objects, messages);
        remapPinnedObject(source, dest, objects);
    }

    private void remapPinnedObject(WorkspaceRecord source, WorkspaceRecord dest, Map<String, String> objects) {
        if (source.pinnedObjectId() == null || source.pinnedObjectId().isBlank()) {
            return;
        }
        String mapped = objects.get(source.pinnedObjectId());
        if (mapped == null) {
            return;
        }
        jdbc.update("UPDATE workspace SET pinned_object_id = ? WHERE id = ?", mapped, dest.id());
    }

    private String accountOf(WorkspaceRecord dest) {
        return dest.accountId();
    }

    private Map<String, String> copyBranches(WorkspaceRecord source, WorkspaceRecord dest) {
        Map<String, String> ids = new HashMap<>();
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT * FROM branch WHERE workspace_id = ? ORDER BY created_at", source.id());
        List<Map<String, Object>> pending = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            if ("mainstream".equals(str(row.get("branch_role")))) {
                ids.put(str(row.get("id")), dest.mainstreamBranchId());
            } else {
                pending.add(row);
            }
        }
        boolean progressed = true;
        while (progressed && !pending.isEmpty()) {
            progressed = false;
            List<Map<String, Object>> next = new ArrayList<>();
            for (Map<String, Object> row : pending) {
                String parent = str(row.get("parent_branch_id"));
                if (parent != null && !ids.containsKey(parent)) {
                    next.add(row);
                    continue;
                }
                String newId = Ids.id("br_");
                jdbc.update("""
                        INSERT INTO branch (id, workspace_id, name, branch_role, parent_branch_id, created_at)
                        VALUES (?, ?, ?, 'overlay', ?, ?)
                        """,
                        newId, dest.id(), row.get("name"), parent == null ? null : ids.get(parent), row.get("created_at"));
                ids.put(str(row.get("id")), newId);
                progressed = true;
            }
            pending = next;
        }
        return ids;
    }

    private Map<String, String> copyTranscript(String sourceWs, String destWs, Map<String, String> branches) {
        Map<String, String> ids = new HashMap<>();
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT * FROM transcript_message WHERE workspace_id = ? ORDER BY created_at
                """, sourceWs);
        for (Map<String, Object> row : rows) {
            String branch = branches.get(str(row.get("branch_id")));
            if (branch == null) {
                continue;
            }
            String newId = Ids.id("msg_");
            ids.put(str(row.get("id")), newId);
            jdbc.update("""
                    INSERT INTO transcript_message (id, workspace_id, branch_id, role, content, mode, created_at)
                    VALUES (?,?,?,?,?,?,?)
                    """,
                    newId, destWs, branch, row.get("role"), row.get("content"), row.get("mode"), row.get("created_at"));
        }
        return ids;
    }

    private Map<String, String> copyJobs(String sourceWs, String destWs, String accountId) {
        Map<String, String> ids = new HashMap<>();
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT * FROM ai_job WHERE workspace_id = ? ORDER BY created_at", sourceWs);
        for (Map<String, Object> row : rows) {
            String newId = Ids.id("job_");
            ids.put(str(row.get("id")), newId);
            execute("""
                    INSERT INTO ai_job (
                        id, workspace_id, account_id, class, status, mode, agent,
                        focus_object_ids, result_object_ids, error, created_at, finished_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
                    """, (ps, con) -> {
                ps.setString(1, newId);
                ps.setString(2, destWs);
                ps.setString(3, accountId);
                ps.setString(4, str(row.get("class")));
                ps.setString(5, str(row.get("status")));
                ps.setString(6, str(row.get("mode")));
                ps.setString(7, str(row.get("agent")));
                ps.setArray(8, textArray(con, new String[0]));
                ps.setArray(9, textArray(con, new String[0]));
                ps.setString(10, str(row.get("error")));
                ps.setTimestamp(11, timestamp(row.get("created_at")));
                ps.setTimestamp(12, timestamp(row.get("finished_at")));
            });
        }
        return ids;
    }

    private void remapJobObjects(Map<String, String> jobs, Map<String, String> objects) {
        if (jobs.isEmpty()) {
            return;
        }
        for (Map.Entry<String, String> entry : jobs.entrySet()) {
            List<Map<String, Object>> found = jdbc.queryForList(
                    "SELECT focus_object_ids, result_object_ids FROM ai_job WHERE id = ?", entry.getKey());
            if (found.isEmpty()) {
                continue;
            }
            Map<String, Object> row = found.getFirst();
            execute("""
                    UPDATE ai_job SET focus_object_ids = ?, result_object_ids = ? WHERE id = ?
                    """, (ps, con) -> {
                ps.setArray(1, textArray(con, remapIds(textValues(row.get("focus_object_ids")), objects)));
                ps.setArray(2, textArray(con, remapIds(textValues(row.get("result_object_ids")), objects)));
                ps.setString(3, entry.getValue());
            });
        }
    }

    private Map<String, String> copyObjects(String sourceWs, String destWs, Map<String, String> branches,
                                             Map<String, String> messages) {
        Map<String, String> ids = new HashMap<>();
        List<Map<String, Object>> objects = jdbc.queryForList("""
                SELECT * FROM idea_object WHERE workspace_id = ? ORDER BY created_at
                """, sourceWs);
        for (Map<String, Object> row : objects) {
            String branch = branches.get(str(row.get("branch_id")));
            if (branch == null) {
                continue;
            }
            String oldId = str(row.get("id"));
            String newId = Ids.id("obj_");
            ids.put(oldId, newId);
            jdbc.update("""
                    INSERT INTO idea_object (
                        id, workspace_id, branch_id, display_id, type, origin, derived_via, object_category,
                        title, summary, body, details, version, generated_by,
                        source_user_message_id, source_assistant_message_id,
                        deleted_at, canvas_x, canvas_y, created_at, updated_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?::jsonb,?,?,?,?,?,?,?,?,?)
                    """,
                    newId, destWs, branch,
                    row.get("display_id"), row.get("type"), row.get("origin"), row.get("derived_via"),
                    row.get("object_category"), row.get("title"), row.get("summary"), row.get("body"),
                    row.get("details") == null ? "{}" : jsonb(row.get("details")),
                    row.get("version"), row.get("generated_by"),
                    remap(messages, str(row.get("source_user_message_id"))),
                    remap(messages, str(row.get("source_assistant_message_id"))),
                    row.get("deleted_at"), row.get("canvas_x"), row.get("canvas_y"),
                    row.get("created_at"), row.get("updated_at"));
            if (row.get("deleted_at") == null) {
                age.upsertVertex(newId, str(row.get("type")), destWs, str(row.get("display_id")), str(row.get("title")));
            }
        }
        return ids;
    }

    private void copyObjectChildren(Map<String, String> objects, Map<String, String> messages) {
        for (Map.Entry<String, String> entry : objects.entrySet()) {
            String oldId = entry.getKey();
            String newId = entry.getValue();
            jdbc.queryForList("SELECT tag FROM idea_tag WHERE object_id = ?", oldId)
                    .forEach(tagRow -> jdbc.update(
                            "INSERT INTO idea_tag (object_id, tag) VALUES (?, ?) ON CONFLICT DO NOTHING",
                            newId, tagRow.get("tag")));
            jdbc.queryForList("SELECT alias FROM idea_object_alias WHERE object_id = ?", oldId)
                    .forEach(aliasRow -> jdbc.update(
                            "INSERT INTO idea_object_alias (object_id, alias) VALUES (?, ?) ON CONFLICT DO NOTHING",
                            newId, aliasRow.get("alias")));
            jdbc.queryForList("SELECT parent_id FROM idea_object_derived_from WHERE object_id = ?", oldId)
                    .forEach(parentRow -> {
                        String parent = objects.get(str(parentRow.get("parent_id")));
                        if (parent != null) {
                            jdbc.update("INSERT INTO idea_object_derived_from (object_id, parent_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                                    newId, parent);
                        }
                    });
            jdbc.queryForList("SELECT * FROM idea_object_version WHERE object_id = ? ORDER BY version", oldId)
                    .forEach(ver -> jdbc.update("""
                            INSERT INTO idea_object_version (
                                id, object_id, version, title, summary, body, type, object_category, details,
                                generated_by, source_user_message_id, source_assistant_message_id, created_at)
                            VALUES (?,?,?,?,?,?,?,?,?::jsonb,?,?,?,?)
                            """,
                            Ids.id("ver_"), newId, ver.get("version"), ver.get("title"), ver.get("summary"),
                            ver.get("body"), ver.get("type"), ver.get("object_category"),
                            ver.get("details") == null ? "{}" : jsonb(ver.get("details")),
                            ver.get("generated_by"),
                            remap(messages, str(ver.get("source_user_message_id"))),
                            remap(messages, str(ver.get("source_assistant_message_id"))),
                            ver.get("created_at")));
        }
    }

    private void copyEdges(String sourceWs, String destWs, Map<String, String> branches, Map<String, String> objects) {
        List<Map<String, Object>> edges = jdbc.queryForList(
                "SELECT * FROM idea_edge WHERE workspace_id = ?", sourceWs);
        for (Map<String, Object> edge : edges) {
            String branch = branches.get(str(edge.get("branch_id")));
            String from = objects.get(str(edge.get("from_object_id")));
            String to = objects.get(str(edge.get("to_object_id")));
            if (branch == null || from == null || to == null) {
                continue;
            }
            String sourceWorkspace = str(edge.get("source_workspace_id"));
            String sourceObject = str(edge.get("source_object_id"));
            if (sourceWs.equals(sourceWorkspace)) {
                sourceWorkspace = destWs;
                sourceObject = objects.get(sourceObject);
            }
            String edgeId = Ids.id("edge_");
            jdbc.update("""
                    INSERT INTO idea_edge (
                        id, workspace_id, branch_id, display_id, type, from_object_id, to_object_id, why,
                        deleted_at, created_at, source_workspace_id, source_object_id)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
                    """,
                    edgeId, destWs, branch, edge.get("display_id"), edge.get("type"), from, to, edge.get("why"),
                    edge.get("deleted_at"), edge.get("created_at"), sourceWorkspace, sourceObject);
            if (edge.get("deleted_at") == null) {
                age.upsertEdge(edgeId, str(edge.get("type")), from, to, destWs);
            }
        }
    }

    private void copyDocuments(String sourceWs, String destWs) {
        Map<String, String> folders = new HashMap<>();
        List<Map<String, Object>> pending = new ArrayList<>(jdbc.queryForList(
                "SELECT * FROM document_folder WHERE workspace_id = ? ORDER BY created_at", sourceWs));
        boolean progressed = true;
        while (progressed && !pending.isEmpty()) {
            progressed = false;
            List<Map<String, Object>> next = new ArrayList<>();
            for (Map<String, Object> row : pending) {
                String parent = str(row.get("parent_id"));
                if (parent != null && !folders.containsKey(parent)) {
                    next.add(row);
                    continue;
                }
                String newId = Ids.id("fld_");
                jdbc.update("""
                        INSERT INTO document_folder (id, workspace_id, parent_id, name, created_at)
                        VALUES (?,?,?,?,?)
                        """,
                        newId, destWs, parent == null ? null : folders.get(parent), row.get("name"), row.get("created_at"));
                folders.put(str(row.get("id")), newId);
                progressed = true;
            }
            pending = next;
        }
        jdbc.queryForList("SELECT * FROM document_item WHERE workspace_id = ? ORDER BY created_at", sourceWs)
                .forEach(row -> {
                    String folder = str(row.get("folder_id"));
                    jdbc.update("""
                            INSERT INTO document_item (id, workspace_id, folder_id, name, url, note, created_at)
                            VALUES (?,?,?,?,?,?,?)
                            """,
                            Ids.id("doc_"), destWs, folder == null ? null : folders.get(folder),
                            row.get("name"), row.get("url"), row.get("note"), row.get("created_at"));
                });
    }

    private void copyConversation(String sourceWs, String destWs, Map<String, String> branches, Map<String, String> messages) {
        Map<String, String> ids = new HashMap<>();
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT * FROM conversation_cache WHERE workspace_id = ? ORDER BY created_at", sourceWs);
        for (Map<String, Object> row : rows) {
            String branch = branches.get(str(row.get("branch_id")));
            if (branch == null) {
                continue;
            }
            String newId = Ids.id("cache_");
            ids.put(str(row.get("id")), newId);
            String covered = str(row.get("covers_through_turn_id"));
            jdbc.update("""
                    INSERT INTO conversation_cache (
                        id, workspace_id, branch_id, summary_text, covers_through_turn_id,
                        generated_by, status, superseded_by, created_at)
                    VALUES (?,?,?,?,?,?,?,?,?)
                    """,
                    newId, destWs, branch, row.get("summary_text"),
                    covered == null ? null : messages.getOrDefault(covered, covered),
                    row.get("generated_by"), row.get("status"), null, row.get("created_at"));
        }
        for (Map<String, Object> row : rows) {
            String newId = ids.get(str(row.get("id")));
            String prior = ids.get(str(row.get("superseded_by")));
            if (newId != null && prior != null) {
                jdbc.update("UPDATE conversation_cache SET superseded_by = ? WHERE id = ?", prior, newId);
            }
        }
    }

    private void copyReports(String sourceWs, String destWs, Map<String, String> branches, Map<String, String> jobs) {
        List<Map<String, Object>> reports = jdbc.queryForList(
                "SELECT * FROM workspace_report WHERE workspace_id = ?", sourceWs);
        for (Map<String, Object> report : reports) {
            String branch = branches.get(str(report.get("branch_id")));
            if (branch == null) {
                continue;
            }
            String newId = Ids.id("rpt_");
            String job = str(report.get("last_job_id"));
            jdbc.update("""
                    INSERT INTO workspace_report (
                        id, workspace_id, branch_id, status, current_version, title, error, last_job_id, created_at, updated_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?)
                    """,
                    newId, destWs, branch, report.get("status"), report.get("current_version"), report.get("title"),
                    report.get("error"), job == null ? null : jobs.get(job),
                    report.get("created_at"), report.get("updated_at"));
            jdbc.queryForList("SELECT * FROM workspace_report_version WHERE report_id = ? ORDER BY version", str(report.get("id")))
                    .forEach(ver -> {
                        String verJob = str(ver.get("job_id"));
                        jdbc.update("""
                                INSERT INTO workspace_report_version (
                                    id, report_id, version, title, summary, body, generated_by, job_id, created_at)
                                VALUES (?,?,?,?,?,?,?,?,?)
                                """,
                                Ids.id("rpv_"), newId, ver.get("version"), ver.get("title"), ver.get("summary"),
                                ver.get("body"), ver.get("generated_by"),
                                verJob == null ? null : jobs.get(verJob), ver.get("created_at"));
                    });
        }
    }

    private void copyProblems(String sourceWs, String destWs, Map<String, String> objects) {
        jdbc.queryForList("SELECT * FROM graph_problem WHERE workspace_id = ?", sourceWs)
                .forEach(row -> execute("""
                        INSERT INTO graph_problem (id, workspace_id, kind, message, object_ids, created_at, dismissed_at)
                        VALUES (?,?,?,?,?,?,?)
                        """, (ps, con) -> {
                    ps.setString(1, Ids.id("prb_"));
                    ps.setString(2, destWs);
                    ps.setString(3, str(row.get("kind")));
                    ps.setString(4, str(row.get("message")));
                    ps.setArray(5, textArray(con, remapIds(textValues(row.get("object_ids")), objects)));
                    ps.setTimestamp(6, timestamp(row.get("created_at")));
                    ps.setTimestamp(7, timestamp(row.get("dismissed_at")));
                }));
    }

    private void copyEvents(String sourceWs, String destWs, Map<String, String> objects, Map<String, String> messages) {
        Map<String, String> replacements = new HashMap<>(objects);
        replacements.putAll(messages);
        jdbc.queryForList("SELECT * FROM object_event WHERE workspace_id = ? ORDER BY created_at", sourceWs)
                .forEach(row -> {
                    String objectId = str(row.get("object_id"));
                    String payload = rewriteIds(jsonb(row.get("payload")), replacements);
                    jdbc.update("""
                            INSERT INTO object_event (id, workspace_id, object_id, event_type, payload, created_at)
                            VALUES (?,?,?,?,?::jsonb,?)
                            """,
                            Ids.id("evt_"), destWs, objectId == null ? null : objects.get(objectId),
                            row.get("event_type"), payload, row.get("created_at"));
                });
    }

    private void copyAiSettings(String sourceWs, String destWs) {
        jdbc.update("""
                INSERT INTO workspace_ai_settings (workspace_id, provider_override, model_override, ollama_base_url)
                SELECT ?, provider_override, model_override, ollama_base_url
                FROM workspace_ai_settings WHERE workspace_id = ?
                """, destWs, sourceWs);
    }

    private void copyDisplaySeq(String sourceWs, String destWs) {
        jdbc.update("""
                INSERT INTO display_id_seq (workspace_id, prefix, next_value)
                SELECT ?, prefix, next_value FROM display_id_seq WHERE workspace_id = ?
                """, destWs, sourceWs);
    }

    private void copyEmbeddings(Map<String, String> objects) {
        for (Map.Entry<String, String> entry : objects.entrySet()) {
            jdbc.update("""
                    INSERT INTO object_embedding (object_id, embedding)
                    SELECT ?, embedding FROM object_embedding WHERE object_id = ?
                    """, entry.getValue(), entry.getKey());
        }
    }

    @FunctionalInterface
    private interface SqlBinder {
        void bind(PreparedStatement ps, Connection con) throws SQLException;
    }

    private void execute(String sql, SqlBinder binder) {
        jdbc.execute((Connection con) -> {
            try (PreparedStatement ps = con.prepareStatement(sql)) {
                binder.bind(ps, con);
                ps.executeUpdate();
            }
            return null;
        });
    }

    private static Array textArray(Connection con, String[] values) throws SQLException {
        return con.createArrayOf("text", values == null ? new String[0] : values);
    }

    private static String[] textValues(Object value) {
        if (value == null) {
            return new String[0];
        }
        if (value instanceof String[] strings) {
            return strings;
        }
        if (value instanceof Object[] objects) {
            String[] out = new String[objects.length];
            for (int i = 0; i < objects.length; i++) {
                out[i] = objects[i] == null ? null : objects[i].toString();
            }
            return out;
        }
        if (value instanceof Array array) {
            try {
                return textValues(array.getArray());
            } catch (SQLException ex) {
                return new String[0];
            }
        }
        return new String[0];
    }

    private static String[] remapIds(String[] values, Map<String, String> ids) {
        List<String> out = new ArrayList<>();
        if (values == null) {
            return new String[0];
        }
        for (String value : values) {
            if (value == null) {
                continue;
            }
            String mapped = ids.get(value);
            if (mapped != null) {
                out.add(mapped);
            }
        }
        return out.toArray(String[]::new);
    }

    private static String remap(Map<String, String> ids, String value) {
        if (value == null) {
            return null;
        }
        return ids.get(value);
    }

    private static Timestamp timestamp(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Timestamp ts) {
            return ts;
        }
        if (value instanceof Instant instant) {
            return Timestamp.from(instant);
        }
        return Timestamp.valueOf(value.toString().replace('T', ' ').replace("Z", ""));
    }

    private static String rewriteIds(String payload, Map<String, String> ids) {
        String next = payload == null || payload.isBlank() ? "{}" : payload;
        for (Map.Entry<String, String> entry : ids.entrySet()) {
            if (entry.getKey() != null && entry.getValue() != null) {
                next = next.replace(entry.getKey(), entry.getValue());
            }
        }
        return next;
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
        List<String> edgeIds = jdbc.queryForList(
                "SELECT id FROM idea_edge WHERE workspace_id = ?", String.class, workspaceId);
        List<String> objectIds = jdbc.queryForList(
                "SELECT id FROM idea_object WHERE workspace_id = ?", String.class, workspaceId);
        for (String edgeId : edgeIds) {
            age.deleteEdge(edgeId);
        }
        for (String objectId : objectIds) {
            age.deleteVertex(objectId);
        }
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
                    (SELECT COALESCE(SUM(input_tokens),0) FROM ai_usage_event u WHERE u.workspace_id = w.id) AS input_tokens,
                    (SELECT COALESCE(SUM(output_tokens),0) FROM ai_usage_event u WHERE u.workspace_id = w.id) AS output_tokens,
                    (SELECT MAX(created_at) FROM object_event e WHERE e.workspace_id = w.id) AS last_activity
                FROM public.workspace w
                JOIN public.branch b ON b.workspace_id = w.id AND b.branch_role = 'mainstream'
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
                    rs.getInt("input_tokens"),
                    rs.getInt("output_tokens"),
                    last == null ? null : last.toInstant()
            );
        }, accountId);
    }

    public record WorkspaceRecord(String id, String accountId, String name, String persona,
                                  String mainstreamBranchId, Instant createdAt, String pinnedObjectId) {}

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
            int inputTokens,
            int outputTokens,
            Instant lastActivity
    ) {}
}
