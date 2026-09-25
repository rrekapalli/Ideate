package com.ideate.context;

import com.ideate.graph.GraphService;
import com.ideate.graph.IdeaEdge;
import com.ideate.graph.IdeaObject;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StudentPostureTest {

    @Test
    void learnWithoutFocusDoesNotMintACurriculum() {
        String text = StudentPosture.appendix("learn", List.of(), emptyGraph());
        assertTrue(text.toLowerCase().contains("ask which concept"));
        assertTrue(text.toLowerCase().contains("do not invent a second course")
                || text.toLowerCase().contains("do not invent a parallel course"));
        assertTrue(text.toLowerCase().contains("mint a curriculum"));
    }

    @Test
    void explainNamesUpdateNodeOnTheFocusedId() {
        String text = StudentPosture.modePosture("explain", List.of("obj_concept_1"));
        assertTrue(text.contains("update_node"));
        assertTrue(text.contains("obj_concept_1"));
        assertTrue(text.contains("create_node"));
        assertTrue(text.toLowerCase().contains("do not create_node"));
    }

    @Test
    void indexIncludesAbandonedMisconceptions() {
        IdeaObject live = obj("m1", "M-001", "misconception", "misconception", "Orbits need thrust", List.of());
        IdeaObject dropped = obj("m2", "M-002", "misconception", "abandoned", "Used to think the sky is a dome", List.of());
        IdeaObject concept = obj("c1", "C-001", "concept", "active", "Orbit", List.of());
        String text = StudentPosture.appendix("learn", List.of(),
                new GraphService.GraphSnapshot(List.of(live, dropped, concept), List.of()));
        assertTrue(text.contains("M-002"));
        assertTrue(text.contains("C-001"));
        assertTrue(text.contains("history"));
    }

    @Test
    void openUnknownsSkipThoseWithExampleNeighbors() {
        IdeaObject open = obj("u1", "U-001", "unknown", "unknown", "Why night?", List.of());
        IdeaObject closed = obj("u2", "U-002", "unknown", "unknown", "Why seasons?", List.of());
        IdeaObject example = obj("e1", "E-001", "evidence", "speculative", "Worked example", List.of("example"));
        IdeaEdge link = new IdeaEdge("ed1", "ws", "br", "R-1", "derived-from", "e1", "u2", "example", Instant.now());
        List<IdeaObject> found = StudentPosture.openUnknowns(List.of(open, closed, example), List.of(link));
        assertTrue(found.stream().anyMatch(n -> "u1".equals(n.id())));
        assertFalse(found.stream().anyMatch(n -> "u2".equals(n.id())));
    }

    private static GraphService.GraphSnapshot emptyGraph() {
        return new GraphService.GraphSnapshot(List.of(), List.of());
    }

    private static IdeaObject obj(String id, String displayId, String type, String category, String title,
                                  List<String> tags) {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        return new IdeaObject(id, "ws", "br", displayId, type, "original", null, category, title, title,
                "", 1, null, null, null, null, null, now, now, tags, List.of());
    }
}
