package com.ideate.graph;

import com.ideate.Ids;
import com.ideate.attachments.AttachmentService;
import com.ideate.db.AgeClient;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class GraphService {
    private final JdbcTemplate jdbc;
    private final AgeClient age;
    private final AttachmentService attachments;

    public GraphService(JdbcTemplate jdbc, AgeClient age, AttachmentService attachments) {
        this.jdbc = jdbc;
        this.age = age;
        this.attachments = attachments;
    }

    public GraphSnapshot graph(String workspaceId, String branchId) {
        String branch = resolveBranch(workspaceId, branchId);
        List<IdeaObject> nodes = jdbc.query(
                """
                SELECT * FROM idea_object
                WHERE workspace_id = ? AND branch_id = ? AND deleted_at IS NULL
                ORDER BY created_at
                """,
                objectMapper(), workspaceId, branch);
        nodes = nodes.stream().map(this::withTagsAndParents).toList();
        List<IdeaEdge> edges = jdbc.query(
                """
                SELECT * FROM idea_edge
                WHERE workspace_id = ? AND branch_id = ? AND deleted_at IS NULL
                ORDER BY created_at
                """,
                edgeMapper(), workspaceId, branch);
        return new GraphSnapshot(nodes, edges);
    }

    public IdeaObject getObject(String workspaceId, String objectId) {
        List<IdeaObject> found = jdbc.query(
                "SELECT * FROM idea_object WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL",
                objectMapper(), workspaceId, objectId);
        if (found.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Object not found");
        }
        return withTagsAndParents(found.getFirst());
    }

    public IdeaObject createObject(String workspaceId, String accountId, CreateObjectRequest req) {
        ObjectCatalog.requireNodeType(req.type());
        ObjectCatalog.requireTags(req.type(), req.tags());
        if ("theory".equals(req.type())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Theory can only be proposed after Evaluation");
        }
        String branch = resolveBranch(workspaceId, req.branchId());
        String origin = req.origin() == null ? "original" : req.origin();
        String category = req.objectCategory() == null ? defaultCategory(req.type()) : req.objectCategory();
        if (!ObjectCatalog.CATEGORIES.contains(category)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid object_category");
        }
        String id = Ids.id("obj_");
        String displayId = nextDisplayId(workspaceId, req.type());
        Instant now = Instant.now();
        Map<String, Object> details = req.details() == null ? Map.of() : req.details();
        if ("architecture".equals(req.type()) && !details.containsKey("components")) {
            details = new LinkedHashMap<>(details);
            details.put("components", List.of());
        }
        String detailsJson = ObjectDetails.stringify(details);
        jdbc.update("""
                INSERT INTO idea_object (
                    id, workspace_id, branch_id, display_id, type, origin, derived_via, object_category,
                    title, summary, body, details, version, generated_by, source_user_message_id, source_assistant_message_id,
                    canvas_x, canvas_y, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?::jsonb,1,?,?,?,?,?,?,?)
                """,
                id, workspaceId, branch, displayId, req.type(), origin, req.derivedVia(), category,
                req.title(), nullToEmpty(req.summary()), nullToEmpty(req.body()), detailsJson,
                req.generatedBy(), req.sourceUserMessageId(), req.sourceAssistantMessageId(),
                req.canvasX(), req.canvasY(), Timestamp.from(now), Timestamp.from(now));
        snapshotVersion(id, 1, req.title(), nullToEmpty(req.summary()), nullToEmpty(req.body()),
                req.type(), category, detailsJson, req.generatedBy(), req.sourceUserMessageId(), req.sourceAssistantMessageId());
        replaceTags(id, req.tags());
        replaceParents(id, req.derivedFrom());
        if (req.derivedFrom() != null) {
            for (String parentId : req.derivedFrom()) {
                createEdgeInternal(workspaceId, branch, "derived-from", id, parentId, "derived",
                        req.sourceUserMessageId(), req.sourceAssistantMessageId());
            }
        }
        recordEvent(workspaceId, id, "object.created", Map.of("displayId", displayId, "type", req.type()));
        IdeaObject created = getObject(workspaceId, id);
        age.upsertVertex(created.id(), created.type(), workspaceId, created.displayId(), created.title());
        return created;
    }

    public IdeaObject updateObject(String workspaceId, String objectId, UpdateObjectRequest req) {
        IdeaObject current = getObject(workspaceId, objectId);
        String type = req.type() != null ? req.type() : current.type();
        ObjectCatalog.requireNodeType(type);
        ObjectCatalog.requireTags(type, req.tags() != null ? req.tags() : current.tags());
        if (!ObjectCatalog.isLegalPromotion(current.type(), type)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Illegal type change " + current.type() + " -> " + type);
        }
        if ("theory".equals(type) && !"theory".equals(current.type()) && !"evaluation".equals(current.type())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Theory requires Evaluation first");
        }
        String category = req.objectCategory() != null ? req.objectCategory() : current.objectCategory();
        String title = req.title() != null ? req.title() : current.title();
        String summary = req.summary() != null ? req.summary() : current.summary();
        String body = req.body() != null ? req.body() : current.body();
        Map<String, Object> details = req.details() != null
                ? ObjectDetails.merge(current.details(), req.details())
                : (current.details() == null ? new LinkedHashMap<>() : new LinkedHashMap<>(current.details()));
        if ("architecture".equals(type)) {
            details.put("components", currentBom(objectId));
        }
        boolean detailsChanged = req.details() != null && !details.equals(current.details() == null ? Map.of() : current.details());
        boolean newVersion = Boolean.TRUE.equals(req.newVersion())
                || (req.title() != null && !req.title().equals(current.title()))
                || (req.body() != null && !req.body().equals(current.body()))
                || !type.equals(current.type())
                || detailsChanged;
        int version = newVersion ? current.version() + 1 : current.version();
        String displayId = current.displayId();
        if (!type.equals(current.type())) {
            displayId = nextDisplayId(workspaceId, type);
            jdbc.update("INSERT INTO idea_object_alias (object_id, alias) VALUES (?, ?) ON CONFLICT DO NOTHING",
                    objectId, current.displayId());
        }
        if (req.title() != null && !req.title().equals(current.title())) {
            jdbc.update("INSERT INTO idea_object_alias (object_id, alias) VALUES (?, ?) ON CONFLICT DO NOTHING",
                    objectId, current.title());
        }
        String detailsJson = ObjectDetails.stringify(details);
        jdbc.update("""
                UPDATE idea_object SET
                    type = ?, object_category = ?, title = ?, summary = ?, body = ?, details = ?::jsonb, version = ?,
                    display_id = ?, generated_by = COALESCE(?, generated_by),
                    source_user_message_id = COALESCE(?, source_user_message_id),
                    source_assistant_message_id = COALESCE(?, source_assistant_message_id),
                    canvas_x = COALESCE(?, canvas_x), canvas_y = COALESCE(?, canvas_y),
                    updated_at = now()
                WHERE id = ?
                """,
                type, category, title, summary, body, detailsJson, version, displayId,
                req.generatedBy(), req.sourceUserMessageId(), req.sourceAssistantMessageId(),
                req.canvasX(), req.canvasY(), objectId);
        if (newVersion) {
            snapshotVersion(objectId, version, title, summary, body, type, category, detailsJson,
                    req.generatedBy(), req.sourceUserMessageId(), req.sourceAssistantMessageId());
            createEdgeInternal(workspaceId, current.branchId(), "version-of", objectId, objectId,
                    "v" + current.version() + " -> v" + version, req.sourceUserMessageId(), req.sourceAssistantMessageId());
            markCalculationsStale(workspaceId, objectId);
            syncCalculatedFrom(workspaceId, current.branchId(), objectId, type, details);
        }
        if (req.tags() != null) {
            replaceTags(objectId, req.tags());
        }
        recordEvent(workspaceId, objectId, "object.updated", Map.of("version", version, "type", type));
        if (!displayId.equals(current.displayId()) || !type.equals(current.type())) {
            attachments.relocateObject(workspaceId, objectId);
        }
        IdeaObject updated = getObject(workspaceId, objectId);
        age.upsertVertex(updated.id(), updated.type(), workspaceId, updated.displayId(), updated.title());
        return updated;
    }

    public void deleteObject(String workspaceId, String objectId) {
        getObject(workspaceId, objectId);
        attachments.releaseObject(workspaceId, objectId);
        jdbc.update("UPDATE idea_object SET deleted_at = now() WHERE id = ?", objectId);
        jdbc.update("UPDATE idea_edge SET deleted_at = now() WHERE from_object_id = ? OR to_object_id = ?",
                objectId, objectId);
        recordEvent(workspaceId, objectId, "object.deleted", Map.of());
        age.deleteVertex(objectId);
    }

    public int undoDelete(String workspaceId, String objectId) {
        int n = jdbc.update(
                "UPDATE idea_object SET deleted_at = NULL, updated_at = now() WHERE workspace_id = ? AND id = ?",
                workspaceId, objectId);
        jdbc.update("""
                UPDATE idea_edge SET deleted_at = NULL
                WHERE workspace_id = ? AND (from_object_id = ? OR to_object_id = ?)
                """, workspaceId, objectId, objectId);
        recordEvent(workspaceId, objectId, "object.restored", Map.of());
        return n;
    }

    public int batchDeleteByAssistantMessage(String workspaceId, String assistantMessageId) {
        List<String> ids = jdbc.queryForList("""
                SELECT id FROM idea_object
                WHERE workspace_id = ? AND source_assistant_message_id = ? AND deleted_at IS NULL
                """, String.class, workspaceId, assistantMessageId);
        for (String id : ids) {
            deleteObject(workspaceId, id);
        }
        return ids.size();
    }

    public IdeaEdge createEdge(String workspaceId, CreateEdgeRequest req) {
        ObjectCatalog.requireEdgeType(req.type());
        if ("promoted-to".equals(req.type())) {
            IdeaObject from = getObject(workspaceId, req.fromObjectId());
            IdeaObject to = getObject(workspaceId, req.toObjectId());
            if (!"evaluation".equals(from.type()) || !"theory".equals(to.type())) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "promoted-to requires Evaluation -> Theory");
            }
        }
        String branch = resolveBranch(workspaceId, req.branchId());
        return createEdgeInternal(workspaceId, branch, req.type(), req.fromObjectId(), req.toObjectId(),
                req.why(), req.sourceUserMessageId(), req.sourceAssistantMessageId(),
                req.sourceWorkspaceId(), req.sourceObjectId());
    }

    public void deleteEdge(String workspaceId, String edgeId) {
        jdbc.update("UPDATE idea_edge SET deleted_at = now() WHERE workspace_id = ? AND id = ?",
                workspaceId, edgeId);
        age.deleteEdge(edgeId);
    }

    public IdeaObject createLinkedNode(String workspaceId, String sourceObjectId, CreateObjectRequest req) {
        IdeaObject source = getObject(workspaceId, sourceObjectId);
        CreateObjectRequest minted = new CreateObjectRequest(
                req.type(),
                req.title() != null ? req.title() : "Untitled",
                req.summary(),
                req.body(),
                source.branchId(),
                req.origin() == null ? "original" : req.origin(),
                req.derivedVia(),
                req.objectCategory(),
                req.generatedBy(),
                req.sourceUserMessageId(),
                req.sourceAssistantMessageId(),
                nearby(source.canvasX()),
                nearby(source.canvasY()),
                req.tags(),
                req.derivedFrom() == null ? List.of(source.id()) : req.derivedFrom(),
                req.details()
        );
        IdeaObject created = createObject(workspaceId, null, minted);
        createEdgeInternal(workspaceId, source.branchId(), "derived-from", created.id(), source.id(),
                "new node from " + source.displayId(), req.sourceUserMessageId(), req.sourceAssistantMessageId());
        return created;
    }

    public IdeaObject createTheoryFromEvaluation(String workspaceId, String evaluationId, String title,
                                                String summary, String body, String generatedBy,
                                                String userMsgId, String assistantMsgId) {
        IdeaObject evaluation = getObject(workspaceId, evaluationId);
        if (!"evaluation".equals(evaluation.type())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Theory requires an Evaluation");
        }
        String branch = evaluation.branchId();
        String id = Ids.id("obj_");
        String displayId = nextDisplayId(workspaceId, "theory");
        Instant now = Instant.now();
        jdbc.update("""
                INSERT INTO idea_object (
                    id, workspace_id, branch_id, display_id, type, origin, object_category,
                    title, summary, body, version, generated_by, source_user_message_id, source_assistant_message_id,
                    canvas_x, canvas_y, created_at, updated_at)
                VALUES (?,?,?,?,'theory','original','supported',?,?,?,1,?,?,?,?,?,?,?)
                """,
                id, workspaceId, branch, displayId, title, nullToEmpty(summary), nullToEmpty(body),
                generatedBy, userMsgId, assistantMsgId, nearby(evaluation.canvasX()), nearby(evaluation.canvasY()),
                Timestamp.from(now), Timestamp.from(now));
        snapshotVersion(id, 1, title, nullToEmpty(summary), nullToEmpty(body), "theory", "supported",
                null, generatedBy, userMsgId, assistantMsgId);
        createEdgeInternal(workspaceId, branch, "promoted-to", evaluation.id(), id, "AI proposed theory",
                userMsgId, assistantMsgId);
        recordEvent(workspaceId, id, "object.created", Map.of("displayId", displayId, "type", "theory"));
        IdeaObject created = getObject(workspaceId, id);
        age.upsertVertex(created.id(), created.type(), workspaceId, created.displayId(), created.title());
        return created;
    }

    public String createOverlayBranch(String workspaceId, String fromObjectId, String name) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Overlay branch name is required");
        }
        IdeaObject source = getObject(workspaceId, fromObjectId);
        String branchId = Ids.id("br_");
        jdbc.update("""
                INSERT INTO branch (id, workspace_id, name, branch_role, parent_branch_id)
                VALUES (?, ?, ?, 'overlay', ?)
                """, branchId, workspaceId, name, source.branchId());
        jdbc.update("""
                INSERT INTO idea_object (
                    id, workspace_id, branch_id, display_id, type, origin, derived_via, object_category,
                    title, summary, body, details, version, canvas_x, canvas_y)
                SELECT ?, workspace_id, ?, display_id, type, origin, derived_via, object_category,
                    title, summary, body, details, version, canvas_x, canvas_y
                FROM idea_object WHERE id = ?
                """, Ids.id("obj_"), branchId, fromObjectId);
        return branchId;
    }

    public IdeaObject findByDisplayId(String workspaceId, String query) {
        List<IdeaObject> found = jdbc.query("""
                SELECT o.* FROM idea_object o
                LEFT JOIN idea_object_alias a ON a.object_id = o.id
                WHERE o.workspace_id = ? AND o.deleted_at IS NULL
                  AND (lower(o.display_id) = lower(?) OR lower(o.title) = lower(?) OR lower(a.alias) = lower(?))
                LIMIT 1
                """, objectMapper(), workspaceId, query, query, query);
        return found.isEmpty() ? null : withTagsAndParents(found.getFirst());
    }

    private IdeaEdge createEdgeInternal(String workspaceId, String branchId, String type,
                                        String fromId, String toId, String why,
                                        String userMsg, String assistantMsg) {
        return createEdgeInternal(workspaceId, branchId, type, fromId, toId, why, userMsg, assistantMsg, null, null);
    }

    private IdeaEdge createEdgeInternal(String workspaceId, String branchId, String type,
                                        String fromId, String toId, String why,
                                        String userMsg, String assistantMsg,
                                        String sourceWorkspaceId, String sourceObjectId) {
        String id = Ids.id("edge_");
        String displayId = nextDisplayId(workspaceId, "R");
        jdbc.update("""
                INSERT INTO idea_edge (id, workspace_id, branch_id, display_id, type, from_object_id, to_object_id, why,
                    source_workspace_id, source_object_id)
                VALUES (?,?,?,?,?,?,?,?,?,?)
                """, id, workspaceId, branchId, displayId, type, fromId, toId, why, sourceWorkspaceId, sourceObjectId);
        recordEvent(workspaceId, fromId, "edge.created", Map.of("edgeId", id, "type", type, "to", toId));
        age.upsertEdge(id, type, fromId, toId, workspaceId);
        return new IdeaEdge(id, workspaceId, branchId, displayId, type, fromId, toId, why, Instant.now(),
                sourceWorkspaceId, sourceObjectId);
    }

    private String nextDisplayId(String workspaceId, String typeOrPrefix) {
        String prefix = ObjectCatalog.NODE_TYPES.contains(typeOrPrefix)
                ? ObjectCatalog.prefix(typeOrPrefix)
                : typeOrPrefix;
        jdbc.update("""
                INSERT INTO display_id_seq (workspace_id, prefix, next_value)
                VALUES (?, ?, 1)
                ON CONFLICT (workspace_id, prefix) DO UPDATE SET next_value = display_id_seq.next_value + 1
                """, workspaceId, prefix);
        Integer next = jdbc.queryForObject(
                "SELECT next_value FROM display_id_seq WHERE workspace_id = ? AND prefix = ?",
                Integer.class, workspaceId, prefix);
        return prefix + "-" + String.format("%03d", next == null ? 1 : next);
    }

    private String resolveBranch(String workspaceId, String branchId) {
        if (branchId != null && !branchId.isBlank()) {
            return branchId;
        }
        return jdbc.queryForObject(
                "SELECT id FROM branch WHERE workspace_id = ? AND branch_role = 'mainstream'",
                String.class, workspaceId);
    }

    private void snapshotVersion(String objectId, int version, String title, String summary, String body,
                                 String type, String category, String detailsJson, String generatedBy,
                                 String userMsg, String assistantMsg) {
        jdbc.update("""
                INSERT INTO idea_object_version (
                    id, object_id, version, title, summary, body, details, type, object_category,
                    generated_by, source_user_message_id, source_assistant_message_id)
                VALUES (?,?,?,?,?,?,?::jsonb,?,?,?,?,?)
                """, Ids.id("ver_"), objectId, version, title, summary, body, detailsJson, type, category,
                generatedBy, userMsg, assistantMsg);
    }

    private void replaceTags(String objectId, List<String> tags) {
        jdbc.update("DELETE FROM idea_tag WHERE object_id = ?", objectId);
        if (tags == null) {
            return;
        }
        for (String tag : tags) {
            if (tag != null && !tag.isBlank()) {
                jdbc.update("INSERT INTO idea_tag (object_id, tag) VALUES (?, ?) ON CONFLICT DO NOTHING",
                        objectId, tag.trim());
            }
        }
    }

    private void replaceParents(String objectId, List<String> parents) {
        jdbc.update("DELETE FROM idea_object_derived_from WHERE object_id = ?", objectId);
        if (parents == null) {
            return;
        }
        for (String parent : parents) {
            jdbc.update("INSERT INTO idea_object_derived_from (object_id, parent_id) VALUES (?, ?)", objectId, parent);
        }
    }

    private IdeaObject withTagsAndParents(IdeaObject object) {
        List<String> tags = jdbc.queryForList("SELECT tag FROM idea_tag WHERE object_id = ?", String.class, object.id());
        List<String> parents = jdbc.queryForList(
                "SELECT parent_id FROM idea_object_derived_from WHERE object_id = ?", String.class, object.id());
        return new IdeaObject(object.id(), object.workspaceId(), object.branchId(), object.displayId(), object.type(),
                object.origin(), object.derivedVia(), object.objectCategory(), object.title(), object.summary(),
                object.body(), object.version(), object.generatedBy(), object.sourceUserMessageId(),
                object.sourceAssistantMessageId(), object.canvasX(), object.canvasY(), object.createdAt(),
                object.updatedAt(), tags, parents, object.details());
    }

    private void recordEvent(String workspaceId, String objectId, String type, Map<String, Object> payload) {
        jdbc.update("""
                INSERT INTO object_event (id, workspace_id, object_id, event_type, payload)
                VALUES (?,?,?,?,?::jsonb)
                """, Ids.id("evt_"), workspaceId, objectId, type, toJson(payload));
    }

    private static String toJson(Map<String, Object> payload) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> e : payload.entrySet()) {
            if (!first) {
                sb.append(',');
            }
            first = false;
            sb.append('"').append(e.getKey()).append("\":\"").append(String.valueOf(e.getValue()).replace("\"", "\\\"")).append('"');
        }
        return sb.append('}').toString();
    }

    private static String defaultCategory(String type) {
        return switch (type) {
            case "unknown" -> "unknown";
            case "misconception" -> "misconception";
            case "thought", "target", "constraint" -> "speculative";
            default -> "active";
        };
    }

    private static Double nearby(Double value) {
        if (value == null) {
            return 120.0;
        }
        return value + 80;
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private RowMapper<IdeaObject> objectMapper() {
        return (rs, rowNum) -> mapObject(rs);
    }

    private RowMapper<IdeaEdge> edgeMapper() {
        return (rs, rowNum) -> new IdeaEdge(
                rs.getString("id"),
                rs.getString("workspace_id"),
                rs.getString("branch_id"),
                rs.getString("display_id"),
                rs.getString("type"),
                rs.getString("from_object_id"),
                rs.getString("to_object_id"),
                rs.getString("why"),
                ts(rs, "created_at"),
                columnOrNull(rs, "source_workspace_id"),
                columnOrNull(rs, "source_object_id")
        );
    }

    private static IdeaObject mapObject(ResultSet rs) throws SQLException {
        return new IdeaObject(
                rs.getString("id"),
                rs.getString("workspace_id"),
                rs.getString("branch_id"),
                rs.getString("display_id"),
                rs.getString("type"),
                rs.getString("origin"),
                rs.getString("derived_via"),
                rs.getString("object_category"),
                rs.getString("title"),
                rs.getString("summary"),
                rs.getString("body"),
                rs.getInt("version"),
                rs.getString("generated_by"),
                rs.getString("source_user_message_id"),
                rs.getString("source_assistant_message_id"),
                (Double) rs.getObject("canvas_x"),
                (Double) rs.getObject("canvas_y"),
                ts(rs, "created_at"),
                ts(rs, "updated_at"),
                List.of(),
                List.of(),
                ObjectDetails.parse(columnOrNull(rs, "details"))
        );
    }

    private static String columnOrNull(ResultSet rs, String col) {
        try {
            return rs.getString(col);
        } catch (SQLException ignored) {
            return null;
        }
    }

    private static Instant ts(ResultSet rs, String col) throws SQLException {
        Timestamp t = rs.getTimestamp(col);
        return t == null ? null : t.toInstant();
    }

    public List<ObjectVersion> listVersions(String workspaceId, String objectId) {
        getObject(workspaceId, objectId);
        return jdbc.query("""
                SELECT id, object_id, version, title, summary, body, details::text AS details, type, object_category,
                       generated_by, source_user_message_id, source_assistant_message_id, created_at
                FROM idea_object_version
                WHERE object_id = ?
                ORDER BY version
                """, (rs, i) -> new ObjectVersion(
                rs.getString("id"),
                rs.getString("object_id"),
                rs.getInt("version"),
                rs.getString("title"),
                rs.getString("summary"),
                rs.getString("body"),
                rs.getString("type"),
                rs.getString("object_category"),
                ObjectDetails.parse(rs.getString("details")),
                rs.getString("generated_by"),
                rs.getString("source_user_message_id"),
                rs.getString("source_assistant_message_id"),
                ts(rs, "created_at")
        ), objectId);
    }

    public IdeaObject recompute(String workspaceId, String objectId) {
        IdeaObject current = getObject(workspaceId, objectId);
        if (!"calculation".equals(current.type())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Recompute requires a Calculation");
        }
        Map<String, Object> details = current.details() == null ? new LinkedHashMap<>() : new LinkedHashMap<>(current.details());
        Map<String, Double> inputs = calculationInputs(details);
        refreshInputsFromSources(workspaceId, details, inputs);
        String method = ObjectDetails.text(details, "method");
        Double value = CalculationExpr.evaluate(method, inputs);
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Method is not a simple arithmetic expression over named inputs");
        }
        Map<String, Object> output = new LinkedHashMap<>();
        Object existingOut = details.get("output");
        if (existingOut instanceof Map<?, ?> map && map.get("unit") != null) {
            output.put("unit", map.get("unit"));
        }
        output.put("value", value);
        details.put("output", output);
        details.put("stale", false);
        details.put("inputs", details.get("inputs"));
        return updateObject(workspaceId, objectId, new UpdateObjectRequest(
                null, null, null, null, null, true, "system", null, null, null, null, null, details));
    }

    public IdeaObject convertTargetToObservation(String workspaceId, String targetId) {
        IdeaObject target = getObject(workspaceId, targetId);
        if (!"target".equals(target.type())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Convert requires a Target");
        }
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("observedAt", Instant.now().toString());
        details.put("setup", "Converted from target " + target.displayId());
        details.put("result", target.title());
        details.put("bearsOn", "supports");
        IdeaObject observation = createObject(workspaceId, null, new CreateObjectRequest(
                "observation",
                target.title(),
                target.summary(),
                target.body(),
                target.branchId(),
                "derived",
                "promoted",
                "active",
                "user",
                null,
                null,
                nearby(target.canvasX()),
                nearby(target.canvasY()),
                List.of(),
                List.of(target.id()),
                details
        ));
        createEdgeInternal(workspaceId, target.branchId(), "promoted-to", target.id(), observation.id(),
                "target measured", null, null);
        return observation;
    }

    public IdeaObject abandon(String workspaceId, String objectId, String why, String becauseObjectId) {
        IdeaObject current = getObject(workspaceId, objectId);
        IdeaObject updated = updateObject(workspaceId, objectId, new UpdateObjectRequest(
                null, null, null, null, "abandoned", true, "user", null, null, null, null, null, null));
        String because = becauseObjectId != null && !becauseObjectId.isBlank() ? becauseObjectId : objectId;
        if ((why != null && !why.isBlank()) || (becauseObjectId != null && !becauseObjectId.isBlank())) {
            createEdgeInternal(workspaceId, current.branchId(), "abandoned-because", objectId, because,
                    why == null || why.isBlank() ? "abandoned" : why, null, null);
        }
        return updated;
    }

    public IdeaObject resurrect(String workspaceId, String objectId) {
        IdeaObject current = getObject(workspaceId, objectId);
        IdeaObject updated = updateObject(workspaceId, objectId, new UpdateObjectRequest(
                null, null, null, null, "active", true, "user", null, null, null, null, null, null));
        createEdgeInternal(workspaceId, current.branchId(), "resurrected-as", objectId, objectId,
                "resurrected", null, null);
        return updated;
    }

    public IdeaObject setConstraintPosture(String workspaceId, String objectId, String posture) {
        IdeaObject current = getObject(workspaceId, objectId);
        if (!"constraint".equals(current.type())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Posture requires a Constraint");
        }
        if (!List.of("binding", "relaxed", "tightened").contains(posture)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid posture");
        }
        return updateObject(workspaceId, objectId, new UpdateObjectRequest(
                null, null, null, null, null, true, "user", null, null, null, null, null,
                Map.of("posture", posture)));
    }

    public IdeaObject startEvaluation(String workspaceId, String hypothesisId) {
        IdeaObject hyp = getObject(workspaceId, hypothesisId);
        if (!"hypothesis".equals(hyp.type())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Evaluation starts from a Hypothesis");
        }
        List<String> existing = jdbc.queryForList("""
                SELECT e.to_object_id FROM idea_edge e
                JOIN idea_object o ON o.id = e.to_object_id
                WHERE e.from_object_id = ? AND e.type = 'evaluated-by' AND e.deleted_at IS NULL
                  AND o.deleted_at IS NULL AND o.type = 'evaluation'
                """, String.class, hypothesisId);
        if (!existing.isEmpty()) {
            return getObject(workspaceId, existing.getFirst());
        }
        IdeaObject evaluation = createObject(workspaceId, null, new CreateObjectRequest(
                "evaluation",
                "Evaluation of " + hyp.displayId(),
                "Feasibility review of " + hyp.title(),
                "",
                hyp.branchId(),
                "original",
                null,
                "active",
                "user",
                null,
                null,
                nearby(hyp.canvasX()),
                nearby(hyp.canvasY()),
                List.of(),
                List.of(hyp.id()),
                Map.of()
        ));
        createEdgeInternal(workspaceId, hyp.branchId(), "evaluated-by", hyp.id(), evaluation.id(),
                "start evaluation", null, null);
        return evaluation;
    }

    public IdeaObject acceptEvaluation(String workspaceId, String evaluationId, String title) {
        IdeaObject evaluation = getObject(workspaceId, evaluationId);
        if (!"evaluation".equals(evaluation.type())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Accept requires an Evaluation");
        }
        updateObject(workspaceId, evaluationId, new UpdateObjectRequest(
                null, null, null, null, "supported", true, "user", null, null, null, null, null,
                Map.of("outcome", "supported")));
        String theoryTitle = title == null || title.isBlank() ? "This works: " + evaluation.title() : title;
        return createTheoryFromEvaluation(workspaceId, evaluationId, theoryTitle,
                evaluation.summary(), evaluation.body(), "user", null, null);
    }

    public IdeaObject rejectEvaluation(String workspaceId, String evaluationId) {
        IdeaObject evaluation = getObject(workspaceId, evaluationId);
        if (!"evaluation".equals(evaluation.type())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Reject requires an Evaluation");
        }
        updateObject(workspaceId, evaluationId, new UpdateObjectRequest(
                null, null, null, null, "abandoned", true, "user", null, null, null, null, null,
                Map.of("outcome", "rejected")));
        List<String> hyps = jdbc.queryForList("""
                SELECT from_object_id FROM idea_edge
                WHERE to_object_id = ? AND type = 'evaluated-by' AND deleted_at IS NULL
                """, String.class, evaluationId);
        IdeaObject last = evaluation;
        for (String hypId : hyps) {
            last = abandon(workspaceId, hypId, "Evaluation rejected", evaluationId);
        }
        return last;
    }

    public IdeaObject addComponent(String workspaceId, String architectureId, String title) {
        IdeaObject architecture = getObject(workspaceId, architectureId);
        if (!"architecture".equals(architecture.type())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Add component requires an Architecture");
        }
        IdeaObject component = createObject(workspaceId, null, new CreateObjectRequest(
                "component",
                title == null || title.isBlank() ? "Part" : title,
                "",
                "",
                architecture.branchId(),
                "original",
                null,
                "active",
                "user",
                null,
                null,
                nearby(architecture.canvasX()),
                nearby(architecture.canvasY()),
                List.of(),
                List.of(architecture.id()),
                Map.of()
        ));
        createEdgeInternal(workspaceId, architecture.branchId(), "parent-of", architecture.id(), component.id(),
                "BOM", null, null);
        updateObject(workspaceId, architectureId, new UpdateObjectRequest(
                null, null, null, null, null, true, "user", null, null, null, null, null,
                Map.of("components", currentBom(architectureId))));
        return component;
    }

    public IdeaEdge reuseIn(String workspaceId, String localObjectId, String sourceWorkspaceId, String sourceObjectId) {
        IdeaObject local = getObject(workspaceId, localObjectId);
        IdeaObject source = getObject(sourceWorkspaceId, sourceObjectId);
        return createEdgeInternal(workspaceId, local.branchId(), "reused-in", local.id(), source.id(),
                "reused from " + source.displayId(), null, null, sourceWorkspaceId, sourceObjectId);
    }

    public List<SimilarObject> similarAcrossAccount(String accountId, String workspaceId, String query) {
        String q = query == null ? "" : query.trim().toLowerCase();
        String like = "%" + q + "%";
        return jdbc.query("""
                SELECT o.id, o.workspace_id, w.name AS workspace_name, o.display_id, o.type, o.title, o.summary,
                       o.object_category
                FROM idea_object o
                JOIN workspace w ON w.id = o.workspace_id
                WHERE w.account_id = ?
                  AND o.workspace_id <> ?
                  AND o.deleted_at IS NULL
                  AND (? = '' OR lower(o.title) LIKE ? OR lower(o.summary) LIKE ? OR lower(o.display_id) LIKE ?
                       OR EXISTS (SELECT 1 FROM idea_tag t WHERE t.object_id = o.id AND lower(t.tag) LIKE ?))
                ORDER BY o.updated_at DESC
                LIMIT 20
                """, (rs, i) -> {
            String id = rs.getString("id");
            List<String> tags = jdbc.queryForList("SELECT tag FROM idea_tag WHERE object_id = ?", String.class, id);
            return new SimilarObject(
                    id,
                    rs.getString("workspace_id"),
                    rs.getString("workspace_name"),
                    rs.getString("display_id"),
                    rs.getString("type"),
                    rs.getString("title"),
                    rs.getString("summary"),
                    rs.getString("object_category"),
                    tags
            );
        }, accountId, workspaceId, q, like, like, like, like);
    }

    private void markCalculationsStale(String workspaceId, String changedObjectId) {
        List<String> calcIds = jdbc.queryForList("""
                SELECT e.from_object_id FROM idea_edge e
                JOIN idea_object o ON o.id = e.from_object_id
                WHERE e.to_object_id = ? AND e.type = 'calculated-from' AND e.deleted_at IS NULL
                  AND o.deleted_at IS NULL AND o.type = 'calculation' AND o.workspace_id = ?
                """, String.class, changedObjectId, workspaceId);
        for (String calcId : calcIds) {
            IdeaObject calc = getObject(workspaceId, calcId);
            Map<String, Object> details = calc.details() == null ? new LinkedHashMap<>() : new LinkedHashMap<>(calc.details());
            if (ObjectDetails.isTrue(details, "stale")) {
                continue;
            }
            details.put("stale", true);
            jdbc.update("UPDATE idea_object SET details = ?::jsonb, updated_at = now() WHERE id = ?",
                    ObjectDetails.stringify(details), calcId);
        }
    }

    private void syncCalculatedFrom(String workspaceId, String branchId, String objectId, String type,
                                    Map<String, Object> details) {
        if (!"calculation".equals(type) || details == null) {
            return;
        }
        Object raw = details.get("inputs");
        if (!(raw instanceof List<?> list)) {
            return;
        }
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> map)) {
                continue;
            }
            Object source = map.get("sourceObjectId");
            if (source == null || String.valueOf(source).isBlank()) {
                continue;
            }
            String sourceId = String.valueOf(source);
            Integer exists = jdbc.queryForObject("""
                    SELECT count(*) FROM idea_edge
                    WHERE workspace_id = ? AND from_object_id = ? AND to_object_id = ?
                      AND type = 'calculated-from' AND deleted_at IS NULL
                    """, Integer.class, workspaceId, objectId, sourceId);
            if (exists != null && exists > 0) {
                continue;
            }
            try {
                getObject(workspaceId, sourceId);
                createEdgeInternal(workspaceId, branchId, "calculated-from", objectId, sourceId,
                        "input", null, null);
            } catch (Exception ignored) {
                // source may live elsewhere; skip
            }
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Double> calculationInputs(Map<String, Object> details) {
        Map<String, Double> out = new LinkedHashMap<>();
        Object raw = details.get("inputs");
        if (!(raw instanceof List<?> list)) {
            return out;
        }
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> map)) {
                continue;
            }
            Object name = map.get("name");
            if (name == null || String.valueOf(name).isBlank()) {
                continue;
            }
            Double value = CalculationExpr.asNumber(map.get("value"));
            if (value != null) {
                out.put(String.valueOf(name), value);
            }
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private void refreshInputsFromSources(String workspaceId, Map<String, Object> details, Map<String, Double> inputs) {
        Object raw = details.get("inputs");
        if (!(raw instanceof List<?> list)) {
            return;
        }
        List<Map<String, Object>> next = new ArrayList<>();
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> map)) {
                continue;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            map.forEach((k, v) -> row.put(String.valueOf(k), v));
            Object source = row.get("sourceObjectId");
            if (source != null && !String.valueOf(source).isBlank()) {
                try {
                    IdeaObject src = getObject(workspaceId, String.valueOf(source));
                    Object out = src.details() == null ? null : src.details().get("output");
                    if (out instanceof Map<?, ?> om) {
                        Double value = CalculationExpr.asNumber(om.get("value"));
                        if (value != null) {
                            row.put("value", value);
                            Object name = row.get("name");
                            if (name != null) {
                                inputs.put(String.valueOf(name), value);
                            }
                        }
                    }
                } catch (Exception ignored) {
                    // keep stored value
                }
            }
            next.add(row);
        }
        details.put("inputs", next);
    }

    private List<Map<String, Object>> currentBom(String architectureId) {
        return jdbc.query("""
                SELECT o.id, o.display_id, o.title
                FROM idea_edge e
                JOIN idea_object o ON o.id = e.to_object_id
                WHERE e.from_object_id = ? AND e.type = 'parent-of' AND e.deleted_at IS NULL
                  AND o.deleted_at IS NULL
                ORDER BY o.display_id
                """, (rs, i) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", rs.getString("id"));
            row.put("displayId", rs.getString("display_id"));
            row.put("title", rs.getString("title"));
            return row;
        }, architectureId);
    }

    public record GraphSnapshot(List<IdeaObject> nodes, List<IdeaEdge> edges) {}

    public record CreateObjectRequest(
            String type,
            String title,
            String summary,
            String body,
            String branchId,
            String origin,
            String derivedVia,
            String objectCategory,
            String generatedBy,
            String sourceUserMessageId,
            String sourceAssistantMessageId,
            Double canvasX,
            Double canvasY,
            List<String> tags,
            List<String> derivedFrom,
            Map<String, Object> details
    ) {}

    public record UpdateObjectRequest(
            String type,
            String title,
            String summary,
            String body,
            String objectCategory,
            Boolean newVersion,
            String generatedBy,
            String sourceUserMessageId,
            String sourceAssistantMessageId,
            Double canvasX,
            Double canvasY,
            List<String> tags,
            Map<String, Object> details
    ) {}

    public record CreateEdgeRequest(
            String type,
            String fromObjectId,
            String toObjectId,
            String why,
            String branchId,
            String sourceUserMessageId,
            String sourceAssistantMessageId,
            String sourceWorkspaceId,
            String sourceObjectId
    ) {}

    public record ObjectVersion(
            String id,
            String objectId,
            int version,
            String title,
            String summary,
            String body,
            String type,
            String objectCategory,
            Map<String, Object> details,
            String generatedBy,
            String sourceUserMessageId,
            String sourceAssistantMessageId,
            Instant createdAt
    ) {}

    public record SimilarObject(
            String id,
            String workspaceId,
            String workspaceName,
            String displayId,
            String type,
            String title,
            String summary,
            String objectCategory,
            List<String> tags
    ) {}
}
