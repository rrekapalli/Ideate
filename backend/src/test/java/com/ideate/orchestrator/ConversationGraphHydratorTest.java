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
    void extraQuestionCardsWhenUserAsksSeveralQuestions() {
        String user = "Why does ice float? Isn't a solid heavier than a liquid? What is density?";
        var plan = hydrator.plan(user, "Ice is less dense than liquid water.", List.of(obj("a", "T-001", "thought")));
        assertTrue(plan.extras().size() >= 2);
        assertTrue(plan.extras().stream().allMatch(e -> "question".equals(e.type())));
    }

    private static IdeaObject obj(String id, String displayId, String type) {
        return new IdeaObject(id, "ws", "br", displayId, type, "original", null, "speculative",
                "Untitled", "", "", 1, "ollama", "u", "a", null, null, Instant.now(), Instant.now(),
                List.of(), List.of());
    }
}
