package com.ideate.api.dto;

import java.util.List;

public final class ApiDtos {
    private ApiDtos() {}

    public record CreateWorkspaceRequest(String name, String persona) {}

    public record CreateObjectBody(
            String type,
            String title,
            String summary,
            String body,
            String branchId,
            String origin,
            String derivedVia,
            String objectCategory,
            Double canvasX,
            Double canvasY,
            List<String> tags,
            List<String> derivedFrom
    ) {}

    public record UpdateObjectBody(
            String type,
            String title,
            String summary,
            String body,
            String objectCategory,
            Boolean newVersion,
            Double canvasX,
            Double canvasY,
            List<String> tags
    ) {}

    public record CreateEdgeBody(String type, String fromObjectId, String toObjectId, String why, String branchId) {}

    public record TurnBody(String content, String mode, String branchId, String jobClass, List<String> focusObjectIds) {}

    public record JobBody(String jobClass, String mode, String agent, List<String> focusObjectIds) {}

    public record AiSettingsBody(String provider, String model, String ollamaBaseUrl) {}

    public record FolderBody(String name, String parentId) {}

    public record DocumentBody(String folderId, String name, String url, String note) {}

    public record AttachBody(String objectId) {}

    public record BranchBody(String name, String parentBranchId) {}

    public record NewNodeBody(
            String type,
            String title,
            String summary,
            String body,
            List<String> tags
    ) {}
}
