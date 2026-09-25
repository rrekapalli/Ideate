package com.ideate.context;

import com.ideate.graph.GraphService;
import com.ideate.graph.IdeaEdge;
import com.ideate.graph.IdeaObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Explorer-mode appendix for {@link ProjectStateAssembler}. No schema changes. */
public final class ExplorerPosture {
    static final int INDEX_CAP = 24;

    private ExplorerPosture() {}

    public static String appendix(String mode, List<String> focusIds, GraphService.GraphSnapshot graph) {
        StringBuilder sb = new StringBuilder();
        sb.append("\n---\nExplorer graph index (follow the thought; do not pretend to know):\n");
        List<IdeaObject> nodes = graph == null || graph.nodes() == null ? List.of() : graph.nodes();
        List<IdeaEdge> edges = graph == null || graph.edges() == null ? List.of() : graph.edges();
        int written = 0;
        written += writeIndex(sb, "Growing thoughts",
                nodes.stream().filter(n -> "thought".equals(n.type()) && !"abandoned".equals(n.objectCategory())).toList(),
                INDEX_CAP - written);
        written += writeIndex(sb, "Open unknowns",
                nodes.stream().filter(n -> "unknown".equals(n.type()) && "unknown".equals(n.objectCategory())).toList(),
                INDEX_CAP - written);
        written += writeIndex(sb, "Assumptions",
                nodes.stream().filter(n -> "assumption".equals(n.type()) && !"abandoned".equals(n.objectCategory())).toList(),
                INDEX_CAP - written);
        writeAbandoned(sb, nodes, edges, INDEX_CAP - written);
        sb.append('\n');
        sb.append(modePosture(mode, focusIds));
        sb.append(rules());
        return sb.toString();
    }

    static String modePosture(String mode, List<String> focusIds) {
        String m = mode == null ? "explore" : mode.toLowerCase(Locale.ROOT);
        boolean focused = focusIds != null && !focusIds.isEmpty();
        String lastFocus = focused ? focusIds.get(focusIds.size() - 1) : "";
        return switch (m) {
            case "explore" -> focused
                    ? "Mode Explore: follow what focused card " + lastFocus
                    + " forces, including new problems. Mint Question, Unknown, or Assumption. Stay a Thought unless they ask to promote. Do not open a Theory, start an Evaluation, or write a full Critique.\n"
                    : "Mode Explore: follow what the growing thought forces, including new problems. Mint Question, Unknown, or Assumption. Stay a Thought unless they ask to promote. Do not open a Theory, start an Evaluation, or write a full Critique.\n";
            case "review" -> "Mode Review: a full critique of the speculation is allowed. Mint a Critique. Still do not create a Theory or start an Evaluation unless they ask.\n";
            default -> "Mode " + m + ": stay with the explorer's graph. Do not promote a Thought to Concept or Hypothesis unless they say to promote.\n";
        };
    }

    static String rules() {
        return """
                Explorer rules:
                - Keep a Thought a Thought. Promotion to Concept or Hypothesis is an explicit user act (they say promote, or they change the type on the card).
                - Tag a guess speculation. Tag a Fermi estimate or what-if thought-experiment. Set evidence-backed only when an Evidence card is actually linked.
                - Mint Unknown for gaps ("I don't know yet"). Unknowns are inventory, not failure.
                - Do not create a Theory. Do not start an Evaluation on an ordinary turn.
                - A Critique is allowed only in Review, or when they ask to critically evaluate the whole theory.
                - Abandoned cards stay queryable. Prefer abandon with why over delete.
                """;
    }

    private static void writeAbandoned(StringBuilder sb, List<IdeaObject> nodes, List<IdeaEdge> edges, int remaining) {
        if (remaining <= 0) {
            return;
        }
        List<IdeaObject> dropped = nodes.stream().filter(n -> "abandoned".equals(n.objectCategory())).toList();
        if (dropped.isEmpty()) {
            return;
        }
        sb.append("Abandoned (with why):\n");
        int n = 0;
        for (IdeaObject item : dropped) {
            if (n >= remaining) {
                break;
            }
            sb.append("- ").append(item.displayId()).append(" [").append(item.type()).append("] ")
                    .append(item.title() == null ? "" : item.title());
            String why = abandonWhy(item.id(), edges);
            if (why != null && !why.isBlank()) {
                sb.append(" why=").append(why);
            }
            sb.append('\n');
            n++;
        }
    }

    static String abandonWhy(String objectId, List<IdeaEdge> edges) {
        if (edges == null) {
            return null;
        }
        for (IdeaEdge e : edges) {
            if (!"abandoned-because".equals(e.type())) {
                continue;
            }
            if (objectId.equals(e.fromObjectId()) || objectId.equals(e.toObjectId())) {
                return e.why();
            }
        }
        return null;
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
                    .append(item.title() == null ? "" : item.title());
            if (item.objectCategory() != null && !item.objectCategory().isBlank()) {
                sb.append(" category=").append(item.objectCategory());
            }
            sb.append('\n');
            n++;
        }
        return n;
    }
}
