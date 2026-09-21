package com.ideate.routing;

import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class JobClassifier {

    public String classify(String mode, String utterance, String requestedClass) {
        if (requestedClass != null && !requestedClass.isBlank()) {
            return requestedClass.toUpperCase(Locale.ROOT);
        }
        String text = (utterance == null ? "" : utterance).toLowerCase(Locale.ROOT);
        String m = mode == null ? "explore" : mode.toLowerCase(Locale.ROOT);
        if (text.contains("title this") || text.contains("tag this") || text.contains("summarize cache")) {
            return "SIMPLE";
        }
        if ("review".equals(m) || text.contains("critically evaluate") || text.contains("entire theory")
                || text.contains("feasibility of the whole")) {
            return "DEEP";
        }
        if (text.contains("overnight") || text.contains("batch") || text.contains("investigate for hours")) {
            return "BATCH";
        }
        return "NORMAL";
    }
}
