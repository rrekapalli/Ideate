package com.ideate.providers;

import java.util.List;

public interface ChatClient {
    String providerId();

    ChatResult complete(ChatRequest request);

    record ChatRequest(String model, String baseUrl, String apiKey, List<Message> messages, int tokenBudget) {}

    record Message(String role, String content) {}

    record ChatResult(String text, List<ToolCall> toolCalls, int inputTokens, int outputTokens, String model, String error) {
        public static ChatResult error(String message) {
            return new ChatResult("", List.of(), 0, 0, null, message);
        }
    }

    record ToolCall(String name, String argumentsJson) {}
}
