package com.ideate.context;

import com.ideate.attachments.AttachmentService;
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
    private final AttachmentService attachments;
    private final JdbcTemplate jdbc;

    public ProjectStateAssembler(GraphService graphService, TranscriptService transcriptService,
                                 AttachmentService attachments, JdbcTemplate jdbc) {
        this.graphService = graphService;
        this.transcriptService = transcriptService;
        this.attachments = attachments;
        this.jdbc = jdbc;
    }

    public String assemble(String workspaceId, String branchId, String utterance, List<String> focusIds) {
        return assemble(workspaceId, branchId, utterance, focusIds, List.of());
    }

    public String assemble(String workspaceId, String branchId, String utterance, List<String> focusIds,
                           List<String> turnAttachmentIds) {
        return assemble(workspaceId, branchId, utterance, focusIds, turnAttachmentIds, null);
    }

    public String assemble(String workspaceId, String branchId, String utterance, List<String> focusIds,
                           List<String> turnAttachmentIds, String mode) {
        StringBuilder sb = new StringBuilder();
        WorkspaceBits bits = loadWorkspace(workspaceId);
        sb.append("You are helping a ").append(bits.persona)
                .append(" in the workspace \"").append(bits.name).append("\".\n");
        if (mode != null && !mode.isBlank()) {
            sb.append("Current mode: ").append(mode.trim()).append(".\n");
        }
        sb.append("Answer ONLY the latest user message. Notes and earlier chat are background. ");
        sb.append("If the latest question is a new topic, answer that topic; do not repeat a previous answer. ");
        sb.append("Include typical measured values and units when they exist for THIS question. ");
        sb.append("Write short paragraphs, not bullets only. Do not describe cards or the graph.\n");

        GraphService.GraphSnapshot graph = graphService.graph(workspaceId, branchId);
        boolean focused = focusIds != null && !focusIds.isEmpty();
        sb.append("\n---\nPrivate notes (do not quote, do not narrate):\n");
        if (graph.nodes().isEmpty()) {
            sb.append("No captured ideas yet.\n");
        } else if (focused) {
            sb.append("Optional starting trail (last card is where chat opened). ");
            sb.append("Use it only if the latest question continues that idea.\n");
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
                    sb.append("  ").append(trim(n.summary(), 160)).append('\n');
                }
            }
        } else {
            sb.append("Captured idea titles (not the question to answer):\n");
            graph.nodes().stream().limit(16).forEach(n ->
                    sb.append("- ").append(n.displayId()).append(" [").append(n.type()).append("] ")
                            .append(n.title()).append('\n'));
        }
        if ("student".equalsIgnoreCase(bits.persona())) {
            sb.append(StudentPosture.appendix(mode, focusIds, graph));
        } else if ("inventor".equalsIgnoreCase(bits.persona())) {
            sb.append(InventorPosture.appendix(mode, focusIds, graph));
        } else if ("explorer".equalsIgnoreCase(bits.persona())) {
            sb.append(ExplorerPosture.appendix(mode, focusIds, graph));
        }

        String cache = currentCache(workspaceId, branchId);
        if (cache != null && !cache.isBlank()) {
            sb.append("\nEarlier thread (private):\n").append(trim(cache, 600)).append('\n');
        }
        List<TranscriptService.TranscriptMessage> tail = transcriptService.list(workspaceId, branchId);
        int from = Math.max(0, tail.size() - 4);
        boolean wroteChat = false;
        for (int i = from; i < tail.size(); i++) {
            var msg = tail.get(i);
            if (utterance != null && "user".equals(msg.role()) && utterance.equals(msg.content())) {
                continue;
            }
            String content = ChatReplyCleaner.visible(msg.content());
            if (content.isBlank()) {
                content = trim(msg.content(), 180);
            }
            if (!ChatReplyCleaner.isUsable(content) && !"user".equals(msg.role())) {
                continue;
            }
            if (!wroteChat) {
                sb.append("\nRecent chat (do not copy if the latest question changed):\n");
                wroteChat = true;
            }
            sb.append(msg.role()).append(": ").append(trim(content, 280)).append('\n');
        }

        if (utterance != null && !utterance.isBlank()) {
            sb.append("\n=== LATEST USER MESSAGE (answer this) ===\n")
                    .append(utterance.trim()).append('\n');
        } else if (turnAttachmentIds != null && !turnAttachmentIds.isEmpty()) {
            sb.append("\n=== LATEST USER MESSAGE (answer this) ===\n")
                    .append("(The user sent files without text. Use the attached extracts.)\n");
        }
        String extracts = attachments.extractsForTurn(workspaceId, turnAttachmentIds, focusIds);
        if (extracts != null && !extracts.isBlank()) {
            sb.append(extracts);
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
