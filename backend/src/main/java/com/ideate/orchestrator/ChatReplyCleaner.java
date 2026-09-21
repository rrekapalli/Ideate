package com.ideate.orchestrator;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.regex.Pattern;

/** Keeps chat text conversational. Graph/tool recap never belongs in the transcript. */
public final class ChatReplyCleaner {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Pattern TOOL_LINE = Pattern.compile(
            "(?im)^\\s*(Create (Node|Edge)|create_node|create_edge|update_node|\\{?\"name\":).*$");
    private static final Pattern GRAPH_META = Pattern.compile(
            "(?i)(the graph includes|the graph has|necessary edges|properly linked|edges connect"
                    + "|updated the (workspace )?graph|displayId|create_node|create_edge"
                    + "|typed cards|JSON object|fromDisplayId)");

    private ChatReplyCleaner() {}

    public static String visible(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        String text = extractJsonText(raw.trim());
        text = TOOL_LINE.matcher(text).replaceAll("");
        text = text.replaceAll("(?s)```(?:json)?\\s*\\{.*?}\\s*```", "");
        StringBuilder keep = new StringBuilder();
        for (String line : text.split("\n", -1)) {
            if (GRAPH_META.matcher(line).find()) {
                continue;
            }
            if (keep.length() > 0) {
                keep.append('\n');
            }
            keep.append(line);
        }
        return keep.toString().replaceAll("\n{3,}", "\n\n").trim();
    }

    public static boolean isUsable(String text) {
        return text != null && !text.isBlank() && !GRAPH_META.matcher(text).find() && text.length() >= 12;
    }

    public static String fallback(String userQuestion) {
        String q = userQuestion == null ? "" : userQuestion.replaceAll("\\s+", " ").trim();
        if (q.length() > 180) {
            q = q.substring(0, 179) + "…";
        }
        if (q.isBlank()) {
            return "Let’s stay with the idea itself — tell me what you want to understand.";
        }
        return "Let’s stay with your question:\n\n**" + q + "**";
    }

    private static String extractJsonText(String raw) {
        int start = raw.indexOf('{');
        if (start < 0 || !raw.contains("\"tools\"")) {
            return raw;
        }
        String prefix = raw.substring(0, start).trim();
        String jsonText = "";
        try {
            JsonNode node = MAPPER.readTree(raw.substring(start));
            if (node.hasNonNull("text")) {
                jsonText = node.path("text").asText("");
            }
        } catch (Exception ignored) {
            return prefix.isBlank() ? raw : prefix;
        }
        if (isUsable(prefix)) {
            return prefix;
        }
        if (isUsable(jsonText)) {
            return jsonText;
        }
        return prefix.isBlank() ? raw : prefix;
    }
}
