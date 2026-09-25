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
    private static final Pattern MERMAID_FENCE = Pattern.compile(
            "(?is)```mermaid\\s*\\r?\\n.*?```");
    private static final Pattern EXPLICIT = Pattern.compile(
            "(?i)\\b([A-Z]{1,4}-\\d+)\\b[^\\n]{0,40}?title:\\s*(.+?)(?:\\s+summary:\\s*(.+?))?(?=\\s+[A-Z]{1,4}-\\d+\\b|\\s+Then\\b|$)");
    private static final Pattern EDGE = Pattern.compile(
            "(?i)\\b([A-Z]{1,4}-\\d+)\\s*->\\s*([A-Z]{1,4}-\\d+)(?:\\s+type\\s+([a-z-]+))?");
    private static final List<String> TYPE_HINTS = List.of(
            "question", "hypothesis", "assumption", "constraint", "experiment",
            "evidence", "concept", "thought", "decision", "claim", "citation",
            "unknown", "critique");

    public record NodePatch(String objectId, String type, String title, String summary, String body) {}

    public record EdgeSpec(String type, String fromDisplayId, String toDisplayId, String why) {}

    public record ExtraCard(String type, String title, String summary, String body) {}

    public record Plan(List<NodePatch> nodes, List<EdgeSpec> edges, List<ExtraCard> extras) {}

    public Plan plan(String userText, String assistantText, List<IdeaObject> created) {
        return plan(userText, assistantText, created, List.of(), List.of(), null);
    }

    public Plan plan(String userText, String assistantText, List<IdeaObject> created,
                     List<IdeaObject> existing, List<String> focusKeys) {
        return plan(userText, assistantText, created, existing, focusKeys, null);
    }

    public Plan plan(String userText, String assistantText, List<IdeaObject> created,
                     List<IdeaObject> existing, List<String> focusKeys, String persona) {
        String user = userText == null ? "" : userText;
        String assistant = assistantText == null ? "" : assistantText.trim();
        Map<String, Explicit> explicit = parseExplicit(user);
        List<String> hintedTypes = hintedTypes(user);
        List<NodePatch> patches = new ArrayList<>();

        for (int i = 0; i < created.size(); i++) {
            IdeaObject obj = created.get(i);
            Explicit ex = explicit.get(obj.displayId().toUpperCase(Locale.ROOT));
            String type = obj.type();
            if (ex == null && "thought".equals(type) && i < hintedTypes.size()) {
                type = hintedTypes.get(i);
            }
            String title = firstNonBlank(ex == null ? null : ex.title, usable(obj.title()),
                    titleFor(type, user, assistant));
            String summary = firstNonBlank(ex == null ? null : ex.summary, usable(obj.summary()),
                    summaryFor(type, title));
            String mermaid = extractMermaidFence(assistant);
            String spoken = mermaid == null ? assistant : stripMermaidFences(assistant);
            String body;
            if (containsMermaid(obj.body())) {
                body = obj.body().trim();
            } else {
                body = firstNonBlank(usable(obj.body()),
                        typedBody(type, title, summary, user, assistantForType(type, spoken)));
                if (mermaid != null && !containsMermaid(body)) {
                    body = join(body, mermaid);
                }
            }
            if (needsFill(obj) || ex != null || !type.equals(obj.type())) {
                patches.add(new NodePatch(obj.id(), type,
                        title == null ? "Untitled" : title,
                        summary == null ? "" : summary,
                        body == null ? "" : body));
            }
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
        List<ExtraCard> extraCards = extras(user, assistant, created, patches, existing, focusKeys, persona);
        edges.addAll(suggestedEdges(created, patches));
        return new Plan(patches, dedupe(edges), extraCards);
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
                                         List<NodePatch> patches, List<IdeaObject> existing,
                                         List<String> focusKeys, String persona) {
        Map<String, Boolean> have = new LinkedHashMap<>();
        created.forEach(o -> have.put(o.type(), true));
        patches.forEach(p -> have.put(p.type(), true));
        if (existing != null) {
            existing.forEach(o -> have.put(o.type(), true));
        }
        List<String> titles = new ArrayList<>();
        created.forEach(o -> titles.add(norm(o.title())));
        patches.forEach(p -> titles.add(norm(p.title())));
        if (existing != null) {
            existing.forEach(o -> titles.add(norm(o.title())));
        }

        List<ExtraCard> extras = new ArrayList<>();
        boolean focused = focusKeys != null && !focusKeys.isEmpty();
        String primary = firstQuestion(user);
        if (primary == null && (!firstCapture(existing) || focused)) {
            primary = utteranceAsQuestion(user);
        }
        String cleanAsst = ChatReplyCleaner.visible(assistant);
        boolean firstCapture = firstCapture(existing);
        boolean explorer = persona != null && "explorer".equalsIgnoreCase(persona.trim());

        if (primary != null && !covered(titles, primary)) {
            extras.add(card("question", primary,
                    firstCapture ? "The unknown this conversation is actually asking."
                            : "A follow-up from this turn.",
                    typedBody("question", primary,
                            firstCapture ? "The unknown this conversation is actually asking."
                                    : "This question grows from a card already on the graph.",
                            user, null)));
            have.put("question", true);
            titles.add(norm(primary));
        }

        if (explorer) {
            if (looksLikeGap(user) && !have.containsKey("unknown")) {
                String gapTitle = gapTitle(user, primary);
                if (!covered(titles, gapTitle)) {
                    extras.add(card("unknown", gapTitle,
                            "I don't know yet — inventory, not a failure.",
                            typedBody("unknown", gapTitle, "I don't know yet.", user, null)));
                    have.put("unknown", true);
                    titles.add(norm(gapTitle));
                }
            }
            if (ChatReplyCleaner.isUsable(cleanAsst) && !covered(titles, firstSentence(cleanAsst))) {
                extras.add(card("thought", trim(firstSentence(cleanAsst), 120),
                        firstCapture ? "A speculation from this turn. Stay a Thought until they promote it."
                                : "An answer that grows from a card already on the graph.",
                        cleanAsst));
                have.put("thought", true);
            }
            for (ExtraCard cit : parseCitations(cleanAsst)) {
                if (!covered(titles, cit.title())) {
                    extras.add(cit);
                    titles.add(norm(cit.title()));
                }
            }
            return extras;
        }

        String myth = misconceptionFrom(user);
        if (myth != null && !have.containsKey("misconception") && !covered(titles, myth)) {
            extras.add(card("misconception", myth,
                    "A belief that is getting in the way of the answer.",
                    "**" + myth + "**\n\nSolids are not always denser than the liquid they sit in. Ice is the everyday counterexample."));
            have.put("misconception", true);
        }

        if (firstCapture && looksLikeDefinitionQuestion(user) && !have.containsKey("concept")) {
            extras.add(card("concept", "Density is not the same as weight",
                    "Mass per volume — not how heavy something feels in your hand.",
                    "**Density** is mass divided by volume. **Weight** is a downward force.\n\nA heavy steel ship floats because its *average* density is less than water."));
            have.put("concept", true);
        }

        boolean addedHypothesis = false;
        if (ChatReplyCleaner.isUsable(cleanAsst)) {
            if (firstCapture && !have.containsKey("hypothesis")) {
                extras.add(card("hypothesis", trim(firstSentence(cleanAsst), 120),
                        "The working explanation from this turn.",
                        cleanAsst));
                have.put("hypothesis", true);
                addedHypothesis = true;
            } else if (!firstCapture && !covered(titles, firstSentence(cleanAsst))) {
                extras.add(card("thought", trim(firstSentence(cleanAsst), 120),
                        "An answer that grows from a card already on the graph.",
                        cleanAsst));
            }
        }

        if (firstCapture && (have.containsKey("hypothesis") || addedHypothesis) && !have.containsKey("experiment")) {
            extras.add(experimentFor(user, primary));
            have.put("experiment", true);
        }

        if (firstCapture) {
            String follow = followUp(user, cleanAsst, primary);
            if (follow != null && extras.stream().filter(e -> "question".equals(e.type())).count() < 2
                    && !covered(titles, follow)) {
                extras.add(card("question", follow,
                        "A next question the explanation opened.",
                        "**" + follow + "**\n\nThis keeps the thread moving past the first answer."));
            }
        }
        for (ExtraCard cit : parseCitations(cleanAsst)) {
            if (!covered(titles, cit.title())) {
                extras.add(cit);
                titles.add(norm(cit.title()));
            }
        }
        return extras;
    }

    public List<EdgeSpec> suggestedEdges(List<IdeaObject> nodes) {
        return suggestedEdges(nodes, List.of());
    }

    /**
     * Every card minted this turn hangs off the focused card, or the closest existing card
     * when Chat was used without a selection.
     */
    public List<EdgeSpec> attachToAnchor(List<IdeaObject> newNodes, List<IdeaObject> existing,
                                         List<String> focusKeys, String userText) {
        List<EdgeSpec> edges = new ArrayList<>();
        if (newNodes == null || newNodes.isEmpty()) {
            return edges;
        }
        IdeaObject anchor = resolveAnchor(existing, focusKeys, userText);
        if (anchor == null) {
            return edges;
        }
        for (IdeaObject n : newNodes) {
            if (n == null || n.id().equals(anchor.id())) {
                continue;
            }
            edges.add(edgeBetween(anchor, n));
        }
        return edges;
    }

    public IdeaObject resolveAnchor(List<IdeaObject> existing, List<String> focusKeys, String userText) {
        if (existing == null || existing.isEmpty()) {
            return null;
        }
        if (focusKeys != null) {
            for (int i = focusKeys.size() - 1; i >= 0; i--) {
                String key = focusKeys.get(i);
                if (key == null || key.isBlank()) {
                    continue;
                }
                for (IdeaObject n : existing) {
                    if (key.equals(n.id()) || key.equalsIgnoreCase(n.displayId())) {
                        return n;
                    }
                }
            }
        }
        return pickRelevant(existing, userText);
    }

    static IdeaObject pickRelevant(List<IdeaObject> existing, String userText) {
        if (existing == null || existing.isEmpty()) {
            return null;
        }
        List<String> tokens = tokens(userText);
        IdeaObject best = null;
        int bestScore = -1;
        for (IdeaObject n : existing) {
            int score = 0;
            String hay = norm(n.displayId() + " " + n.title() + " " + n.summary() + " " + n.body());
            for (String token : tokens) {
                if (hay.contains(token)) {
                    score += token.length();
                }
            }
            if ("question".equals(n.type()) || "hypothesis".equals(n.type())) {
                score += 3;
            }
            if (score > bestScore) {
                bestScore = score;
                best = n;
            }
        }
        if (bestScore <= 0) {
            return existing.stream()
                    .filter(n -> "question".equals(n.type()) || "hypothesis".equals(n.type()))
                    .reduce((a, b) -> b)
                    .orElse(existing.getLast());
        }
        return best;
    }

    static EdgeSpec edgeBetween(IdeaObject from, IdeaObject to) {
        String a = from.type() == null ? "" : from.type();
        String b = to.type() == null ? "" : to.type();
        if ("question".equals(a) && "hypothesis".equals(b)) {
            return new EdgeSpec("mentions", from.displayId(), to.displayId(), "Question leads to hypothesis");
        }
        if ("question".equals(a) && "question".equals(b)) {
            return new EdgeSpec("led-to", from.displayId(), to.displayId(), "Earlier question opened this one");
        }
        if ("hypothesis".equals(a) && "question".equals(b)) {
            return new EdgeSpec("led-to", from.displayId(), to.displayId(), "This claim opened a next question");
        }
        if ("hypothesis".equals(a) && "hypothesis".equals(b)) {
            return new EdgeSpec("supports", from.displayId(), to.displayId(), "Related working claim");
        }
        if ("hypothesis".equals(a) && "thought".equals(b)) {
            return new EdgeSpec("mentions", from.displayId(), to.displayId(), "Answer grows from this claim");
        }
        if ("concept".equals(a) && "hypothesis".equals(b)) {
            return new EdgeSpec("supports", from.displayId(), to.displayId(), "Concept the claim rests on");
        }
        if ("concept".equals(a) && ("question".equals(b) || "thought".equals(b))) {
            return new EdgeSpec("mentions", from.displayId(), to.displayId(), "Follow-up from this concept");
        }
        if ("misconception".equals(a) && "hypothesis".equals(b)) {
            return new EdgeSpec("contradicts", from.displayId(), to.displayId(), "Misconception the claim has to beat");
        }
        if ("experiment".equals(b) && ("hypothesis".equals(a) || "thought".equals(a))) {
            return new EdgeSpec("tested-by", from.displayId(), to.displayId(), "Trial for this claim");
        }
        if ("thought".equals(a) && "question".equals(b)) {
            return new EdgeSpec("led-to", from.displayId(), to.displayId(), "This note opened a question");
        }
        if ("citation".equals(b)) {
            return new EdgeSpec("mentions", from.displayId(), to.displayId(), "Claim cites this paper");
        }
        if ("citation".equals(a)) {
            return new EdgeSpec("supports", from.displayId(), to.displayId(), "This paper supports the idea");
        }
        return new EdgeSpec("mentions", from.displayId(), to.displayId(), "Grown from " + from.displayId());
    }

    private static List<String> tokens(String text) {
        List<String> out = new ArrayList<>();
        if (text == null) {
            return out;
        }
        for (String raw : text.toLowerCase(Locale.ROOT).split("[^a-z0-9]+")) {
            if (raw.length() >= 4) {
                out.add(raw);
            }
        }
        return out;
    }

    public boolean needsFill(IdeaObject obj) {
        return obj == null
                || usable(obj.title()) == null
                || usable(obj.summary()) == null
                || usable(obj.body()) == null;
    }

    static boolean containsMermaid(String text) {
        return text != null && MERMAID_FENCE.matcher(text).find();
    }

    static String extractMermaidFence(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        Matcher m = MERMAID_FENCE.matcher(text);
        return m.find() ? m.group().trim() : null;
    }

    static String stripMermaidFences(String text) {
        if (text == null || text.isBlank()) {
            return text;
        }
        return MERMAID_FENCE.matcher(text).replaceAll("").replaceAll("\n{3,}", "\n\n").trim();
    }

    private static List<EdgeSpec> suggestedEdges(List<IdeaObject> created, List<NodePatch> patches) {
        Map<String, List<String>> byType = new LinkedHashMap<>();
        for (IdeaObject obj : created) {
            String type = obj.type();
            for (NodePatch p : patches) {
                if (p.objectId().equals(obj.id()) && p.type() != null) {
                    type = p.type();
                }
            }
            byType.computeIfAbsent(type, k -> new ArrayList<>()).add(obj.displayId());
        }
        return linksFromTypes(byType);
    }

    private static List<EdgeSpec> linksFromTypes(Map<String, List<String>> byType) {
        List<EdgeSpec> edges = new ArrayList<>();
        List<String> questions = byType.getOrDefault("question", List.of());
        String h = first(byType.get("hypothesis"));
        String k = first(byType.get("constraint"));
        String x = first(byType.get("experiment"));
        String m = first(byType.get("misconception"));
        String c = first(byType.get("concept"));
        String ev = first(byType.get("evidence"));
        String q0 = questions.isEmpty() ? null : questions.getFirst();
        if (q0 != null && h != null) {
            edges.add(new EdgeSpec("mentions", q0, h, "Question leads to hypothesis"));
        }
        if (questions.size() > 1 && h != null) {
            edges.add(new EdgeSpec("mentions", questions.get(1), h, "Follow-up tests the same claim"));
            edges.add(new EdgeSpec("led-to", q0, questions.get(1), "The first answer opened a next question"));
        }
        if (m != null && h != null) {
            edges.add(new EdgeSpec("contradicts", m, h, "Misconception the hypothesis has to beat"));
        }
        if (c != null && h != null) {
            edges.add(new EdgeSpec("supports", c, h, "Concept the hypothesis rests on"));
        }
        if (k != null && h != null) {
            edges.add(new EdgeSpec("constrains", k, h, "Constraint on the hypothesis"));
        }
        if (ev != null && h != null) {
            edges.add(new EdgeSpec("supports", ev, h, "Evidence for the hypothesis"));
        }
        if (x != null && h != null) {
            edges.add(new EdgeSpec("tested-by", h, x, "Hypothesis tested by experiment"));
        }
        String target = h != null ? h : first(byType.get("thought"));
        if (target == null) {
            target = q0;
        }
        if (target != null) {
            for (String citId : byType.getOrDefault("citation", List.of())) {
                edges.add(new EdgeSpec("supports", citId, target, "Published source for this idea"));
            }
        }
        return edges;
    }

    private static ExtraCard card(String type, String title, String summary, String body) {
        return new ExtraCard(type, title, summary, body);
    }

    private static ExtraCard experimentFor(String user, String primary) {
        String lower = (user + " " + (primary == null ? "" : primary)).toLowerCase(Locale.ROOT);
        if (lower.contains("ice") || lower.contains("float") || lower.contains("water")) {
            return card("experiment", "Watch an ice cube in a marked glass of water",
                    "A small trial: if ice is less dense, it sits up; if not, it sinks.",
                    "1. Fill a glass and mark the water line.\n2. Add an ice cube — it should sit *above* the surface.\n3. If ice were denser than liquid water, it would rest on the bottom.");
        }
        return card("experiment", "A small trial that could kill the hypothesis",
                "A pass/fail check, not a recap.",
                "Write the setup, the measurement, and what result would force you to drop the working explanation.");
    }

    private static String misconceptionFrom(String user) {
        if (user == null) {
            return null;
        }
        Matcher thought = Pattern.compile("(?i)i thought ([^.?]{8,140})").matcher(user);
        if (thought.find()) {
            String claim = clean(thought.group(1));
            return claim.endsWith(".") ? "I thought " + claim : "I thought " + claim + ".";
        }
        if (user.toLowerCase(Locale.ROOT).matches("(?s).*solid[s]? (were |are |is )?heavier.*")) {
            return "Solids are heavier than liquids, so ice should sink.";
        }
        return null;
    }

    private static boolean looksLikeDefinitionQuestion(String user) {
        String lower = user == null ? "" : user.toLowerCase(Locale.ROOT);
        return lower.contains("same as") || lower.contains("what is density")
                || lower.contains("difference between") || lower.contains("density the same");
    }

    static boolean looksLikeGap(String user) {
        String lower = user == null ? "" : user.toLowerCase(Locale.ROOT);
        return lower.contains("i don't know") || lower.contains("i do not know")
                || lower.contains("not sure") || lower.contains("unclear")
                || lower.contains("don't know yet") || lower.contains("unknown whether");
    }

    static String gapTitle(String user, String primary) {
        String stripped = user == null ? "" : user;
        if (primary != null && !primary.isBlank()) {
            stripped = stripped.replace(primary, " ").trim();
        }
        String sentence = firstSentence(stripped);
        if (sentence == null || sentence.isBlank() || sentence.equalsIgnoreCase(primary)) {
            return "I don't know yet";
        }
        return trim(sentence, 120);
    }

    private static String followUp(String user, String assistant, String primary) {
        String lower = (user + " " + assistant).toLowerCase(Locale.ROOT);
        if (lower.contains("ice") || lower.contains("lake") || lower.contains("float")) {
            String next = "Why do lakes freeze from the top instead of the bottom?";
            if (primary == null || !norm(primary).contains("lakes freeze")) {
                return next;
            }
        }
        List<String> asked = questionsIn(assistant);
        for (String q : asked) {
            if (primary == null || !norm(q).contains(norm(primary).substring(0, Math.min(12, norm(primary).length())))) {
                return q;
            }
        }
        return null;
    }

    private static boolean covered(List<String> titles, String candidate) {
        String key = norm(candidate);
        if (key.length() < 8) {
            return true;
        }
        String clip = key.substring(0, Math.min(22, key.length()));
        return titles.stream().anyMatch(t -> {
            if (t.length() < 8) {
                return false;
            }
            return t.contains(clip) || clip.contains(t.substring(0, Math.min(18, t.length())));
        });
    }

    private static String norm(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    private static String first(List<String> ids) {
        return ids == null || ids.isEmpty() ? null : ids.getFirst();
    }

    private static List<EdgeSpec> dedupe(List<EdgeSpec> edges) {
        Map<String, EdgeSpec> uniq = new LinkedHashMap<>();
        for (EdgeSpec e : edges) {
            uniq.putIfAbsent(e.type() + "|" + e.fromDisplayId() + "|" + e.toDisplayId(), e);
        }
        return new ArrayList<>(uniq.values());
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
                    topic.endsWith("?") ? "**" + topic + "**" : "**" + topic + "?**",
                    firstNonBlank(summary, "Name the unknown in one sentence."),
                    "Stay with this question. A recap of the graph is not an answer.");
            case "hypothesis" -> join(
                    "**" + topic + "**",
                    firstNonBlank(usefulAssistant, summary, "This is the working answer."),
                    "Keep it specific enough that an experiment can refute it.");
            case "constraint" -> join(
                    "**" + topic + "**",
                    firstNonBlank(summary, "This bound stays even if the approach changes."),
                    "If a design violates it, the design is not done.");
            case "experiment" -> join(
                    "**" + topic + "**",
                    firstNonBlank(summary, "Run a small trial and write the pass/fail rule."),
                    "Say the setup, the measurement, and what would kill the hypothesis.");
            case "assumption" -> join("**" + topic + "**", firstNonBlank(summary, "Unproven. Mark it if it starts doing work."));
            case "evidence" -> join("**" + topic + "**", firstNonBlank(usefulAssistant, summary, "What was seen, not what we hope."));
            default -> join("**" + topic + "**", firstNonBlank(summary, usefulAssistant, "Captured from the conversation."));
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

    static List<ExtraCard> parseCitations(String assistant) {
        List<ExtraCard> out = new ArrayList<>();
        if (assistant == null || assistant.isBlank()) {
            return out;
        }
        String block = assistant;
        Matcher section = Pattern.compile("(?is)(?:^|\\n)\\s*#{0,3}\\s*citations?\\s*[:\\-]*\\s*\\n(.+)$")
                .matcher(assistant);
        if (section.find()) {
            block = section.group(1);
        }
        Matcher line = Pattern.compile("(?m)^\\s*(?:[-*]|\\d+[.)])\\s+(.{12,280})\\s*$").matcher(block);
        while (line.find() && out.size() < 4) {
            String raw = clean(line.group(1));
            if (looksLikeCitation(raw)) {
                out.add(card("citation", citationTitle(raw), "A published source for this turn.",
                        citationBody(raw)));
            }
        }
        if (out.isEmpty()) {
            Matcher authorYear = Pattern.compile(
                    "([A-Z][A-Za-z\\-]+(?:\\s+(?:and|&)\\s+[A-Z][A-Za-z\\-]+)?(?:\\s+et al\\.)?)\\s*\\((19|20)\\d{2}\\)([^\\n.]{8,160})")
                    .matcher(assistant);
            while (authorYear.find() && out.size() < 3) {
                String raw = clean(authorYear.group(0));
                if (!covered(out.stream().map(e -> norm(e.title())).toList(), raw)) {
                    out.add(card("citation", citationTitle(raw), "A published source for this turn.",
                            citationBody(raw)));
                }
            }
        }
        return out;
    }

    static boolean looksLikeCitation(String raw) {
        if (raw == null) {
            return false;
        }
        String l = raw.toLowerCase(Locale.ROOT);
        if (l.startsWith("http") && !l.contains("doi")) {
            return raw.length() > 20;
        }
        return raw.matches(".*\\((19|20)\\d{2}\\).*")
                || l.contains("doi")
                || l.contains("et al")
                || l.contains("journal")
                || l.contains("pnas")
                || l.contains("nature")
                || l.contains("science")
                || l.contains("arxiv");
    }

    static String citationTitle(String raw) {
        String t = raw.replaceAll("(?i)^doi:\\s*", "").trim();
        return trim(t, 140);
    }

    static String citationBody(String raw) {
        String t = raw.trim();
        Matcher doi = Pattern.compile("(?i)\\b(10\\.\\d{4,9}/[-._;()/:A-Z0-9]+)\\b").matcher(t);
        if (doi.find()) {
            return t + "\n\nhttps://doi.org/" + doi.group(1);
        }
        return t;
    }

    private static boolean firstCapture(List<IdeaObject> existing) {
        return existing == null || existing.stream()
                .noneMatch(o -> "question".equals(o.type()) || "hypothesis".equals(o.type()));
    }

    private static String firstQuestion(String text) {
        Matcher m = Pattern.compile("([^?\\n]{12,180}\\?)").matcher(text == null ? "" : text);
        return m.find() ? clean(m.group(1)) : null;
    }

    static String utteranceAsQuestion(String user) {
        String t = clean(user);
        if (t == null || t.length() < 12) {
            return null;
        }
        int nl = t.indexOf('\n');
        String line = nl > 12 ? t.substring(0, nl).trim() : t;
        if (line.length() > 180) {
            line = trim(line, 180);
        }
        String lower = line.toLowerCase(Locale.ROOT);
        boolean interrogative = line.endsWith("?")
                || lower.startsWith("why") || lower.startsWith("how") || lower.startsWith("what")
                || lower.startsWith("when") || lower.startsWith("where") || lower.startsWith("who")
                || lower.startsWith("can ") || lower.startsWith("could") || lower.startsWith("does")
                || lower.startsWith("do ") || lower.startsWith("is ") || lower.startsWith("are ")
                || lower.startsWith("then ") || lower.contains("how can") || lower.contains("why can");
        if (!interrogative && line.length() < 20) {
            return null;
        }
        return line.endsWith("?") ? line : line + "?";
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
