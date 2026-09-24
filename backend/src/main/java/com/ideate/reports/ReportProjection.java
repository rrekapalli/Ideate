package com.ideate.reports;

import com.ideate.graph.GraphService;
import com.ideate.graph.IdeaEdge;
import com.ideate.graph.IdeaObject;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Structured branch graph for a report job. Not the chat ProjectState assembler. */
public final class ReportProjection {
    static final int HARD_CAP_CHARS = 32_000;

    private ReportProjection() {}

    public static String assemble(GraphService.GraphSnapshot graph, String workspaceName, String persona) {
        StringBuilder sb = new StringBuilder();
        sb.append("Workspace: ").append(nullToEmpty(workspaceName)).append('\n');
        sb.append("Persona: ").append(nullToEmpty(persona)).append('\n');
        List<IdeaObject> nodes = graph.nodes() == null ? List.of() : graph.nodes();
        List<IdeaEdge> edges = graph.edges() == null ? List.of() : graph.edges();
        if (nodes.isEmpty()) {
            sb.append("\nThe graph is empty. The report must say exploration has not reached a conclusion.\n");
            return sb.toString();
        }

        Set<String> supportedHypothesisIds = supportedHypothesisIds(nodes, edges);
        Set<String> fullBodyIds = new HashSet<>(supportedHypothesisIds);
        for (IdeaObject n : nodes) {
            if ("theory".equals(n.type()) || "evaluation".equals(n.type())) {
                fullBodyIds.add(n.id());
            }
        }

        List<IdeaObject> ordered = new ArrayList<>(nodes);
        ordered.sort(Comparator.comparingInt(n -> rank(n, supportedHypothesisIds, edges)));

        sb.append("\nCARDS\n");
        for (IdeaObject n : ordered) {
            if (sb.length() > HARD_CAP_CHARS - 800) {
                sb.append("… (remaining cards omitted to stay within the budget; prioritize what is already listed)\n");
                break;
            }
            sb.append("- ").append(n.displayId()).append(" [").append(n.type()).append("] ")
                    .append("category=").append(nullToEmpty(n.objectCategory()))
                    .append(" origin=").append(nullToEmpty(n.origin()))
                    .append('\n');
            sb.append("  title: ").append(trim(n.title(), 180)).append('\n');
            if (n.tags() != null && !n.tags().isEmpty()) {
                sb.append("  tags: ").append(String.join(", ", n.tags())).append('\n');
            }
            if (n.summary() != null && !n.summary().isBlank()) {
                sb.append("  summary: ").append(trim(n.summary(), 400)).append('\n');
            }
            if (fullBodyIds.contains(n.id()) && n.body() != null && !n.body().isBlank()) {
                sb.append("  body: ").append(trim(n.body(), 1800)).append('\n');
            }
        }

        sb.append("\nEDGES\n");
        for (IdeaEdge e : edges) {
            if (sb.length() > HARD_CAP_CHARS - 200) {
                break;
            }
            String from = displayOf(nodes, e.fromObjectId());
            String to = displayOf(nodes, e.toObjectId());
            sb.append("- ").append(from).append(" --").append(e.type()).append("--> ").append(to);
            if (e.why() != null && !e.why().isBlank()) {
                sb.append(" (").append(trim(e.why(), 120)).append(')');
            }
            sb.append('\n');
        }

        String out = sb.toString();
        if (out.length() > HARD_CAP_CHARS) {
            return out.substring(0, HARD_CAP_CHARS);
        }
        return out;
    }

    private static Set<String> supportedHypothesisIds(List<IdeaObject> nodes, List<IdeaEdge> edges) {
        Set<String> evaluationSupported = new HashSet<>();
        for (IdeaObject n : nodes) {
            if ("evaluation".equals(n.type()) && "supported".equals(n.objectCategory())) {
                evaluationSupported.add(n.id());
            }
        }
        Set<String> theoryIds = new HashSet<>();
        for (IdeaObject n : nodes) {
            if ("theory".equals(n.type())) {
                theoryIds.add(n.id());
            }
        }
        Set<String> hyp = new HashSet<>();
        for (IdeaObject n : nodes) {
            if ("hypothesis".equals(n.type()) && "supported".equals(n.objectCategory())) {
                hyp.add(n.id());
            }
        }
        for (IdeaEdge e : edges) {
            if ("evaluated-by".equals(e.type()) && evaluationSupported.contains(e.toObjectId())) {
                hyp.add(e.fromObjectId());
            }
            if ("promoted-to".equals(e.type()) && theoryIds.contains(e.toObjectId())) {
                for (IdeaEdge ev : edges) {
                    if ("evaluated-by".equals(ev.type()) && ev.toObjectId().equals(e.fromObjectId())) {
                        hyp.add(ev.fromObjectId());
                    }
                }
            }
        }
        return hyp;
    }

    private static int rank(IdeaObject n, Set<String> supportedHyp, List<IdeaEdge> edges) {
        String type = n.type() == null ? "" : n.type();
        if ("theory".equals(type)) {
            return 0;
        }
        if ("evaluation".equals(type)) {
            return 1;
        }
        if (supportedHyp.contains(n.id())) {
            return 2;
        }
        boolean contradict = edges.stream().anyMatch(e ->
                "contradicts".equals(e.type())
                        && (n.id().equals(e.fromObjectId()) || n.id().equals(e.toObjectId())));
        if (contradict) {
            return 3;
        }
        if ("unknown".equals(type) || "question".equals(type)) {
            return 4;
        }
        if ("hypothesis".equals(type) || "evidence".equals(type) || "citation".equals(type)) {
            return 5;
        }
        return 6;
    }

    private static String displayOf(List<IdeaObject> nodes, String id) {
        return nodes.stream()
                .filter(n -> n.id().equals(id))
                .map(IdeaObject::displayId)
                .findFirst()
                .orElse(id);
    }

    private static String trim(String value, int max) {
        if (value == null) {
            return "";
        }
        String t = value.replaceAll("\\s+", " ").trim();
        if (t.length() <= max) {
            return t;
        }
        return t.substring(0, max - 1) + "…";
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
