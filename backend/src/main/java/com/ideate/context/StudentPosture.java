package com.ideate.context;

import com.ideate.graph.GraphService;
import com.ideate.graph.IdeaEdge;
import com.ideate.graph.IdeaObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Student-mode appendix for {@link ProjectStateAssembler}. No schema changes. */
public final class StudentPosture {
    static final int INDEX_CAP = 24;

    private StudentPosture() {}

    public static String appendix(String mode, List<String> focusIds, GraphService.GraphSnapshot graph) {
        StringBuilder sb = new StringBuilder();
        sb.append("\n---\nStudent graph index (teach from these cards; do not mint a second curriculum):\n");
        List<IdeaObject> nodes = graph == null || graph.nodes() == null ? List.of() : graph.nodes();
        List<IdeaEdge> edges = graph == null || graph.edges() == null ? List.of() : graph.edges();
        int written = 0;
        written += writeIndex(sb, "Concepts", nodes.stream().filter(n -> "concept".equals(n.type())).toList(), INDEX_CAP - written);
        written += writeIndex(sb, "Open unknowns", openUnknowns(nodes, edges), INDEX_CAP - written);
        writeIndex(sb, "Misconceptions (includes history)",
                nodes.stream().filter(n -> "misconception".equals(n.type())).toList(), INDEX_CAP - written);
        sb.append('\n');
        sb.append(modePosture(mode, focusIds));
        return sb.toString();
    }

    static String modePosture(String mode, List<String> focusIds) {
        String m = mode == null ? "learn" : mode.toLowerCase(Locale.ROOT);
        boolean focused = focusIds != null && !focusIds.isEmpty();
        String lastFocus = focused ? focusIds.get(focusIds.size() - 1) : "";
        return switch (m) {
            case "learn" -> focused
                    ? "Mode Learn: explain only cards that already exist. Stay on the focused trail. Do not invent a parallel course.\n"
                    : "Mode Learn: explain only cards that already exist. No card is focused — ask which concept they want, and do not invent a second course or mint a curriculum.\n";
            case "explain" -> focused
                    ? "Mode Explain: rewrite summary and body on the focused node " + lastFocus
                    + " via update_node. Do not create_node a parallel concept. Depth follows the user utterance (shorter or fuller).\n"
                    : "Mode Explain: rewrite summary and body on the focused node via update_node. No card is focused — ask which concept to rewrite. Do not create_node a parallel concept.\n";
            case "challenge", "practice" ->
                    "Mode " + Character.toUpperCase(m.charAt(0)) + m.substring(1)
                            + ": ask what they think, why, and what breaks if an assumption is wrong, before filling any gap.\n";
            default -> "Mode " + m + ": stay with the learner's graph.\n";
        };
    }

    private static int writeIndex(StringBuilder sb, String heading, List<IdeaObject> items, int remaining) {
        if (remaining <= 0 || items.isEmpty()) {
            return 0;
        }
        sb.append(heading).append(":\n");
        int n = 0;
        for (IdeaObject item : items) {
            if (n >= remaining) {
                break;
            }
            sb.append("- ").append(item.displayId()).append(" [").append(item.type()).append("] ")
                    .append(nullToEmpty(item.title()));
            if (item.objectCategory() != null && !item.objectCategory().isBlank()) {
                sb.append(" category=").append(item.objectCategory());
            }
            sb.append('\n');
            if (item.summary() != null && !item.summary().isBlank()) {
                sb.append("  ").append(trim(item.summary(), 160)).append('\n');
            }
            n++;
        }
        return n;
    }

    static List<IdeaObject> openUnknowns(List<IdeaObject> nodes, List<IdeaEdge> edges) {
        Set<String> exampleNeighbors = exampleNeighborIds(nodes, edges);
        List<IdeaObject> out = new ArrayList<>();
        for (IdeaObject n : nodes) {
            if ("unknown".equals(n.type()) && "unknown".equals(n.objectCategory()) && !exampleNeighbors.contains(n.id())) {
                out.add(n);
            }
        }
        return out;
    }

    private static Set<String> exampleNeighborIds(List<IdeaObject> nodes, List<IdeaEdge> edges) {
        Set<String> exampleIds = new HashSet<>();
        for (IdeaObject n : nodes) {
            if ("evidence".equals(n.type()) && hasTag(n.tags(), "example")) {
                exampleIds.add(n.id());
            }
        }
        Set<String> neighbors = new HashSet<>();
        for (IdeaEdge e : edges) {
            if (exampleIds.contains(e.fromObjectId())) {
                neighbors.add(e.toObjectId());
            }
            if (exampleIds.contains(e.toObjectId())) {
                neighbors.add(e.fromObjectId());
            }
        }
        for (IdeaObject n : nodes) {
            if (n.derivedFrom() == null) {
                continue;
            }
            for (String parent : n.derivedFrom()) {
                if (exampleIds.contains(n.id())) {
                    neighbors.add(parent);
                }
                if (exampleIds.contains(parent)) {
                    neighbors.add(n.id());
                }
            }
        }
        return neighbors;
    }

    private static boolean hasTag(List<String> tags, String name) {
        if (tags == null) {
            return false;
        }
        for (String t : tags) {
            if (t != null && t.equalsIgnoreCase(name)) {
                return true;
            }
        }
        return false;
    }

    private static String trim(String value, int max) {
        if (value == null) {
            return "";
        }
        return value.length() <= max ? value : value.substring(0, max) + "…";
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
