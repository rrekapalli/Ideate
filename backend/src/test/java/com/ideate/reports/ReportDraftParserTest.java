package com.ideate.reports;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ReportDraftParserTest {

    @Test
    void labeledShape() {
        var draft = ReportDraftParser.parse("""
                TITLE: Ice floats
                SUMMARY: Density is lower in the solid.
                BODY:
                # Ice floats
                Water expands as it freezes.
                """);
        assertEquals("Ice floats", draft.title());
        assertTrue(draft.summary().contains("Density"));
        assertTrue(draft.body().contains("Water expands"));
    }

    @Test
    void jsonShape() {
        var draft = ReportDraftParser.parse("""
                {"title":"A","summary":"B","body":"## C\\nFacts."}
                """);
        assertEquals("A", draft.title());
        assertEquals("B", draft.summary());
        assertTrue(draft.body().contains("Facts"));
    }
}
