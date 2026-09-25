package com.ideate.reports;

import com.ideate.graph.GraphService;
import com.ideate.graph.IdeaObject;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ReportRedactionTest {

    @Test
    void projectionWithholdsDoNotQuoteBodiesAndNamesThePin() {
        IdeaObject problem = obj("q1", "Q-001", "question", "Who is this for?", "The market problem", List.of());
        IdeaObject quote = obj("e1", "E-001", "evidence", "I would never tell my boss", "secret interview line",
                List.of("heard", "do-not-quote"));
        String text = ReportProjection.assemble(
                new GraphService.GraphSnapshot(List.of(problem, quote), List.of()),
                "RxFolio",
                "analyst",
                "q1");
        assertTrue(text.contains("Pinned problem: Q-001"));
        assertTrue(text.contains("do-not-quote"));
        assertTrue(text.contains("withheld"));
        assertFalse(text.contains("secret interview line"));
        assertFalse(text.contains("I would never tell my boss"));
    }

    @Test
    void exportRedactionStripsCopiedQuotes() {
        IdeaObject quote = obj("e1", "E-001", "evidence", "I would never tell my boss", "secret interview line",
                List.of("do-not-quote"));
        String redacted = ReportRedaction.redact(
                "We heard: I would never tell my boss. secret interview line",
                new GraphService.GraphSnapshot(List.of(quote), List.of()));
        assertTrue(redacted.contains("E-001 withheld"));
        assertFalse(redacted.contains("I would never tell my boss"));
        assertFalse(redacted.contains("secret interview line"));
    }

    private static IdeaObject obj(String id, String displayId, String type, String title, String body,
                                  List<String> tags) {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        return new IdeaObject(id, "ws", "br", displayId, type, "original", null, "active", title, title,
                body, 1, null, null, null, null, null, now, now, tags, List.of(), Map.of());
    }
}
