package com.ideate.graph;

import java.time.Instant;
import java.util.List;

public record IdeaObject(
        String id,
        String workspaceId,
        String branchId,
        String displayId,
        String type,
        String origin,
        String derivedVia,
        String objectCategory,
        String title,
        String summary,
        String body,
        int version,
        String generatedBy,
        String sourceUserMessageId,
        String sourceAssistantMessageId,
        Double canvasX,
        Double canvasY,
        Instant createdAt,
        Instant updatedAt,
        List<String> tags,
        List<String> derivedFrom
) {}
