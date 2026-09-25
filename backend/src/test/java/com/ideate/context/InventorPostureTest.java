package com.ideate.context;

import com.ideate.graph.GraphService;
import com.ideate.graph.IdeaObject;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;

class InventorPostureTest {

    @Test
    void challengeWalksConstraintsAndForbidsTheoryWithoutEvaluation() {
        IdeaObject constraint = obj("k1", "K-001", "constraint", "speculative", "Battery powered", Map.of("posture", "binding"));
        IdeaObject stale = obj("c1", "CALC-001", "calculation", "active", "Throw image width", Map.of("stale", true));
        String text = InventorPosture.appendix("challenge", List.of(),
                new GraphService.GraphSnapshot(List.of(constraint, stale), List.of()));
        assertTrue(text.contains("K-001"));
        assertTrue(text.contains("CALC-001"));
        assertTrue(text.toLowerCase().contains("never create a theory"));
        assertTrue(text.toLowerCase().contains("walk constraints"));
    }

    private static IdeaObject obj(String id, String displayId, String type, String category, String title,
                                  Map<String, Object> details) {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        return new IdeaObject(id, "ws", "br", displayId, type, "original", null, category, title, title,
                "", 1, null, null, null, null, null, now, now, List.of(), List.of(), details);
    }
}
