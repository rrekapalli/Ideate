package com.ideate.context;

import com.ideate.graph.GraphService;
import com.ideate.graph.IdeaObject;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;

class AnalystPostureTest {

    @Test
    void indexesBetsAndForbidsQuotingPrivateNotes() {
        IdeaObject bet = obj("h1", "H-001", "hypothesis", "active", "They will pay for Y", List.of());
        IdeaObject quote = obj("e1", "E-001", "evidence", "active", "Raw quote", List.of("heard", "do-not-quote"));
        String text = AnalystPosture.appendix("challenge", List.of(),
                new GraphService.GraphSnapshot(List.of(bet, quote), List.of()));
        assertTrue(text.contains("H-001"));
        assertTrue(text.contains("do-not-quote=withheld"));
        assertTrue(text.toLowerCase().contains("never copy"));
        assertTrue(text.toLowerCase().contains("pressure"));
    }

    private static IdeaObject obj(String id, String displayId, String type, String category, String title,
                                  List<String> tags) {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        return new IdeaObject(id, "ws", "br", displayId, type, "original", null, category, title, title,
                "secret quote body", 1, null, null, null, null, null, now, now, tags, List.of(), Map.of());
    }
}
