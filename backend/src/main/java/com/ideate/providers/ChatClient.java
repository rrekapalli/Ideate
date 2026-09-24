package com.ideate.providers;

import java.util.List;

public interface ChatClient {
    String providerId();

    ChatResult complete(ChatRequest request);

    record ChatRequest(String model, String baseUrl, String apiKey, List<Message> messages, int tokenBudget, boolean enableTools) {
        public ChatRequest(String model, String baseUrl, String apiKey, List<Message> messages, int tokenBudget) {
            this(model, baseUrl, apiKey, messages, tokenBudget, true);
        }
    }

    record ContentPart(String type, String text, String mimeType, String dataBase64) {
        public static ContentPart text(String text) {
            return new ContentPart("text", text, null, null);
        }

        public static ContentPart image(String mimeType, String dataBase64) {
            return new ContentPart("image", null, mimeType, dataBase64);
        }
    }

    record Message(String role, String content, List<ContentPart> parts) {
        public Message(String role, String content) {
            this(role, content, null);
        }

        public boolean multimodal() {
            return parts != null && !parts.isEmpty();
        }
    }

    record ChatResult(String text, List<ToolCall> toolCalls, int inputTokens, int outputTokens, String model, String error) {
        public static ChatResult error(String message) {
            return new ChatResult("", List.of(), 0, 0, null, message);
        }
    }

    record ToolCall(String name, String argumentsJson) {}
}
