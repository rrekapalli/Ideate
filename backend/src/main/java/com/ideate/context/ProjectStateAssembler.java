package com.ideate.context;

import com.ideate.graph.GraphService;
import com.ideate.orchestrator.ChatReplyCleaner;
import com.ideate.graph.IdeaObject;
import com.ideate.transcript.TranscriptService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

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
        WorkspaceBits bits = loadWorkspace(workspaceId);
        sb.append("Talk with this person as a ").append(bits.persona)
                .append(" thinking about \"").append(bits.name).append("\".\n");
        sb.append("Answer the latest message in natural language with a concise scientific explanation. ");
        sb.append("Include typical measured values and units when they exist. Do not answer with bullets only. ");
        sb.append("Do not describe cards or the graph.\n");
        if (utterance != null && !utterance.isBlank()) {
            sb.append("\nLatest message:\n").append(utterance).append("\n");
        }
        sb.append("\n---\nPrivate notes (do not quote, do not narrate):\n");
        GraphService.GraphSnapshot graph = graphService.graph(workspaceId, branchId);
        if (graph.nodes().isEmpty()) {
            sb.append("No captured ideas yet.\n");
        } else {
            if (focusIds != null && !focusIds.isEmpty()) {
                sb.append("Focus trail (last card is where this chat started; parents are context):\n");
                for (String key : focusIds) {
                    IdeaObject n = graph.nodes().stream()
                            .filter(o -> key.equals(o.id()) || key.equalsIgnoreCase(o.displayId()))
                            .findFirst()
                            .orElse(null);
                    if (n == null) {
                        continue;
                    }
                    sb.append("- ").append(n.displayId()).append(" [").append(n.type()).append("] ")
                            .append(n.title()).append('\n');
                    if (n.summary() != null && !n.summary().isBlank()) {
                        sb.append("  ").append(trim(n.summary(), 240)).append('\n');
                    }
                    if (n.body() != null && !n.body().isBlank()) {
                        sb.append("  ").append(trim(n.body(), 500)).append('\n');
                    }
                }
                sb.append("Answer from the last card on this trail. Grow new ideas from it and link them.\n");
                List<String> others = graph.nodes().stream()
                        .filter(n -> !focusIds.contains(n.id()) && !focusIds.contains(n.displayId()))
                        .map(IdeaObject::displayId)
                        .limit(24)
                        .toList();
                if (!others.isEmpty()) {
                    sb.append("Other cards: ").append(String.join(", ", others)).append('\n');
                }
            } else {
                sb.append("Ideas already captured:\n");
                for (IdeaObject n : graph.nodes()) {
                    sb.append("- ").append(n.displayId()).append(" [").append(n.type()).append("] ")
                            .append(n.title()).append(" :: ").append(trim(n.summary(), 240)).append('\n');
                }
            }
            sb.append("Edges:\n");
            graph.edges().stream().limit(40).forEach(e ->
                    sb.append("- ").append(e.displayId()).append(' ').append(e.type()).append(' ')
                            .append(e.fromObjectId()).append(" -> ").append(e.toObjectId()).append('\n'));
        }
        String cache = currentCache(workspaceId, branchId);
        if (cache != null && !cache.isBlank()) {
            sb.append("\nEarlier thread (private):\n").append(cache).append('\n');
        }
        List<TranscriptService.TranscriptMessage> tail = transcriptService.list(workspaceId, branchId);
        int from = Math.max(0, tail.size() - 6);
        sb.append("\nRecent chat:\n");
        for (int i = from; i < tail.size(); i++) {
            var msg = tail.get(i);
            String content = ChatReplyCleaner.visible(msg.content());
            if (content.isBlank()) {
                content = trim(msg.content(), 220);
            }
            if (ChatReplyCleaner.isUsable(content) || "user".equals(msg.role())) {
                sb.append(msg.role()).append(": ").append(trim(content, 400)).append('\n');
            }
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
