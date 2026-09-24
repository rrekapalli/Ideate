package com.ideate.providers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ideate.orchestrator.ChatReplyCleaner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class OpenAiCompatibleChatClient implements ChatClient {
    private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleChatClient.class);
    private final ObjectMapper mapper;
    private final RestClient rest;

    public OpenAiCompatibleChatClient(ObjectMapper mapper) {
        this.mapper = mapper;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(12));
        factory.setReadTimeout(Duration.ofSeconds(240));
        this.rest = RestClient.builder().requestFactory(factory).build();
    }

    @Override
    public String providerId() {
        return "openai-compatible";
    }

    @Override
    public ChatResult complete(ChatRequest request) {
        try {
            String url = trimSlash(request.baseUrl()) + "/v1/chat/completions";
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", request.model());
            body.put("temperature", 0.2);
            if (request.tokenBudget() > 0) {
                body.put("max_tokens", Math.min(request.tokenBudget(), 8192));
            }
            List<Map<String, Object>> messages = new ArrayList<>();
            for (Message m : request.messages()) {
                messages.add(encodeMessage(m));
            }
            body.put("messages", messages);
            if (request.enableTools()) {
                body.put("tools", toolSchema());
                body.put("tool_choice", "auto");
            }
            body.put("think", false);

            var spec = rest.post().uri(url).contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON, MediaType.APPLICATION_OCTET_STREAM, MediaType.ALL);
            if (request.apiKey() != null && !request.apiKey().isBlank()) {
                spec = spec.header("Authorization", "Bearer " + request.apiKey());
            }
            String raw = spec.body(body).exchange((req, res) -> {
                byte[] bytes = res.getBody().readAllBytes();
                String text = bytes == null ? "" : new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
                if (res.getStatusCode().isError()) {
                    throw new IllegalStateException("Provider HTTP " + res.getStatusCode().value() + ": " + text);
                }
                return text;
            });
            if (raw == null || raw.isBlank()) {
                return ChatResult.error("The model returned an empty response.");
            }
            JsonNode root = mapper.readTree(raw);
            JsonNode choice = root.path("choices").path(0);
            JsonNode message = choice.path("message");
            String text = message.path("content").asText("");
            int inTok = root.path("usage").path("prompt_tokens").asInt(0);
            int outTok = root.path("usage").path("completion_tokens").asInt(0);
            List<ToolCall> tools = parseOfficialToolCalls(message);
            if (tools.isEmpty()) {
                tools = parseEmbeddedTools(text);
            }
            if (tools.isEmpty()) {
                tools = parseMarkdownTools(text);
            }
            String visible = ChatReplyCleaner.visible(text);
            return new ChatResult(visible, tools, inTok, outTok, request.model(), null);
        } catch (Exception ex) {
            log.warn("Chat completion failed: {}", ex.getMessage());
            return ChatResult.error(ex.getMessage());
        }
    }

    private List<Map<String, Object>> toolSchema() {
        return List.of(
                fn("create_node", Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "type", Map.of("type", "string"),
                                "title", Map.of("type", "string"),
                                "summary", Map.of("type", "string"),
                                "body", Map.of(
                                        "type", "string",
                                        "description",
                                        "Markdown essay. When a mechanism, sequence, comparison, or structure is clearer as a picture, include one mermaid fence (flowchart, sequenceDiagram, or stateDiagram-v2). Summary stays prose."
                                )
                        ),
                        "required", List.of("type", "title"))),
                fn("create_edge", Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "type", Map.of("type", "string"),
                                "fromDisplayId", Map.of("type", "string"),
                                "toDisplayId", Map.of("type", "string"),
                                "why", Map.of("type", "string")
                        ),
                        "required", List.of("fromDisplayId", "toDisplayId"))),
                fn("update_node", Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "displayId", Map.of("type", "string"),
                                "summary", Map.of("type", "string"),
                                "body", Map.of(
                                        "type", "string",
                                        "description",
                                        "Markdown essay. When a mechanism, sequence, comparison, or structure is clearer as a picture, include one mermaid fence (flowchart, sequenceDiagram, or stateDiagram-v2). Summary stays prose."
                                ),
                                "title", Map.of("type", "string")
                        ),
                        "required", List.of("displayId"))),
                fn("start_evaluation", Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "hypothesisDisplayId", Map.of("type", "string"),
                                "title", Map.of("type", "string"),
                                "body", Map.of("type", "string")
                        ),
                        "required", List.of("hypothesisDisplayId"))),
                fn("propose_theory", Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "evaluationDisplayId", Map.of("type", "string"),
                                "title", Map.of("type", "string"),
                                "body", Map.of("type", "string")
                        ),
                        "required", List.of("evaluationDisplayId")))
        );
    }

    private static Map<String, Object> encodeMessage(Message m) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("role", m.role());
        if (!m.multimodal()) {
            row.put("content", m.content() == null ? "" : m.content());
            return row;
        }
        List<Map<String, Object>> parts = new ArrayList<>();
        if (m.content() != null && !m.content().isBlank()) {
            parts.add(Map.of("type", "text", "text", m.content()));
        }
        for (ContentPart part : m.parts()) {
            if ("image".equals(part.type()) && part.dataBase64() != null) {
                String mime = part.mimeType() == null || part.mimeType().isBlank() ? "image/png" : part.mimeType();
                parts.add(Map.of(
                        "type", "image_url",
                        "image_url", Map.of("url", "data:" + mime + ";base64," + part.dataBase64())
                ));
            } else if (part.text() != null && !part.text().isBlank()) {
                parts.add(Map.of("type", "text", "text", part.text()));
            }
        }
        row.put("content", parts);
        return row;
    }

    private static Map<String, Object> fn(String name, Map<String, Object> parameters) {
        return Map.of("type", "function", "function", Map.of("name", name, "parameters", parameters));
    }

    private List<ToolCall> parseOfficialToolCalls(JsonNode message) {
        List<ToolCall> calls = new ArrayList<>();
        JsonNode toolCalls = message.path("tool_calls");
        if (!toolCalls.isArray()) {
            return calls;
        }
        for (JsonNode tc : toolCalls) {
            JsonNode fn = tc.path("function");
            String name = fn.path("name").asText();
            String args = readArguments(fn);
            if (name != null && !name.isBlank()) {
                calls.add(new ToolCall(name, args));
            }
        }
        return calls;
    }

    static String readArguments(JsonNode function) {
        JsonNode args = function.path("arguments");
        if (args.isMissingNode() || args.isNull()) {
            args = function.path("parameters");
        }
        if (args.isMissingNode() || args.isNull()) {
            args = function.path("args");
        }
        if (args.isObject() || args.isArray()) {
            return args.toString();
        }
        String text = args.asText("");
        return text == null || text.isBlank() ? "{}" : text;
    }

    private List<ToolCall> parseMarkdownTools(String text) {
        List<ToolCall> calls = new ArrayList<>();
        if (text == null) {
            return calls;
        }
        java.util.regex.Matcher nodes = java.util.regex.Pattern
                .compile("Create Node:.*?\\[(\\w+)\\][^\\n]*?::\\s*(.+)")
                .matcher(text);
        while (nodes.find()) {
            String type = nodes.group(1).toLowerCase();
            String title = nodes.group(2).trim();
            calls.add(new ToolCall("create_node",
                    "{\"type\":\"" + type + "\",\"title\":" + jsonString(title) + "}"));
        }
        java.util.regex.Matcher edges = java.util.regex.Pattern
                .compile("Create Edge:\\s*(\\S+)\\s*->\\s*(\\S+)")
                .matcher(text);
        while (edges.find()) {
            calls.add(new ToolCall("create_edge",
                    "{\"type\":\"mentions\",\"fromDisplayId\":" + jsonString(edges.group(1))
                            + ",\"toDisplayId\":" + jsonString(edges.group(2)) + "}"));
        }
        return calls;
    }

    private static String jsonString(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private List<ToolCall> parseEmbeddedTools(String text) {
        List<ToolCall> calls = new ArrayList<>();
        if (text == null) {
            return calls;
        }
        try {
            int start = text.indexOf('{');
            int end = text.lastIndexOf('}');
            if (start < 0 || end <= start) {
                return calls;
            }
            JsonNode node = mapper.readTree(text.substring(start, end + 1));
            JsonNode tools = node.path("tools");
            if (tools.isArray()) {
                for (JsonNode t : tools) {
                    calls.add(new ToolCall(t.path("name").asText(), t.path("args").toString()));
                }
            }
        } catch (Exception ignored) {
            // conversational text without JSON is fine
        }
        return calls;
    }

    private static String trimSlash(String url) {
        if (url == null) {
            return "";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
