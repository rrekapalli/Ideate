package com.ideate.context;

import com.ideate.graph.GraphService;
import com.ideate.graph.IdeaObject;
import com.ideate.graph.ObjectDetails;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Inventor-mode appendix for {@link ProjectStateAssembler}. */
public final class InventorPosture {
    static final int INDEX_CAP = 24;

    private InventorPosture() {}

    public static String appendix(String mode, List<String> focusIds, GraphService.GraphSnapshot graph) {
        StringBuilder sb = new StringBuilder();
        sb.append("\n---\nInventor graph index (design from these cards; do not invent a finished product):\n");
        List<IdeaObject> nodes = graph == null || graph.nodes() == null ? List.of() : graph.nodes();
        int written = 0;
        written += writeIndex(sb, "Constraints", nodes.stream().filter(n -> "constraint".equals(n.type())).toList(),
                INDEX_CAP - written);
        written += writeIndex(sb, "Open targets",
                nodes.stream().filter(n -> "target".equals(n.type()) && !"abandoned".equals(n.objectCategory())).toList(),
                INDEX_CAP - written);
        written += writeIndex(sb, "Stale calculations",
                nodes.stream().filter(InventorPosture::staleCalc).toList(), INDEX_CAP - written);
        writeIndex(sb, "Architectures and decisions",
                nodes.stream().filter(n -> "architecture".equals(n.type()) || "decision".equals(n.type())).toList(),
                INDEX_CAP - written);
        sb.append('\n');
        sb.append(modePosture(mode, focusIds));
        sb.append(rules());
        return sb.toString();
    }

    static String modePosture(String mode, List<String> focusIds) {
        String m = mode == null ? "challenge" : mode.toLowerCase(Locale.ROOT);
        boolean focused = focusIds != null && !focusIds.isEmpty();
        String lastFocus = focused ? focusIds.get(focusIds.size() - 1) : "";
        return switch (m) {
            case "challenge" -> focused
                    ? "Mode Challenge: walk constraints and what focused card " + lastFocus
                    + " breaks. Ask what problem this concept solves and which new problem it creates.\n"
                    : "Mode Challenge: walk constraints and what the concept breaks. Ask what problem this solves and which new problem it creates.\n";
            case "create" -> "Mode Create: propose the next architecture or component set. Keep targets and estimates labeled.\n";
            case "review" -> "Mode Review: decision review and assumption breaks. Do not declare the design feasible without an accepted Evaluation.\n";
            default -> "Mode " + m + ": stay with the inventor's graph. Keep wishes distinct from measurements.\n";
        };
    }

    static String rules() {
        return """
                Inventor rules:
                - Mint Constraint, Target, Calculation, Component, and Decision when the user states a limit, a wish, a derivation, a part, or a choice.
                - Never change a Target into an Observation and never retag estimate as fact. The user converts a target explicitly.
                - Never create a Theory or say "this works" unless an Evaluation outcome is supported.
                - Link constrains, calculated-from, introduces, and solves when the turn states those relationships.
                - Keep failure-mode Critique and Hypothesis cards when an Architecture versions.
                - Numbers taken from a design sheet or concept image are target or estimate, never fact.
                """;
    }

    private static boolean staleCalc(IdeaObject n) {
        if (!"calculation".equals(n.type())) {
            return false;
        }
        Map<String, Object> details = n.details() == null ? Map.of() : n.details();
        return ObjectDetails.isTrue(details, "stale");
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
