package com.ideate.graph;

import java.time.Instant;

public record IdeaEdge(
        String id,
        String workspaceId,
        String branchId,
        String displayId,
        String type,
        String fromObjectId,
        String toObjectId,
        String why,
        Instant createdAt
) {}
