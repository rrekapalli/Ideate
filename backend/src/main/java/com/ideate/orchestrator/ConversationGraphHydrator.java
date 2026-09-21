package com.ideate.orchestrator;

import com.ideate.graph.IdeaObject;
import com.ideate.graph.ObjectCatalog;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Small local models often emit empty create_node tool calls. This fills titles,
 * summaries, and bodies from the user/assistant text and infers missing edges.
 */
public final class ConversationGraphHydrator {
    private static final Pattern EXPLICIT = Pattern.compile(
            "(?i)\\b([A-Z]{1,4}-\\d+)\\b[^\\n]{0,40}?title:\\s*(.+?)(?:\\s+summary:\\s*(.+?))?(?=\\s+[A-Z]{1,4}-\\d+\\b|\\s+Then\\b|$)");
    private static final Pattern EDGE = Pattern.compile(
            "(?i)\\b([A-Z]{1,4}-\\d+)\\s*->\\s*([A-Z]{1,4}-\\d+)(?:\\s+type\\s+([a-z-]+))?");
    private static final List<String> TYPE_HINTS = List.of(
            "question", "hypothesis", "assumption", "constraint", "experiment",
            "evidence", "concept", "thought", "decision", "claim");

    public record NodePatch(String objectId, String type, String title, String summary, String body) {}

    public record EdgeSpec(String type, String fromDisplayId, String toDisplayId, String why) {}

    public record ExtraCard(String type, String title, String summary, String body) {}

    public record Plan(List<NodePatch> nodes, List<EdgeSpec> edges, List<ExtraCard> extras) {}

    public Plan plan(String userText, String assistantText, List<IdeaObject> created) {
        String user = userText == null ? "" : userText;
        String assistant = assistantText == null ? "" : assistantText.trim();
        Map<String, Explicit> explicit = parseExplicit(user);
        List<String> hintedTypes = hintedTypes(user);
        List<NodePatch> patches = new ArrayList<>();
        Map<String, IdeaObject> byDisplay = new LinkedHashMap<>();

        for (int i = 0; i < created.size(); i++) {
            IdeaObject obj = created.get(i);
            byDisplay.put(obj.displayId(), obj);
            Explicit ex = explicit.get(obj.displayId().toUpperCase(Locale.ROOT));
            String type = obj.type();
            if (ex == null && "thought".equals(type) && i < hintedTypes.size()) {
                type = hintedTypes.get(i);
            }
            String title = firstNonBlank(ex == null ? null : ex.title, usable(obj.title()),
                    titleFor(type, user, assistant));
            String summary = firstNonBlank(ex == null ? null : ex.summary, usable(obj.summary()),
                    summaryFor(type, title));
            String body = firstNonBlank(usable(obj.body()),
                    typedBody(type, title, summary, user, assistantForType(type, assistant)));
            if (needsFill(obj) || ex != null || !type.equals(obj.type())) {
                patches.add(new NodePatch(obj.id(), type,
                        title == null ? "Untitled" : title,
                        summary == null ? "" : summary,
                        body == null ? "" : body));
            }
            byDisplay.put(obj.displayId(), obj);
        }

        List<EdgeSpec> edges = new ArrayList<>();
        Matcher em = EDGE.matcher(user + "\n" + assistant);
        while (em.find()) {
            String edgeType = em.group(3) == null ? "mentions" : em.group(3).toLowerCase(Locale.ROOT);
            if (!ObjectCatalog.EDGE_TYPES.contains(edgeType)) {
                edgeType = "mentions";
            }
            edges.add(new EdgeSpec(edgeType, em.group(1).toUpperCase(Locale.ROOT),
                    em.group(2).toUpperCase(Locale.ROOT), "From conversation"));
        }
        boolean filling = created.stream().anyMatch(this::needsFill);
        if (edges.isEmpty() && filling) {
            edges.addAll(defaultTypedEdges(created, patches));
        }
        return new Plan(patches, edges, extras(user, assistant, created, patches));
    }

    static List<String> questionsIn(String user) {
        List<String> out = new ArrayList<>();
        Matcher m = Pattern.compile("([^?\\n]{10,180}\\?)").matcher(user == null ? "" : user);
        while (m.find()) {
            String q = clean(m.group(1));
            if (q != null && out.stream().noneMatch(e -> e.equalsIgnoreCase(q))) {
                out.add(q);
            }
        }
        return out;
    }

    private static List<ExtraCard> extras(String user, String assistant, List<IdeaObject> created,
                                         List<NodePatch> patches) {
        List<String> questions = questionsIn(user);
        List<String> titles = new ArrayList<>();
        created.forEach(o -> titles.add(o.title() == null ? "" : o.title().toLowerCase(Locale.ROOT)));
        patches.forEach(p -> titles.add(p.title() == null ? "" : p.title().toLowerCase(Locale.ROOT)));
        List<ExtraCard> extras = new ArrayList<>();
        for (String q : questions) {
            String key = q.toLowerCase(Locale.ROOT);
            boolean covered = titles.stream().anyMatch(t -> t.contains(key.substring(0, Math.min(18, key.length()))));
            if (!covered) {
                extras.add(new ExtraCard("question", q, summaryFor("question", q),
                        typedBody("question", q, summaryFor("question", q), user, assistantForType("question", assistant))));
            }
        }
        return extras;
    }

    public boolean needsFill(IdeaObject obj) {
        return obj == null
                || usable(obj.title()) == null
                || usable(obj.summary()) == null
                || usable(obj.body()) == null;
    }

    private static List<EdgeSpec> defaultTypedEdges(List<IdeaObject> created, List<NodePatch> patches) {
        Map<String, String> displayByType = new LinkedHashMap<>();
        for (int i = 0; i < created.size(); i++) {
            IdeaObject obj = created.get(i);
            String type = obj.type();
            for (NodePatch p : patches) {
                if (p.objectId().equals(obj.id()) && p.type() != null) {
                    type = p.type();
                }
            }
            displayByType.putIfAbsent(type, obj.displayId());
        }
        List<EdgeSpec> edges = new ArrayList<>();
        String q = displayByType.get("question");
        String h = displayByType.get("hypothesis");
        String k = displayByType.get("constraint");
        String x = displayByType.get("experiment");
        if (q != null && h != null) {
            edges.add(new EdgeSpec("mentions", q, h, "Question leads to hypothesis"));
        }
        if (k != null && h != null) {
            edges.add(new EdgeSpec("constrains", k, h, "Constraint on the hypothesis"));
        }
        if (x != null && h != null) {
            edges.add(new EdgeSpec("tested-by", h, x, "Hypothesis tested by experiment"));
        }
        return edges;
    }

    private static Map<String, Explicit> parseExplicit(String user) {
        Map<String, Explicit> out = new LinkedHashMap<>();
        Matcher m = EXPLICIT.matcher(user);
        while (m.find()) {
            out.put(m.group(1).toUpperCase(Locale.ROOT),
                    new Explicit(clean(m.group(2)), clean(m.group(3))));
        }
        return out;
    }

    private static List<String> hintedTypes(String user) {
        String lower = user.toLowerCase(Locale.ROOT);
        List<String> types = new ArrayList<>();
        for (String type : TYPE_HINTS) {
            if (lower.contains(type) && ObjectCatalog.NODE_TYPES.contains(type) && !types.contains(type)) {
                types.add(type);
            }
        }
        return types;
    }

    private static String summaryFor(String type, String title) {
        return switch (type == null ? "thought" : type) {
            case "question" -> "The unknown this thread is actually asking.";
            case "hypothesis" -> firstNonBlank(title, "A claim we can keep or drop.");
            case "constraint" -> "A limit the design must still satisfy.";
            case "experiment" -> "A small trial with a pass/fail outcome.";
            case "assumption" -> "Taken as true until something contradicts it.";
            case "evidence" -> "An observation that bears on the claim.";
            default -> trim(firstNonBlank(title, "Captured from the conversation."), 160);
        };
    }

    private static String typedBody(String type, String title, String summary, String user, String usefulAssistant) {
        String topic = firstNonBlank(title, firstQuestion(user), "This idea");
        return switch (type == null ? "thought" : type) {
            case "question" -> join(
                    topic.endsWith("?") ? topic : topic + "?",
                    firstNonBlank(summary, "Name the unknown in one sentence."),
                    "Stay with this question. A recap of the graph is not an answer.");
            case "hypothesis" -> join(
                    topic,
                    firstNonBlank(usefulAssistant, summary, "This is the working answer."),
                    "Keep it specific enough that an experiment can refute it.");
            case "constraint" -> join(
                    topic,
                    firstNonBlank(summary, "This bound stays even if the approach changes."),
                    "If a design violates it, the design is not done.");
            case "experiment" -> join(
                    topic,
                    firstNonBlank(summary, "Run a small trial and write the pass/fail rule."),
                    "Say the setup, the measurement, and what would kill the hypothesis.");
            case "assumption" -> join(topic, firstNonBlank(summary, "Unproven. Mark it if it starts doing work."));
            case "evidence" -> join(topic, firstNonBlank(usefulAssistant, summary, "What was seen, not what we hope."));
            default -> join(topic, firstNonBlank(summary, usefulAssistant, "Captured from the conversation."));
        };
    }

    private static String assistantForType(String type, String assistant) {
        if (isGenericDump(assistant)) {
            return null;
        }
        if ("hypothesis".equals(type) || "thought".equals(type) || "claim".equals(type) || "concept".equals(type)) {
            return trim(assistant, 400);
        }
        return null;
    }

    private static boolean isGenericDump(String text) {
        if (text == null || text.isBlank()) {
            return true;
        }
        String lower = text.toLowerCase(Locale.ROOT);
        return lower.contains("the graph includes")
                || lower.contains("the graph has")
                || lower.contains("edges connect")
                || lower.contains("properly linked")
                || lower.contains("necessary edges and nodes")
                || lower.contains("i created")
                || lower.contains("i've created")
                || lower.contains("cards have been");
    }

    private static String usable(String value) {
        if (value == null || value.isBlank() || "Untitled".equalsIgnoreCase(value) || isGenericDump(value)) {
            return null;
        }
        return value.trim();
    }

    private static String join(String... parts) {
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (part == null || part.isBlank()) {
                continue;
            }
            if (sb.length() > 0) {
                sb.append("\n\n");
            }
            sb.append(part.trim());
        }
        return sb.toString();
    }

    private static String titleFor(String type, String user, String assistant) {
        String fromUser = firstQuestion(user);
        if ("question".equals(type) && fromUser != null) {
            return fromUser;
        }
        String sentence = firstSentence(assistant);
        if (sentence != null && sentence.length() > 12 && !sentence.toLowerCase(Locale.ROOT).startsWith("the graph")) {
            return trim(sentence, 120);
        }
        return switch (type == null ? "thought" : type) {
            case "question" -> fromUser != null ? fromUser : "Open question";
            case "hypothesis" -> "Working hypothesis";
            case "constraint" -> "Constraint";
            case "experiment" -> "First experiment";
            case "assumption" -> "Assumption";
            default -> trim(firstNonBlank(fromUser, sentence, "Captured from chat"), 120);
        };
    }

    private static String firstQuestion(String text) {
        Matcher m = Pattern.compile("([^?\\n]{12,180}\\?)").matcher(text == null ? "" : text);
        return m.find() ? clean(m.group(1)) : null;
    }

    private static String firstSentence(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        int cut = text.indexOf('.');
        String s = cut > 12 ? text.substring(0, cut + 1) : text;
        return clean(s);
    }

    private static boolean isBlankTitle(String title) {
        return title == null || title.isBlank() || "Untitled".equalsIgnoreCase(title);
    }

    private static String blankToNull(String value) {
        return isBlankTitle(value) || (value != null && value.isBlank()) ? null : value;
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String v : values) {
            if (v != null && !v.isBlank() && !"Untitled".equalsIgnoreCase(v)) {
                return v.trim();
            }
        }
        return null;
    }

    private static String trim(String value, int max) {
        if (value == null) {
            return "";
        }
        String t = value.trim();
        return t.length() <= max ? t : t.substring(0, max - 1) + "…";
    }

    private static String clean(String value) {
        if (value == null) {
            return null;
        }
        return value.replaceAll("\\s+", " ").trim();
    }

    private record Explicit(String title, String summary) {}
}
