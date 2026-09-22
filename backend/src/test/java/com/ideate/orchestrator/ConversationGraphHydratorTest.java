package com.ideate.orchestrator;

import com.ideate.graph.IdeaObject;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ConversationGraphHydratorTest {

    private final ConversationGraphHydrator hydrator = new ConversationGraphHydrator();

    @Test
    void fillsUntitledCardsFromExplicitUserTitlesAndAssistantReply() {
        String user = "Update existing cards only. Q-001 title: How do we add pgvector beside AGE? "
                + "summary: Need embeddings for similar idea objects. "
                + "H-001 title: pgvector can share the Ideate DB with AGE. "
                + "summary: Same Postgres instance, new extension. "
                + "Then create_edge Q-001 -> H-001 type mentions, K-001 -> H-001 type constrains";
        String assistant = "The graph includes the necessary edges and nodes for the project.";
        List<IdeaObject> created = List.of(
                obj("1", "Q-001", "question"),
                obj("2", "H-001", "hypothesis"),
                obj("3", "K-001", "constraint"),
                obj("4", "X-001", "experiment"));

        ConversationGraphHydrator.Plan plan = hydrator.plan(user, assistant, created);

        assertEquals(4, plan.nodes().size());
        assertEquals("How do we add pgvector beside AGE?", plan.nodes().get(0).title());
        assertEquals("Need embeddings for similar idea objects.", plan.nodes().get(0).summary());
        assertTrue(plan.nodes().get(0).body().contains("How do we add pgvector beside AGE?"));
        assertFalse(plan.nodes().get(0).body().toLowerCase().contains("the graph includes"));
        assertEquals("pgvector can share the Ideate DB with AGE.", plan.nodes().get(1).title());
        assertFalse(plan.nodes().get(1).body().equals(plan.nodes().get(0).body()));
        assertTrue(plan.nodes().get(1).body().contains("pgvector can share the Ideate DB with AGE."));
        assertTrue(plan.edges().stream().anyMatch(e -> "mentions".equals(e.type())
                && "Q-001".equals(e.fromDisplayId()) && "H-001".equals(e.toDisplayId())));
        assertTrue(plan.edges().stream().anyMatch(e -> "constrains".equals(e.type())));
    }

    @Test
    void infersTypesAndDefaultEdgesFromEmptyThoughts() {
        String user = "Create a question card, a hypothesis, constraints for AGE/PgBouncer, and an experiment card.";
        String assistant = "Install pgvector on the same Postgres that already has Apache AGE.";
        List<IdeaObject> created = List.of(
                obj("a", "T-001", "thought"),
                obj("b", "T-002", "thought"),
                obj("c", "T-003", "thought"),
                obj("d", "T-004", "thought"));

        ConversationGraphHydrator.Plan plan = hydrator.plan(user, assistant, created);

        assertEquals("question", plan.nodes().get(0).type());
        assertEquals("hypothesis", plan.nodes().get(1).type());
        assertEquals("constraint", plan.nodes().get(2).type());
        assertEquals("experiment", plan.nodes().get(3).type());
        assertFalse(plan.nodes().get(0).title().isBlank());
        assertTrue(plan.nodes().get(1).body().contains(assistant));
        assertFalse(plan.nodes().get(0).body().equals(plan.nodes().get(1).body()));
        assertTrue(plan.edges().stream().anyMatch(e -> "tested-by".equals(e.type())));
    }

    @Test
    void buildsAThinkingGraphInsteadOfAQuestionPile() {
        String user = "Why does ice float? I thought solids were heavier than liquids. Is density the same as weight?";
        var plan = hydrator.plan(user, "Ice is less dense than liquid water because the crystal opens up.",
                List.of(obj("a", "T-001", "thought")));
        assertTrue(plan.extras().stream().anyMatch(e -> "hypothesis".equals(e.type())));
        assertTrue(plan.extras().stream().anyMatch(e -> "misconception".equals(e.type()) || "concept".equals(e.type())));
        assertTrue(plan.extras().stream().anyMatch(e -> "experiment".equals(e.type())));
        long questions = plan.extras().stream().filter(e -> "question".equals(e.type())).count();
        assertTrue(questions <= 2);
    }

    @Test
    void laterTurnWithoutQuestionMarkStillMintsFromTheClickedCard() {
        IdeaObject question = titled("q1", "Q-001", "question", "Why does ice float on water?");
        IdeaObject hypothesis = titled("h1", "H-001", "hypothesis", "Ice floats because it is less dense than liquid water.");
        String user = "Then how can ships made of metal can float on water, even though they are more denser than water";
        String assistant = "A metal ship floats because its average density is less than water.";
        var plan = hydrator.plan(user, assistant, List.of(), List.of(question, hypothesis),
                List.of(question.id(), hypothesis.id()));
        assertTrue(plan.extras().stream().anyMatch(e -> "question".equals(e.type())
                && e.title().toLowerCase().contains("ships")));
        assertTrue(plan.extras().stream().anyMatch(e -> "thought".equals(e.type())
                && e.title().toLowerCase().contains("metal ship")));
        IdeaObject mintedQ = titled("n1", "Q-005", "question",
                "Then how can ships made of metal can float on water, even though they are more denser than water?");
        IdeaObject mintedT = titled("n2", "T-002", "thought",
                "A metal ship floats because its average density is less than water.");
        var edges = hydrator.attachToAnchor(List.of(mintedQ, mintedT), List.of(question, hypothesis),
                List.of(question.id(), "H-001"), user);
        assertTrue(edges.stream().anyMatch(e -> "H-001".equals(e.fromDisplayId())
                && "Q-005".equals(e.toDisplayId())));
        assertTrue(edges.stream().noneMatch(e -> "Q-001".equals(e.fromDisplayId())
                && "Q-005".equals(e.toDisplayId())));
    }

    @Test
    void mintsCitationCardsFromACitationsSection() {
        IdeaObject hypothesis = titled("h1", "H-001", "hypothesis", "Birds sense Earth's magnetic field");
        String assistant = """
                Birds use magnetoreception. Cryptochrome in the eye is a leading idea.

                ### Citations
                1. Wiltschko and Wiltschko (1995). Magnetic orientation in birds. Journal of Experimental Biology.
                2. Ritz et al. (2000). A model for photoreceptor-based magnetoreception in birds. Biophysical Journal. DOI: 10.1016/S0006-3495(00)76729-X
                """;
        var plan = hydrator.plan("How can birds navigate using earths magnetic field", assistant,
                List.of(), List.of(hypothesis), List.of("H-001"));
        assertTrue(plan.extras().stream().anyMatch(e -> "citation".equals(e.type())
                && e.title().toLowerCase().contains("wiltschko")));
        assertTrue(plan.extras().stream().anyMatch(e -> "citation".equals(e.type())
                && e.body().toLowerCase().contains("doi")));
        IdeaObject paper = titled("c1", "CIT-001", "citation", "Wiltschko and Wiltschko (1995). Magnetic orientation in birds.");
        var edges = hydrator.attachToAnchor(List.of(paper), List.of(hypothesis), List.of("H-001"), "birds");
        assertTrue(edges.stream().anyMatch(e -> "H-001".equals(e.fromDisplayId())
                && "CIT-001".equals(e.toDisplayId())));
    }

    @Test
    void laterTurnDoesNotCloneTheTreeAndAttachesToTheFocusCard() {
        IdeaObject hypothesis = titled("h1", "H-001", "hypothesis", "Ice is less dense than liquid water");
        String user = "Why do lakes freeze from the top instead of the bottom?";
        var plan = hydrator.plan(user, "Ice stays on top because it is less dense than the water below.",
                List.of(), List.of(hypothesis), List.of("H-001"));
        assertTrue(plan.extras().stream().anyMatch(e -> "question".equals(e.type())
                && e.title().toLowerCase().contains("lakes")));
        assertTrue(plan.extras().stream().noneMatch(e -> "experiment".equals(e.type())));
        assertTrue(plan.extras().stream().noneMatch(e -> "hypothesis".equals(e.type())));
        IdeaObject minted = titled("n1", "Q-002", "question", "Why do lakes freeze from the top instead of the bottom?");
        var edges = hydrator.attachToAnchor(List.of(minted), List.of(hypothesis), List.of("H-001"), user);
        assertTrue(edges.stream().anyMatch(e -> "led-to".equals(e.type())
                && "H-001".equals(e.fromDisplayId()) && "Q-002".equals(e.toDisplayId())));
    }

    @Test
    void chatWithoutFocusStillPicksARelevantExistingCard() {
        IdeaObject question = titled("q1", "Q-001", "question", "Why does ice float on water?");
        IdeaObject other = titled("c1", "C-001", "concept", "Density is not the same as weight");
        IdeaObject picked = ConversationGraphHydrator.pickRelevant(List.of(other, question),
                "Why does ice float if wood also floats?");
        assertEquals("Q-001", picked.displayId());
    }

    private static IdeaObject titled(String id, String displayId, String type, String title) {
        return new IdeaObject(id, "ws", "br", displayId, type, "original", null, "speculative",
                title, title, title, 1, "ollama", "u", "a", null, null, Instant.now(), Instant.now(),
                List.of(), List.of());
    }

    private static IdeaObject obj(String id, String displayId, String type) {
        return new IdeaObject(id, "ws", "br", displayId, type, "original", null, "speculative",
                "Untitled", "", "", 1, "ollama", "u", "a", null, null, Instant.now(), Instant.now(),
                List.of(), List.of());
    }
}
