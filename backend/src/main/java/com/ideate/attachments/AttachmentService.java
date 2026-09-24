package com.ideate.attachments;

import com.ideate.Ids;
import com.ideate.IdeateProperties;
import com.ideate.providers.ChatClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

@Service
public class AttachmentService {
    private static final Logger log = LoggerFactory.getLogger(AttachmentService.class);
    private static final int MAX_BATCH = 8;
    private static final long VISION_MAX_BYTES = 4L * 1024 * 1024;
    private static final int VISION_MAX_IMAGES = 3;
    private static final Set<String> ALLOWED_EXT = Set.of(
            "png", "jpg", "jpeg", "gif", "webp",
            "pdf", "docx", "txt", "csv", "md", "markdown", "text",
            "xlsx", "pptx"
    );

    private final JdbcTemplate jdbc;
    private final IdeateProperties properties;

    public AttachmentService(JdbcTemplate jdbc, IdeateProperties properties) {
        this.jdbc = jdbc;
        this.properties = properties;
    }

    public Attachment upload(String workspaceId, String objectId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A file is required");
        }
        String original = sanitizeName(file.getOriginalFilename());
        String ext = AttachmentTextExtractor.extension(original);
        if (!ALLOWED_EXT.contains(ext)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File type not allowed: " + ext);
        }
        long max = properties.getStorage().getMaxFileBytes();
        if (file.getSize() > max) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "File exceeds " + max + " bytes");
        }
        if (objectId != null && !objectId.isBlank()) {
            requireObject(workspaceId, objectId);
        } else {
            objectId = null;
        }
        String id = Ids.id("att_");
        String storageKey = storageKeyFor(workspaceId, objectId, id, original);
        Path dest = resolveKey(storageKey);
        try {
            Files.createDirectories(dest.getParent());
            file.transferTo(dest);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store file");
        }
        String contentType = file.getContentType() == null || file.getContentType().isBlank()
                ? guessMime(ext)
                : file.getContentType();
        var extract = AttachmentTextExtractor.extract(dest, original, contentType);
        Instant now = Instant.now();
        try {
            jdbc.update("""
                    INSERT INTO attachment (
                        id, workspace_id, object_id, original_name, content_type, byte_size,
                        storage_key, extract_text, extract_status, created_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?)
                    """,
                    id, workspaceId, objectId, original, contentType, file.getSize(),
                    storageKey, extract.text(), extract.status(), Timestamp.from(now));
        } catch (RuntimeException ex) {
            deleteQuietly(dest);
            throw ex;
        }
        if (objectId != null) {
            recordEvent(workspaceId, objectId, "attachment.added", Map.of("attachmentId", id, "name", original));
        }
        return get(workspaceId, id);
    }

    public List<Attachment> list(String workspaceId) {
        List<Row> rows = jdbc.query("""
                SELECT id, workspace_id, object_id, message_id, original_name, content_type,
                       byte_size, storage_key, extract_text, extract_status, created_at
                FROM attachment
                WHERE workspace_id = ?
                ORDER BY created_at ASC
                """, rowMapper(), workspaceId);
        for (Row row : rows) {
            relocate(row);
        }
        return jdbc.query("""
                SELECT id, workspace_id, object_id, message_id, original_name, content_type,
                       byte_size, extract_status, created_at
                FROM attachment
                WHERE workspace_id = ?
                ORDER BY created_at ASC
                """, summaryMapper(), workspaceId);
    }

    public Attachment get(String workspaceId, String attachmentId) {
        List<Attachment> found = jdbc.query("""
                SELECT id, workspace_id, object_id, message_id, original_name, content_type,
                       byte_size, extract_status, created_at
                FROM attachment
                WHERE workspace_id = ? AND id = ?
                """, summaryMapper(), workspaceId, attachmentId);
        if (found.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found");
        }
        return found.getFirst();
    }

    public StoredFile content(String workspaceId, String attachmentId) {
        Row row = loadRow(workspaceId, attachmentId);
        Path path = resolveKey(row.storageKey());
        if (!Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File missing from store");
        }
        return new StoredFile(row.originalName(), row.contentType(), row.byteSize(), new FileSystemResource(path));
    }

    public void delete(String workspaceId, String attachmentId) {
        Row row = loadRow(workspaceId, attachmentId);
        jdbc.update("DELETE FROM attachment WHERE workspace_id = ? AND id = ?", workspaceId, attachmentId);
        deleteQuietly(resolveKey(row.storageKey()));
        if (row.objectId() != null) {
            recordEvent(workspaceId, row.objectId(), "attachment.removed",
                    Map.of("attachmentId", attachmentId, "name", row.originalName()));
        }
    }

    public Attachment linkToObject(String workspaceId, String attachmentId, String objectId) {
        if (objectId == null || objectId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "objectId is required");
        }
        requireObject(workspaceId, objectId);
        get(workspaceId, attachmentId);
        jdbc.update("UPDATE attachment SET object_id = ? WHERE workspace_id = ? AND id = ?",
                objectId, workspaceId, attachmentId);
        relocate(loadRow(workspaceId, attachmentId));
        recordEvent(workspaceId, objectId, "attachment.added",
                Map.of("attachmentId", attachmentId));
        return get(workspaceId, attachmentId);
    }

    /** Move a card's files when its type or display id changes. */
    public void relocateObject(String workspaceId, String objectId) {
        List<Row> rows = jdbc.query("""
                SELECT id, workspace_id, object_id, message_id, original_name, content_type,
                       byte_size, storage_key, extract_text, extract_status, created_at
                FROM attachment
                WHERE workspace_id = ? AND object_id = ?
                """, rowMapper(), workspaceId, objectId);
        for (Row row : rows) {
            relocate(row);
        }
    }

    /** Drop the card link and move its files into Misc. */
    public void releaseObject(String workspaceId, String objectId) {
        List<String> ids = jdbc.queryForList(
                "SELECT id FROM attachment WHERE workspace_id = ? AND object_id = ?",
                String.class, workspaceId, objectId);
        if (ids.isEmpty()) {
            return;
        }
        jdbc.update("UPDATE attachment SET object_id = NULL WHERE workspace_id = ? AND object_id = ?",
                workspaceId, objectId);
        for (String id : ids) {
            relocate(loadRow(workspaceId, id));
        }
    }

    public void linkToMessage(String workspaceId, List<String> attachmentIds, String messageId) {
        if (attachmentIds == null || attachmentIds.isEmpty()) {
            return;
        }
        if (attachmentIds.size() > MAX_BATCH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At most " + MAX_BATCH + " files per message");
        }
        for (String id : attachmentIds) {
            Row row = loadRow(workspaceId, id);
            if (row.messageId() != null && !row.messageId().equals(messageId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Attachment already linked to a message");
            }
            jdbc.update("UPDATE attachment SET message_id = ? WHERE workspace_id = ? AND id = ?",
                    messageId, workspaceId, id);
        }
    }

    public String extractsForTurn(String workspaceId, List<String> turnAttachmentIds, List<String> focusObjectIds) {
        StringBuilder sb = new StringBuilder();
        int remaining = AttachmentTextExtractor.PER_TURN_CHARS;
        remaining = appendExtracts(sb, loadTurnRows(workspaceId, turnAttachmentIds), remaining, "This message");
        if (focusObjectIds != null && !focusObjectIds.isEmpty()) {
            remaining = appendExtracts(sb, loadObjectRows(workspaceId, focusObjectIds), remaining, "Focused card");
        }
        return sb.toString();
    }

    public List<ChatClient.ContentPart> visionParts(String workspaceId, List<String> turnAttachmentIds, String model) {
        if (!isVisionModel(model) || turnAttachmentIds == null || turnAttachmentIds.isEmpty()) {
            return List.of();
        }
        List<ChatClient.ContentPart> parts = new ArrayList<>();
        for (Row row : loadTurnRows(workspaceId, turnAttachmentIds)) {
            if (parts.size() >= VISION_MAX_IMAGES) {
                break;
            }
            if (!AttachmentTextExtractor.isImage(AttachmentTextExtractor.extension(row.originalName()), row.contentType())) {
                continue;
            }
            if (row.byteSize() > VISION_MAX_BYTES) {
                continue;
            }
            Path path = resolveKey(row.storageKey());
            if (!Files.isRegularFile(path)) {
                continue;
            }
            try {
                byte[] bytes = Files.readAllBytes(path);
                String mime = row.contentType() == null || row.contentType().isBlank()
                        ? "image/png"
                        : row.contentType();
                parts.add(ChatClient.ContentPart.image(mime, Base64.getEncoder().encodeToString(bytes)));
            } catch (IOException ex) {
                log.warn("Could not read image {} for vision: {}", row.id(), ex.getMessage());
            }
        }
        return parts;
    }

    public void deleteWorkspaceFiles(String workspaceId) {
        Path dir = root().resolve(safeSegment(workspaceId)).normalize();
        if (!dir.startsWith(root()) || !Files.isDirectory(dir)) {
            return;
        }
        try (Stream<Path> walk = Files.walk(dir)) {
            walk.sorted(Comparator.reverseOrder()).forEach(AttachmentService::deleteQuietly);
        } catch (IOException ex) {
            log.warn("Could not remove attachment dir for {}: {}", workspaceId, ex.getMessage());
        }
    }

    public static boolean isVisionModel(String model) {
        if (model == null) {
            return false;
        }
        String m = model.toLowerCase(Locale.ROOT);
        return m.contains("gpt-4o") || m.contains("gpt-4.1") || m.contains("gpt-5")
                || m.contains("llava") || m.contains("vision") || m.contains("gemini")
                || m.contains("claude-3") || m.contains("claude-4") || m.contains("claude-sonnet")
                || m.contains("claude-opus");
    }

    private int appendExtracts(StringBuilder sb, List<Row> rows, int remaining, String heading) {
        boolean wroteHead = false;
        for (Row row : rows) {
            if (remaining <= 0) {
                break;
            }
            if (!wroteHead) {
                sb.append("\nAttached files (").append(heading).append(", extracts truncated):\n");
                wroteHead = true;
            }
            sb.append("- ").append(row.originalName()).append(" (").append(row.contentType()).append(")");
            if ("ok".equals(row.extractStatus()) && row.extractText() != null && !row.extractText().isBlank()) {
                String snippet = AttachmentTextExtractor.cap(row.extractText(), Math.min(AttachmentTextExtractor.PER_FILE_CHARS, remaining));
                sb.append(":\n").append(snippet).append('\n');
                remaining -= snippet.length();
            } else if (AttachmentTextExtractor.isImage(AttachmentTextExtractor.extension(row.originalName()), row.contentType())) {
                sb.append(": [image attached]\n");
            } else {
                sb.append(": [no text extract]\n");
            }
        }
        return remaining;
    }

    private List<Row> loadTurnRows(String workspaceId, List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        List<Row> out = new ArrayList<>();
        for (String id : ids) {
            try {
                out.add(loadRow(workspaceId, id));
            } catch (ResponseStatusException ignored) {
                // skip unknown ids
            }
        }
        return out;
    }

    private List<Row> loadObjectRows(String workspaceId, List<String> objectIds) {
        List<Row> out = new ArrayList<>();
        for (String objectId : objectIds) {
            out.addAll(jdbc.query("""
                    SELECT id, workspace_id, object_id, message_id, original_name, content_type,
                           byte_size, storage_key, extract_text, extract_status, created_at
                    FROM attachment
                    WHERE workspace_id = ? AND object_id = ?
                    ORDER BY created_at ASC
                    """, rowMapper(), workspaceId, objectId));
        }
        return out;
    }

    private Row loadRow(String workspaceId, String attachmentId) {
        List<Row> found = jdbc.query("""
                SELECT id, workspace_id, object_id, message_id, original_name, content_type,
                       byte_size, storage_key, extract_text, extract_status, created_at
                FROM attachment
                WHERE workspace_id = ? AND id = ?
                """, rowMapper(), workspaceId, attachmentId);
        if (found.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found");
        }
        return found.getFirst();
    }

    private void requireObject(String workspaceId, String objectId) {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*) FROM idea_object WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL",
                Integer.class, workspaceId, objectId);
        if (n == null || n == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Object not found");
        }
    }

    private Path root() {
        return Paths.get(properties.getStorage().getRoot()).toAbsolutePath().normalize();
    }

    private void relocate(Row row) {
        String desired = storageKeyFor(row.workspaceId(), row.objectId(), row.id(), row.originalName());
        if (desired.equals(row.storageKey())) {
            return;
        }
        Path from = resolveKey(row.storageKey());
        Path to = resolveKey(desired);
        try {
            Files.createDirectories(to.getParent());
            if (Files.isRegularFile(from)) {
                Files.move(from, to, StandardCopyOption.REPLACE_EXISTING);
                pruneEmptyParents(from.getParent(), root().resolve(safeSegment(row.workspaceId())));
            }
        } catch (IOException ex) {
            log.warn("Could not move attachment {} to {}: {}", row.id(), desired, ex.getMessage());
            return;
        }
        jdbc.update("UPDATE attachment SET storage_key = ? WHERE workspace_id = ? AND id = ?",
                desired, row.workspaceId(), row.id());
    }

    private String storageKeyFor(String workspaceId, String objectId, String attachmentId, String originalName) {
        String file = safeSegment(attachmentId) + "__" + fileSegment(originalName);
        if (objectId == null || objectId.isBlank()) {
            return workspaceId + "/Misc/" + file;
        }
        List<Map<String, Object>> found = jdbc.queryForList(
                "SELECT display_id, type FROM idea_object WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL",
                workspaceId, objectId);
        if (found.isEmpty()) {
            return workspaceId + "/Misc/" + file;
        }
        String type = String.valueOf(found.getFirst().get("type"));
        String displayId = String.valueOf(found.getFirst().get("display_id"));
        return workspaceId + "/" + folderSegment(typeFolder(type)) + "/" + folderSegment(displayId) + "/" + file;
    }

    private static String typeFolder(String type) {
        if (type == null || type.isBlank()) {
            return "Misc";
        }
        return switch (type) {
            case "hypothesis" -> "Hypotheses";
            case "theory" -> "Theories";
            case "evidence" -> "Evidence";
            case "citation" -> "Citations";
            default -> pluralize(lookupLabel(type));
        };
    }

    private static String lookupLabel(String value) {
        String[] parts = value.split("[_-]+");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) {
                continue;
            }
            if (!sb.isEmpty()) {
                sb.append(' ');
            }
            sb.append(Character.toUpperCase(part.charAt(0)));
            if (part.length() > 1) {
                sb.append(part.substring(1).toLowerCase(Locale.ROOT));
            }
        }
        return sb.toString();
    }

    private static String pluralize(String singular) {
        if (singular.matches(".*[sxz]$") || singular.matches(".*[cs]h$")) {
            return singular + "es";
        }
        if (singular.matches(".*[^aeiou]y$")) {
            return singular.substring(0, singular.length() - 1) + "ies";
        }
        return singular + "s";
    }

    private static String fileSegment(String name) {
        String base = sanitizeName(name).replaceAll("[^A-Za-z0-9._-]", "_");
        if (base.length() > 120) {
            base = base.substring(base.length() - 120);
        }
        return base.isBlank() ? "file" : base;
    }

    private static String folderSegment(String value) {
        String cleaned = value == null ? "" : value.replaceAll("[\\\\/]+", " ").trim();
        if (cleaned.isBlank() || cleaned.contains("..")) {
            return "Misc";
        }
        return cleaned;
    }

    private static void pruneEmptyParents(Path dir, Path stop) throws IOException {
        Path current = dir;
        while (current != null && !current.equals(stop) && current.startsWith(stop) && Files.isDirectory(current)) {
            try (Stream<Path> children = Files.list(current)) {
                if (children.findAny().isPresent()) {
                    return;
                }
            }
            Files.deleteIfExists(current);
            current = current.getParent();
        }
    }

    private Path resolveKey(String storageKey) {
        String[] parts = storageKey.split("/");
        if (parts.length < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid storage key");
        }
        Path resolved = root();
        for (String part : parts) {
            resolved = resolved.resolve(safeSegment(part));
        }
        resolved = resolved.normalize();
        if (!resolved.startsWith(root())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid storage path");
        }
        return resolved;
    }

    private static String safeSegment(String value) {
        if (value == null || value.isBlank() || value.contains("..") || value.contains("/") || value.contains("\\")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid path segment");
        }
        return value;
    }

    private static String sanitizeName(String name) {
        if (name == null || name.isBlank()) {
            return "file";
        }
        String base = Path.of(name).getFileName().toString().replaceAll("[\\r\\n]", "").trim();
        return base.isBlank() ? "file" : base;
    }

    private static String guessMime(String ext) {
        return switch (ext) {
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "gif" -> "image/gif";
            case "webp" -> "image/webp";
            case "pdf" -> "application/pdf";
            case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case "csv" -> "text/csv";
            case "md", "markdown" -> "text/markdown";
            default -> "text/plain";
        };
    }

    private void recordEvent(String workspaceId, String objectId, String type, Map<String, String> payload) {
        String json = payload.entrySet().stream()
                .map(e -> "\"" + e.getKey() + "\":\"" + e.getValue().replace("\"", "'") + "\"")
                .reduce((a, b) -> a + "," + b)
                .map(s -> "{" + s + "}")
                .orElse("{}");
        jdbc.update("""
                INSERT INTO object_event (id, workspace_id, object_id, event_type, payload)
                VALUES (?,?,?,?,?::jsonb)
                """, Ids.id("evt_"), workspaceId, objectId, type, json);
    }

    private static void deleteQuietly(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
            // leftover file is non-fatal
        }
    }

    private static RowMapper<Attachment> summaryMapper() {
        return (rs, i) -> mapAttachment(rs);
    }

    private static RowMapper<Row> rowMapper() {
        return (rs, i) -> new Row(
                rs.getString("id"),
                rs.getString("workspace_id"),
                rs.getString("object_id"),
                rs.getString("message_id"),
                rs.getString("original_name"),
                rs.getString("content_type"),
                rs.getLong("byte_size"),
                rs.getString("storage_key"),
                columnOrNull(rs, "extract_text"),
                rs.getString("extract_status"),
                rs.getTimestamp("created_at").toInstant()
        );
    }

    private static Attachment mapAttachment(ResultSet rs) throws SQLException {
        return new Attachment(
                rs.getString("id"),
                rs.getString("workspace_id"),
                rs.getString("object_id"),
                rs.getString("message_id"),
                rs.getString("original_name"),
                rs.getString("content_type"),
                rs.getLong("byte_size"),
                rs.getString("extract_status"),
                rs.getTimestamp("created_at").toInstant()
        );
    }

    private static String columnOrNull(ResultSet rs, String column) {
        try {
            return rs.getString(column);
        } catch (SQLException ex) {
            return null;
        }
    }

    public record Attachment(
            String id,
            String workspaceId,
            String objectId,
            String messageId,
            String originalName,
            String contentType,
            long byteSize,
            String extractStatus,
            Instant createdAt
    ) {}

    public record StoredFile(String originalName, String contentType, long byteSize, Resource resource) {}

    private record Row(
            String id,
            String workspaceId,
            String objectId,
            String messageId,
            String originalName,
            String contentType,
            long byteSize,
            String storageKey,
            String extractText,
            String extractStatus,
            Instant createdAt
    ) {}
}
