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
        return searchObjects(workspaceId, query, limit, null, null);
    }

    public List<IdeaObject> searchObjects(String workspaceId, String query, int limit, String type, String category) {
        ObjectSearchQuery spec = ObjectSearchQuery.build(workspaceId, query, type, category, limit);
        List<String> ids = jdbc.queryForList(spec.sql, String.class, spec.args.toArray());
        return ids.stream().map(id -> graphService.getObject(workspaceId, id)).toList();
    }
}
