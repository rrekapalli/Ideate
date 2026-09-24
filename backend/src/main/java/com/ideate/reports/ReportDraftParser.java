package com.ideate.reports;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class ReportDraftParser {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Pattern TITLE_LINE = Pattern.compile("(?im)^\\s*TITLE\\s*:\\s*(.+)$");
    private static final Pattern SUMMARY_LINE = Pattern.compile("(?im)^\\s*SUMMARY\\s*:\\s*(.+)$");
    private static final Pattern BODY_MARK = Pattern.compile("(?im)^\\s*BODY\\s*:\\s*$");

    private ReportDraftParser() {}

    static Draft parse(String raw) {
        String text = raw == null ? "" : raw.trim();
        if (text.isEmpty()) {
            return new Draft("Workspace report", "", "The model returned an empty report.");
        }
        Draft fromJson = tryJson(text);
        if (fromJson != null) {
            return fromJson;
        }
        Matcher titleM = TITLE_LINE.matcher(text);
        Matcher summaryM = SUMMARY_LINE.matcher(text);
        String title = titleM.find() ? titleM.group(1).trim() : "";
        String summary = summaryM.find() ? summaryM.group(1).trim() : "";
        String body = text;
        Matcher bodyM = BODY_MARK.matcher(text);
        if (bodyM.find()) {
            body = text.substring(bodyM.end()).trim();
        } else {
            body = stripLabeledHead(text);
        }
        if (title.isBlank()) {
            title = firstHeading(body);
        }
        if (title.isBlank()) {
            title = "Workspace report";
        }
        if (summary.isBlank()) {
            summary = firstParagraph(body);
        }
        if (body.isBlank()) {
            body = text;
        }
        return new Draft(clip(title, 180), clip(summary, 800), body);
    }

    private static Draft tryJson(String text) {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start < 0 || end <= start) {
            return null;
        }
        try {
            JsonNode node = MAPPER.readTree(text.substring(start, end + 1));
            if (!node.hasNonNull("title") && !node.hasNonNull("body")) {
                return null;
            }
            String title = node.path("title").asText("Workspace report");
            String summary = node.path("summary").asText("");
            String body = node.path("body").asText("");
            if (body.isBlank()) {
                return null;
            }
            return new Draft(clip(title, 180), clip(summary, 800), body);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static String stripLabeledHead(String text) {
        String[] lines = text.split("\n", -1);
        int i = 0;
        while (i < lines.length) {
            String line = lines[i].trim();
            if (line.isEmpty()
                    || line.toUpperCase(Locale.ROOT).startsWith("TITLE:")
                    || line.toUpperCase(Locale.ROOT).startsWith("SUMMARY:")) {
                i++;
                continue;
            }
            break;
        }
        StringBuilder sb = new StringBuilder();
        for (; i < lines.length; i++) {
            if (sb.length() > 0) {
                sb.append('\n');
            }
            sb.append(lines[i]);
        }
        return sb.toString().trim();
    }

    private static String firstHeading(String body) {
        for (String line : body.split("\n")) {
            String t = line.trim();
            if (t.startsWith("#")) {
                return t.replaceFirst("^#+\\s*", "").trim();
            }
        }
        return "";
    }

    private static String firstParagraph(String body) {
        String stripped = body.replaceAll("(?m)^#+\\s+.*$", "").trim();
        String[] parts = stripped.split("\\n\\s*\\n", 2);
        String p = parts[0].replaceAll("\\s+", " ").trim();
        return clip(p, 800);
    }

    private static String clip(String value, int max) {
        if (value == null) {
            return "";
        }
        String t = value.replaceAll("\\s+", " ").trim();
        if (t.length() <= max) {
            return t;
        }
        return t.substring(0, max - 1) + "…";
    }

    record Draft(String title, String summary, String body) {}
}
