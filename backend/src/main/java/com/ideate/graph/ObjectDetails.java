package com.ideate.graph;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.Map;

public final class ObjectDetails {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<LinkedHashMap<String, Object>> MAP =
            new TypeReference<>() {};

    private ObjectDetails() {}

    public static Map<String, Object> parse(String json) {
        if (json == null || json.isBlank() || "null".equalsIgnoreCase(json.trim())) {
            return new LinkedHashMap<>();
        }
        try {
            LinkedHashMap<String, Object> parsed = MAPPER.readValue(json, MAP);
            return parsed == null ? new LinkedHashMap<>() : parsed;
        } catch (Exception ignored) {
            return new LinkedHashMap<>();
        }
    }

    public static String stringify(Map<String, Object> details) {
        if (details == null || details.isEmpty()) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(details);
        } catch (Exception ignored) {
            return null;
        }
    }

    public static Map<String, Object> merge(Map<String, Object> current, Map<String, Object> patch) {
        Map<String, Object> out = current == null ? new LinkedHashMap<>() : new LinkedHashMap<>(current);
        if (patch != null) {
            out.putAll(patch);
        }
        return out;
    }

    public static boolean isTrue(Map<String, Object> details, String key) {
        if (details == null) {
            return false;
        }
        Object value = details.get(key);
        return Boolean.TRUE.equals(value) || "true".equalsIgnoreCase(String.valueOf(value));
    }

    public static String text(Map<String, Object> details, String key) {
        if (details == null || details.get(key) == null) {
            return null;
        }
        String value = String.valueOf(details.get(key)).trim();
        return value.isEmpty() || "null".equals(value) ? null : value;
    }
}
