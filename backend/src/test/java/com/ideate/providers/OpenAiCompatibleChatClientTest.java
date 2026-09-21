package com.ideate.providers;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OpenAiCompatibleChatClientTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void readsObjectAndStringToolArguments() throws Exception {
        var objectArgs = mapper.readTree("{\"name\":\"create_node\",\"arguments\":{\"type\":\"question\",\"title\":\"Add pgvector\"}}");
        assertEquals("{\"type\":\"question\",\"title\":\"Add pgvector\"}",
                OpenAiCompatibleChatClient.readArguments(objectArgs));

        var stringArgs = mapper.readTree("{\"name\":\"create_node\",\"arguments\":\"{\\\"type\\\":\\\"hypothesis\\\"}\"}");
        assertEquals("{\"type\":\"hypothesis\"}", OpenAiCompatibleChatClient.readArguments(stringArgs));
    }
}
