package com.ideate.graph;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CardUserNoteTest {

    @Test
    void appendsOnlyOptedInNotes() {
        IdeaObject kept = obj("h1", "H-001", Map.of(
                CardUserNote.TEXT_KEY, "Check willingness to pay",
                CardUserNote.INCLUDE_IN_AI_KEY, true));
        IdeaObject skipped = obj("h2", "H-002", Map.of(
                CardUserNote.TEXT_KEY, "Private aside",
                CardUserNote.INCLUDE_IN_AI_KEY, false));
        StringBuilder sb = new StringBuilder("head\n");
        CardUserNote.appendOptedIn(sb, List.of(kept, skipped), 8, 80);
        String out = sb.toString();
        assertTrue(out.contains("H-001: Check willingness to pay"));
        assertFalse(out.contains("Private aside"));
        assertTrue(out.contains("opted these into this call"));
    }

    @Test
    void skipsBlankAndMissingNotes() {
        IdeaObject empty = obj("q1", "Q-001", Map.of(CardUserNote.INCLUDE_IN_AI_KEY, true));
        StringBuilder sb = new StringBuilder();
        CardUserNote.appendOptedIn(sb, List.of(empty), 8, 80);
        assertTrue(sb.isEmpty());
    }

    private static IdeaObject obj(String id, String displayId, Map<String, Object> details) {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        return new IdeaObject(id, "ws", "br", displayId, "hypothesis", "original", null, "active",
                displayId, "", "", 1, null, null, null, null, null, now, now, List.of(), List.of(), details);
    }
}
