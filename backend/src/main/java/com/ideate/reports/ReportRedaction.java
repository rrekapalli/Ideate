package com.ideate.reports;

import com.ideate.graph.GraphService;
import com.ideate.graph.IdeaObject;
import com.ideate.graph.ObjectCatalog;

import java.util.List;

/** Strip do-not-quote card text from generated reports even if the model copied it. */
public final class ReportRedaction {
    private ReportRedaction() {}

    public static String redact(String text, GraphService.GraphSnapshot graph) {
        if (text == null || text.isBlank() || graph == null || graph.nodes() == null) {
            return text;
        }
        String out = text;
        for (IdeaObject n : graph.nodes()) {
            if (!ObjectCatalog.hasTag(n.tags(), ObjectCatalog.TAG_DO_NOT_QUOTE)) {
                continue;
            }
            String marker = n.displayId() + " withheld";
            out = replaceIfPresent(out, n.body(), marker);
            out = replaceIfPresent(out, n.summary(), marker);
            out = replaceIfPresent(out, n.title(), n.displayId() + " withheld");
        }
        return out;
    }

    private static String replaceIfPresent(String haystack, String needle, String replacement) {
        if (needle == null || needle.isBlank() || needle.length() < 4) {
            return haystack;
        }
        return haystack.replace(needle, replacement);
    }
}
