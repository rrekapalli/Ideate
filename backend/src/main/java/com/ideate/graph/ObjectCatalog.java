package com.ideate.graph;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

public final class ObjectCatalog {
    private ObjectCatalog() {}

    public static final Set<String> PERSONAS = Set.of(
            "student", "researcher", "inventor", "analyst", "explorer");

    public static final Set<String> CATEGORIES = Set.of(
            "active", "abandoned", "misconception", "supported", "speculative", "unknown");

    public static final Set<String> ORIGINS = Set.of("original", "derived");

    public static final Set<String> EDGE_TYPES = Set.of(
            "mentions", "parent-of", "supports", "contradicts", "assumes", "tested-by",
            "evaluated-by", "promoted-to", "produces", "affects", "solves", "introduces",
            "led-to", "version-of", "abandoned-because", "resurrected-as", "constrains",
            "calculated-from", "represented-by", "reused-in", "derived-from", "split-from",
            "merged-from", "merged-into", "overlay-on", "branched-from");

    public static final Set<String> NODE_TYPES = Set.of(
            "thought", "concept", "unknown", "question", "hypothesis", "assumption",
            "evidence", "experiment", "observation", "claim", "critique", "decision",
            "evaluation", "theory", "misconception", "constraint", "calculation",
            "target", "design_artifact", "architecture", "component", "citation");

    private static final Map<String, String> PREFIXES = new LinkedHashMap<>();

    static {
        PREFIXES.put("thought", "T");
        PREFIXES.put("concept", "C");
        PREFIXES.put("unknown", "U");
        PREFIXES.put("question", "Q");
        PREFIXES.put("hypothesis", "H");
        PREFIXES.put("assumption", "A");
        PREFIXES.put("evidence", "E");
        PREFIXES.put("experiment", "X");
        PREFIXES.put("observation", "O");
        PREFIXES.put("claim", "CL");
        PREFIXES.put("critique", "CR");
        PREFIXES.put("decision", "D");
        PREFIXES.put("evaluation", "EV");
        PREFIXES.put("theory", "TH");
        PREFIXES.put("misconception", "M");
        PREFIXES.put("constraint", "K");
        PREFIXES.put("calculation", "CALC");
        PREFIXES.put("target", "TG");
        PREFIXES.put("design_artifact", "DA");
        PREFIXES.put("architecture", "AR");
        PREFIXES.put("component", "CM");
        PREFIXES.put("citation", "CIT");
    }

    public static String prefix(String type) {
        String prefix = PREFIXES.get(type);
        if (prefix == null) {
            throw new IllegalArgumentException("Unknown object type: " + type);
        }
        return prefix;
    }

    public static void requireNodeType(String type) {
        if (!NODE_TYPES.contains(type)) {
            throw new IllegalArgumentException("Unknown object type: " + type);
        }
    }

    public static void requireEdgeType(String type) {
        if (!EDGE_TYPES.contains(type)) {
            throw new IllegalArgumentException("Unknown edge type: " + type);
        }
    }

    public static void requirePersona(String persona) {
        if (!PERSONAS.contains(persona)) {
            throw new IllegalArgumentException("Persona is required and must be one of " + PERSONAS);
        }
    }

    public static boolean isLegalPromotion(String fromType, String toType) {
        if ("theory".equals(toType) && !"evaluation".equals(fromType) && !"theory".equals(fromType)) {
            return false;
        }
        return NODE_TYPES.contains(toType);
    }
}
