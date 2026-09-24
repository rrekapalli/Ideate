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

    @Test
    void stripsRepeatedLabelsAndPrefersTheQuestion() {
        var draft = ReportDraftParser.parse("""
                TITLE: Question
                SUMMARY: A short lede that should remain.
                BODY:
                **TITLE:** How a Compass Finds North

                TITLE: How a Compass Finds North

                SUMMARY: Repeated summary that belongs in the header, not the body.

                BODY:
                ### Question
                How does a compass find north?

                ## Established Facts
                Water is involved.
                """, "How does a compass find north", "How does a compass find north?");
        assertEquals("How does a compass find north?", draft.title());
        assertTrue(draft.summary().contains("short lede"));
        assertTrue(draft.body().contains("Established Facts"));
        assertTrue(draft.body().contains("Water is involved"));
        org.junit.jupiter.api.Assertions.assertFalse(draft.body().contains("TITLE:"));
        org.junit.jupiter.api.Assertions.assertFalse(draft.body().contains("SUMMARY:"));
        org.junit.jupiter.api.Assertions.assertFalse(draft.body().contains("BODY:"));
    }
}
