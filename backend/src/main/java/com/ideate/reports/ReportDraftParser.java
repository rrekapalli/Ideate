package com.ideate.reports;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class ReportDraftParser {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Pattern LABEL_LINE = Pattern.compile(
            "(?im)^\\s*(?:\\*{1,2}|_{1,2}|#{1,6}\\s*)?(TITLE|SUMMARY|BODY)\\s*:\\s*(.*)$");
    private static final Pattern WEAK_TITLE = Pattern.compile(
            "(?i)^(title|question|report|workspace report|untitled|body|summary|markdown report)$");

    private ReportDraftParser() {}

    static Draft parse(String raw) {
        return parse(raw, null, null);
    }

    static Draft parse(String raw, String workspaceName, String questionTitle) {
        String text = raw == null ? "" : raw.trim();
        if (text.isEmpty()) {
            return new Draft(fallbackTitle(null, workspaceName, questionTitle), "", "The model returned an empty report.");
        }
        Draft fromJson = tryJson(text);
        if (fromJson != null) {
            return finish(fromJson, workspaceName, questionTitle);
        }
        String title = labeledOneline(text, "TITLE");
        String summary = labeledBlock(text, "SUMMARY");
        String body = afterBody(text);
        body = stripLabelLines(body);
        body = stripLeadingDuplicateHeading(body, title);
        if (title.isBlank()) {
            title = firstHeading(body);
        }
        if (summary.isBlank()) {
            summary = firstParagraph(body);
        }
        if (body.isBlank()) {
            body = stripLabelLines(text);
        }
        return finish(new Draft(title, summary, body), workspaceName, questionTitle);
    }

    private static Draft finish(Draft draft, String workspaceName, String questionTitle) {
        String title = pickTitle(draft.title(), draft.body(), workspaceName, questionTitle);
        String body = stripLeadingDuplicateHeading(stripLabelLines(draft.body()), title);
        String summary = draft.summary();
        if (summary.isBlank()) {
            summary = firstParagraph(body);
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
            String title = node.path("title").asText("");
            String summary = node.path("summary").asText("");
            String body = node.path("body").asText("");
            if (body.isBlank()) {
                return null;
            }
            return new Draft(title, summary, body);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static String labeledOneline(String text, String label) {
        Matcher m = LABEL_LINE.matcher(text);
        while (m.find()) {
            if (m.group(1).equalsIgnoreCase(label)) {
                String value = unwrap(m.group(2));
                if (!value.isBlank()) {
                    return value;
                }
            }
        }
        return "";
    }

    private static String labeledBlock(String text, String label) {
        Matcher m = LABEL_LINE.matcher(text);
        int start = -1;
        int contentFrom = -1;
        while (m.find()) {
            if (m.group(1).equalsIgnoreCase(label)) {
                start = m.start();
                contentFrom = m.start(2);
                break;
            }
        }
        if (start < 0) {
            return "";
        }
        Matcher next = LABEL_LINE.matcher(text);
        int end = text.length();
        while (next.find()) {
            if (next.start() > start) {
                end = next.start();
                break;
            }
        }
        return unwrap(text.substring(contentFrom, end)).trim();
    }

    private static String afterBody(String text) {
        Matcher m = LABEL_LINE.matcher(text);
        while (m.find()) {
            if (!m.group(1).equalsIgnoreCase("BODY")) {
                continue;
            }
            String sameLine = unwrap(m.group(2));
            String rest = text.substring(m.end()).trim();
            if (sameLine.isBlank()) {
                return rest;
            }
            return (sameLine + "\n" + rest).trim();
        }
        return stripLabelLines(text);
    }

    static String stripLabelLines(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (String line : text.split("\n", -1)) {
            Matcher m = LABEL_LINE.matcher(line);
            if (m.matches()) {
                String leftover = unwrap(m.group(2));
                if ("BODY".equalsIgnoreCase(m.group(1)) && !leftover.isBlank()) {
                    if (sb.length() > 0) {
                        sb.append('\n');
                    }
                    sb.append(leftover);
                }
                continue;
            }
            if (sb.length() > 0) {
                sb.append('\n');
            }
            sb.append(line);
        }
        return sb.toString().trim();
    }

    static String stripLeadingDuplicateHeading(String body, String title) {
        if (body == null || body.isBlank()) {
            return "";
        }
        String[] lines = body.split("\n", -1);
        int i = 0;
        while (i < lines.length && lines[i].isBlank()) {
            i++;
        }
        if (i >= lines.length) {
            return "";
        }
        String heading = lines[i].trim().replaceFirst("^#+\\s*", "").trim();
        heading = unwrap(heading);
        if (sameTitle(heading, title) || WEAK_TITLE.matcher(heading).matches()) {
            i++;
            while (i < lines.length && lines[i].isBlank()) {
                i++;
            }
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

    static String pickTitle(String parsed, String body, String workspaceName, String questionTitle) {
        String[] candidates = { questionTitle, workspaceName, parsed };
        for (String candidate : candidates) {
            if (isStrongTitle(candidate)) {
                return candidate.trim();
            }
        }
        String heading = firstHeading(body);
        if (isStrongTitle(heading) && heading.contains("?")) {
            return heading.trim();
        }
        return fallbackTitle(parsed, workspaceName, questionTitle);
    }

    private static String fallbackTitle(String parsed, String workspaceName, String questionTitle) {
        if (hasText(questionTitle)) {
            return questionTitle.trim();
        }
        if (hasText(workspaceName)) {
            return workspaceName.trim();
        }
        if (hasText(parsed)) {
            return parsed.trim();
        }
        return "Workspace report";
    }

    static boolean isStrongTitle(String value) {
        if (!hasText(value)) {
            return false;
        }
        String t = unwrap(value.trim());
        if (t.length() < 8 && !t.contains("?")) {
            return false;
        }
        return !WEAK_TITLE.matcher(t).matches();
    }

    private static String firstHeading(String body) {
        if (body == null) {
            return "";
        }
        for (String line : body.split("\n")) {
            String t = line.trim();
            if (t.startsWith("#")) {
                return unwrap(t.replaceFirst("^#+\\s*", "").trim());
            }
        }
        return "";
    }

    private static String firstParagraph(String body) {
        if (body == null) {
            return "";
        }
        String stripped = body.replaceAll("(?m)^#+\\s+.*$", "").trim();
        String[] parts = stripped.split("\\n\\s*\\n", 2);
        String p = parts[0].replaceAll("\\s+", " ").trim();
        return clip(p, 800);
    }

    private static String unwrap(String value) {
        if (value == null) {
            return "";
        }
        String t = value.trim();
        t = t.replaceAll("^\\*{1,2}\\s*|\\s*\\*{1,2}$", "");
        t = t.replaceAll("^_{1,2}\\s*|\\s*_{1,2}$", "");
        t = t.replaceAll("^`+|`+$", "");
        return t.trim();
    }

    private static boolean sameTitle(String a, String b) {
        if (!hasText(a) || !hasText(b)) {
            return false;
        }
        return unwrap(a).equalsIgnoreCase(unwrap(b));
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
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
