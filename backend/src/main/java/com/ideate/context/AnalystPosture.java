package com.ideate.context;

import com.ideate.graph.GraphService;
import com.ideate.graph.IdeaObject;
import com.ideate.graph.ObjectCatalog;

import java.util.List;
import java.util.Locale;

/** Analyst / product-research appendix for {@link ProjectStateAssembler}. No schema fork. */
public final class AnalystPosture {
    static final int INDEX_CAP = 24;

    private AnalystPosture() {}

    public static String appendix(String mode, List<String> focusIds, GraphService.GraphSnapshot graph) {
        StringBuilder sb = new StringBuilder();
        sb.append("\n---\nProduct-research graph index (replay decisions; do not paste private quotes):\n");
        List<IdeaObject> nodes = graph == null || graph.nodes() == null ? List.of() : graph.nodes();
        int written = 0;
        written += writeIndex(sb, "Problems (Questions)",
                nodes.stream().filter(n -> "question".equals(n.type()) && !"abandoned".equals(n.objectCategory())).toList(),
                INDEX_CAP - written);
        written += writeIndex(sb, "Live bets (Hypotheses)",
                nodes.stream().filter(n -> "hypothesis".equals(n.type()) && !"abandoned".equals(n.objectCategory())).toList(),
                INDEX_CAP - written);
        written += writeIndex(sb, "Open assumptions",
                nodes.stream().filter(n -> "assumption".equals(n.type()) && !"abandoned".equals(n.objectCategory())).toList(),
                INDEX_CAP - written);
        written += writeIndex(sb, "Decisions",
                nodes.stream().filter(n -> "decision".equals(n.type()) && !"abandoned".equals(n.objectCategory())).toList(),
                INDEX_CAP - written);
        written += writeIndex(sb, "Quotes (Evidence)",
                nodes.stream().filter(n -> "evidence".equals(n.type()) && !"abandoned".equals(n.objectCategory())).toList(),
                INDEX_CAP - written);
        writeIndex(sb, "Killed bets",
                nodes.stream().filter(n -> "hypothesis".equals(n.type()) && "abandoned".equals(n.objectCategory())).toList(),
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
                    ? "Mode Challenge: pressure the assumptions under focused card " + lastFocus
                    + ". Ask what would change our mind before proposing a Decision.\n"
                    : "Mode Challenge: pressure load-bearing assumptions. Ask what would change our mind before a Decision.\n";
            case "review" -> "Mode Review: decision replay. Why this call, which interview weakened a bet, which constraint still holds.\n";
            default -> "Mode " + m + ": stay with the product-research graph. Bets are hypotheses. Do not conclude from a quote.\n";
        };
    }

    static String rules() {
        return """
                Product-research rules:
                - A bet is a Hypothesis. Stored type stays hypothesis. Display words may say Bet or Problem.
                - Quotes from interviews are Evidence tagged heard. Never treat heard as a conclusion.
                - Tag concluded only on an Evaluation or Decision.
                - Never copy body or title text from a card tagged do-not-quote into a Decision, Evaluation, or export.
                - Kill a bet with abandon-with-why, never delete. If a later bet revives it, write reused-in.
                """;
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
            if (ObjectCatalog.hasTag(item.tags(), ObjectCatalog.TAG_DO_NOT_QUOTE)) {
                sb.append(" do-not-quote=withheld");
            }
            sb.append('\n');
            if (!ObjectCatalog.hasTag(item.tags(), ObjectCatalog.TAG_DO_NOT_QUOTE)
                    && item.summary() != null && !item.summary().isBlank()) {
                sb.append("  ").append(trim(item.summary(), 160)).append('\n');
            }
            n++;
        }
        return n;
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
