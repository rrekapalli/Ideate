package com.ideate.retrieval;

import java.util.ArrayList;
import java.util.List;

final class ObjectSearchQuery {
    final String sql;
    final List<Object> args;

    private ObjectSearchQuery(String sql, List<Object> args) {
        this.sql = sql;
        this.args = args;
    }

    static ObjectSearchQuery build(String workspaceId, String query, String type, String category, int limit) {
        StringBuilder sql = new StringBuilder("""
                SELECT id FROM idea_object
                WHERE workspace_id = ? AND deleted_at IS NULL
                """);
        List<Object> args = new ArrayList<>();
        args.add(workspaceId);
        String q = query == null ? "" : query.trim();
        if (!q.isEmpty()) {
            sql.append(" AND (lower(display_id) LIKE ? OR lower(title) LIKE ? OR lower(summary) LIKE ? OR lower(body) LIKE ?)");
            String like = "%" + q.toLowerCase() + "%";
            args.add(like);
            args.add(like);
            args.add(like);
            args.add(like);
        }
        if (type != null && !type.isBlank()) {
            sql.append(" AND type = ?");
            args.add(type);
        }
        if (category != null && !category.isBlank()) {
            sql.append(" AND object_category = ?");
            args.add(category);
        }
        sql.append(" ORDER BY updated_at DESC LIMIT ?");
        args.add(limit);
        return new ObjectSearchQuery(sql.toString(), args);
    }
}
