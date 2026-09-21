package com.ideate.retrieval;

import com.ideate.graph.GraphService;
import com.ideate.graph.IdeaObject;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RetrievalService {
    private final JdbcTemplate jdbc;
    private final GraphService graphService;

    public RetrievalService(JdbcTemplate jdbc, GraphService graphService) {
        this.jdbc = jdbc;
        this.graphService = graphService;
    }

    public List<IdeaObject> searchObjects(String workspaceId, String query, int limit) {
        String q = "%" + query.toLowerCase() + "%";
        List<String> ids = jdbc.queryForList("""
                SELECT id FROM idea_object
                WHERE workspace_id = ? AND deleted_at IS NULL
                  AND (lower(display_id) LIKE ? OR lower(title) LIKE ? OR lower(summary) LIKE ? OR lower(body) LIKE ?)
                ORDER BY updated_at DESC
                LIMIT ?
                """, String.class, workspaceId, q, q, q, q, limit);
        return ids.stream().map(id -> graphService.getObject(workspaceId, id)).toList();
    }
}
