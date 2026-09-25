package com.ideate.graph;

import java.util.List;

/** User-authored note on a card, separate from title/summary/body. */
public final class CardUserNote {
    public static final String TEXT_KEY = "userNote";
    public static final String INCLUDE_IN_AI_KEY = "includeUserNoteInAi";

    private CardUserNote() {}

    public static String text(IdeaObject node) {
        return node == null ? null : ObjectDetails.text(node.details(), TEXT_KEY);
    }

    public static boolean includeInAi(IdeaObject node) {
        return node != null && ObjectDetails.isTrue(node.details(), INCLUDE_IN_AI_KEY);
    }

    public static void appendOptedIn(StringBuilder sb, List<IdeaObject> nodes, int maxNotes, int maxChars) {
        if (sb == null || nodes == null || nodes.isEmpty() || maxNotes <= 0) {
            return;
        }
        int written = 0;
        StringBuilder block = new StringBuilder();
        for (IdeaObject n : nodes) {
            if (written >= maxNotes) {
                break;
            }
            if (!includeInAi(n)) {
                continue;
            }
            String note = text(n);
            if (note == null) {
                continue;
            }
            if (written == 0) {
                block.append("\nUser notes on cards (the user opted these into this call; use as background):\n");
            }
            block.append("- ").append(n.displayId()).append(": ").append(trim(note, maxChars)).append('\n');
            written++;
        }
        if (written > 0) {
            sb.append(block);
        }
    }

    private static String trim(String value, int max) {
        if (value == null) {
            return "";
        }
        if (max <= 0 || value.length() <= max) {
            return value;
        }
        return value.substring(0, max) + "…";
    }
}
