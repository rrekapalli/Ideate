package com.ideate.context;

import com.ideate.graph.GraphService;
import com.ideate.graph.IdeaEdge;
import com.ideate.graph.IdeaObject;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ExplorerPostureTest {

    @Test
    void exploreDoesNotOpenATheoryOrPromoteByDefault() {
        String text = ExplorerPosture.appendix("explore", List.of("obj_thought_1"), emptyGraph());
        assertTrue(text.toLowerCase().contains("stay a thought"));
        assertTrue(text.toLowerCase().contains("do not open a theory"));
        assertTrue(text.toLowerCase().contains("do not") && text.toLowerCase().contains("evaluation"));
        assertTrue(text.contains("obj_thought_1"));
    }

    @Test
    void reviewAllowsACritique() {
        String text = ExplorerPosture.modePosture("review", List.of());
        assertTrue(text.toLowerCase().contains("critique"));
        assertFalse(text.toLowerCase().contains("stay a thought unless"));
    }

    @Test
    void indexListsThoughtsUnknownsAssumptionsAndAbandonedWhy() {
        IdeaObject thought = obj("t1", "T-001", "thought", "speculative", "Modular dormant relay", List.of());
        IdeaObject unknown = obj("u1", "U-001", "unknown", "unknown", "Electronics lifetime", List.of());
        IdeaObject assumption = obj("a1", "A-001", "assumption", "speculative", "Vacuum holds", List.of());
        IdeaObject dropped = obj("c1", "C-001", "concept", "abandoned", "Monolith bus", List.of());
        IdeaEdge why = new IdeaEdge("ed1", "ws", "br", "R-1", "abandoned-because", "c1", "c1",
                "Could not stay dormant", Instant.now(), null, null);
        String text = ExplorerPosture.appendix("explore", List.of(),
                new GraphService.GraphSnapshot(List.of(thought, unknown, assumption, dropped), List.of(why)));
        assertTrue(text.contains("T-001"));
        assertTrue(text.contains("U-001"));
        assertTrue(text.contains("A-001"));
        assertTrue(text.contains("C-001"));
        assertTrue(text.contains("Could not stay dormant"));
    }

    private static GraphService.GraphSnapshot emptyGraph() {
        return new GraphService.GraphSnapshot(List.of(), List.of());
    }

    private static IdeaObject obj(String id, String displayId, String type, String category, String title,
                                  List<String> tags) {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        return new IdeaObject(id, "ws", "br", displayId, type, "original", null, category, title, title,
                "", 1, null, null, null, null, null, now, now, tags, List.of(), Map.of());
    }
}
