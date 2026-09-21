package com.ideate.orchestrator;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChatReplyCleanerTest {

    @Test
    void dropsGraphRecapAndKeepsARealAnswer() {
        String raw = """
                Ice is less dense than liquid water, so it floats.
                The graph includes a question card and a hypothesis.
                {"text":"skip","tools":[{"name":"create_node","args":{}}]}
                """;
        String visible = ChatReplyCleaner.visible(raw);
        assertTrue(visible.toLowerCase().contains("less dense"));
        assertFalse(visible.toLowerCase().contains("the graph includes"));
        assertFalse(visible.contains("create_node"));
    }

    @Test
    void keepsMarkdownStructure() {
        String raw = """
                Ice is **less dense** than water.

                - open crystal
                - same mass, more space

                The graph includes a hypothesis card.
                """;
        String visible = ChatReplyCleaner.visible(raw);
        assertTrue(visible.contains("**less dense**"));
        assertTrue(visible.contains("- open crystal"));
        assertFalse(visible.toLowerCase().contains("the graph includes"));
    }

    @Test
    void fallbackStaysOnTheQuestion() {
        String fb = ChatReplyCleaner.fallback("Why does ice float on water?");
        assertTrue(fb.contains("Why does ice float on water?"));
        assertFalse(fb.toLowerCase().contains("graph"));
    }
}
