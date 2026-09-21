package com.ideate.context;

import com.ideate.graph.GraphService;
import com.ideate.graph.IdeaObject;
import com.ideate.transcript.TranscriptService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProjectStateAssembler {
    private static final int HARD_CAP_CHARS = 32_000;

    private final GraphService graphService;
    private final TranscriptService transcriptService;
    private final JdbcTemplate jdbc;

    public ProjectStateAssembler(GraphService graphService, TranscriptService transcriptService, JdbcTemplate jdbc) {
        this.graphService = graphService;
        this.transcriptService = transcriptService;
        this.jdbc = jdbc;
    }

    public String assemble(String workspaceId, String branchId, String utterance, List<String> focusIds) {
        StringBuilder sb = new StringBuilder();
        sb.append("CURRENT PROJECT STATE\n");
        WorkspaceBits bits = loadWorkspace(workspaceId);
        sb.append("Objective: ").append(bits.name).append('\n');
        sb.append("Persona: ").append(bits.persona).append('\n');
        GraphService.GraphSnapshot graph = graphService.graph(workspaceId, branchId);
        if (graph.nodes().isEmpty()) {
            sb.append("The workspace graph is empty. Aggressively materialize typed cards from the user's message.\n");
        } else {
            sb.append("Objects:\n");
            for (IdeaObject n : graph.nodes()) {
                if (focusIds != null && !focusIds.isEmpty() && !focusIds.contains(n.id()) && !focusIds.contains(n.displayId())) {
                    continue;
                }
                sb.append("- ").append(n.displayId()).append(" [").append(n.type()).append("] ")
                        .append(n.title()).append(" :: ").append(trim(n.summary(), 240)).append('\n');
            }
            if (focusIds == null || focusIds.isEmpty()) {
                // already listed all; cap later
            }
            sb.append("Edges:\n");
            graph.edges().stream().limit(40).forEach(e ->
                    sb.append("- ").append(e.displayId()).append(' ').append(e.type()).append(' ')
                            .append(e.fromObjectId()).append(" -> ").append(e.toObjectId()).append('\n'));
        }
        String cache = currentCache(workspaceId, branchId);
        if (cache != null && !cache.isBlank()) {
            sb.append("\nEvolving conversation cache:\n").append(cache).append('\n');
        }
        List<TranscriptService.TranscriptMessage> tail = transcriptService.list(workspaceId, branchId);
        int from = Math.max(0, tail.size() - 6);
        sb.append("\nTranscript tail:\n");
        for (int i = from; i < tail.size(); i++) {
            var msg = tail.get(i);
            sb.append(msg.role()).append(": ").append(trim(msg.content(), 500)).append('\n');
        }
        if (utterance != null) {
            sb.append("\nUser question: ").append(utterance).append('\n');
        }
        String out = sb.toString();
        if (out.length() > HARD_CAP_CHARS) {
            return out.substring(0, HARD_CAP_CHARS);
        }
        return out;
    }

    public String currentCache(String workspaceId, String branchId) {
        List<String> rows = jdbc.queryForList("""
                SELECT summary_text FROM conversation_cache
                WHERE workspace_id = ? AND branch_id = ? AND status = 'current'
                ORDER BY created_at DESC LIMIT 1
                """, String.class, workspaceId, branchId);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private WorkspaceBits loadWorkspace(String workspaceId) {
        return jdbc.queryForObject(
                "SELECT name, persona FROM workspace WHERE id = ?",
                (rs, i) -> new WorkspaceBits(rs.getString("name"), rs.getString("persona")),
                workspaceId);
    }

    private static String trim(String value, int max) {
        if (value == null) {
            return "";
        }
        return value.length() <= max ? value : value.substring(0, max) + "…";
    }

    private record WorkspaceBits(String name, String persona) {}
}
