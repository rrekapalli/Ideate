package com.ideate.documents;

import com.ideate.Ids;
import com.ideate.graph.GraphService;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
public class DocumentService {
    private final JdbcTemplate jdbc;
    private final GraphService graphService;

    public DocumentService(JdbcTemplate jdbc, GraphService graphService) {
        this.jdbc = jdbc;
        this.graphService = graphService;
    }

    public List<Folder> folders(String workspaceId) {
        return jdbc.query("""
                SELECT * FROM document_folder WHERE workspace_id = ? ORDER BY name
                """, (rs, i) -> new Folder(rs.getString("id"), rs.getString("parent_id"), rs.getString("name")),
                workspaceId);
    }

    public List<Item> items(String workspaceId) {
        return jdbc.query("""
                SELECT * FROM document_item WHERE workspace_id = ? ORDER BY name
                """, (rs, i) -> new Item(
                rs.getString("id"),
                rs.getString("folder_id"),
                rs.getString("name"),
                rs.getString("url"),
                rs.getString("note"),
                rs.getTimestamp("created_at").toInstant()
        ), workspaceId);
    }

    public Folder createFolder(String workspaceId, String name, String parentId) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Folder name is required");
        }
        String id = Ids.id("docf_");
        jdbc.update("INSERT INTO document_folder (id, workspace_id, parent_id, name) VALUES (?,?,?,?)",
                id, workspaceId, parentId, name.trim());
        return new Folder(id, parentId, name.trim());
    }

    public Item createItem(String workspaceId, String folderId, String name, String url, String note) {
        if (name == null || name.isBlank() || url == null || url.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document name and URL are required");
        }
        String id = Ids.id("doci_");
        jdbc.update("""
                INSERT INTO document_item (id, workspace_id, folder_id, name, url, note)
                VALUES (?,?,?,?,?,?)
                """, id, workspaceId, folderId, name.trim(), url.trim(), note);
        return new Item(id, folderId, name.trim(), url.trim(), note, Instant.now());
    }

    public String attachToCard(String workspaceId, String itemId, String objectId) {
        Item item = items(workspaceId).stream().filter(i -> i.id().equals(itemId)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        var evidence = graphService.createObject(workspaceId, null, new GraphService.CreateObjectRequest(
                "evidence",
                item.name(),
                item.note() == null ? item.url() : item.note(),
                "Attached from Documents: " + item.url(),
                null, "original", null, "active",
                "user", null, null, null, null,
                List.of("attachment"),
                objectId == null ? List.of() : List.of(objectId),
                null
        ));
        if (objectId != null) {
            graphService.createEdge(workspaceId, new GraphService.CreateEdgeRequest(
                    "represented-by", objectId, evidence.id(), "document attachment",
                    null, null, null, null, null
            ));
        }
        return evidence.id();
    }

    public void deleteFolder(String workspaceId, String folderId) {
        boolean exists = folders(workspaceId).stream().anyMatch((f) -> f.id().equals(folderId));
        if (!exists) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found");
        }
        folders(workspaceId).stream()
                .filter((f) -> folderId.equals(f.parentId()))
                .forEach((child) -> deleteFolder(workspaceId, child.id()));
        jdbc.update("DELETE FROM document_item WHERE workspace_id = ? AND folder_id = ?", workspaceId, folderId);
        jdbc.update("DELETE FROM document_folder WHERE workspace_id = ? AND id = ?", workspaceId, folderId);
    }

    public void deleteItem(String workspaceId, String itemId) {
        int n = jdbc.update("DELETE FROM document_item WHERE workspace_id = ? AND id = ?", workspaceId, itemId);
        if (n == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }
    }

    public record Folder(String id, String parentId, String name) {}

    public record Item(String id, String folderId, String name, String url, String note, Instant createdAt) {}
}
