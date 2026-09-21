package com.ideate.transcript;

import com.ideate.Ids;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

@Service
public class TranscriptService {
    private final JdbcTemplate jdbc;

    public TranscriptService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public TranscriptMessage append(String workspaceId, String branchId, String role, String content, String mode) {
        String id = Ids.id("msg_");
        Instant now = Instant.now();
        jdbc.update("""
                INSERT INTO transcript_message (id, workspace_id, branch_id, role, content, mode, created_at)
                VALUES (?,?,?,?,?,?,?)
                """, id, workspaceId, branchId, role, content, mode, Timestamp.from(now));
        return new TranscriptMessage(id, workspaceId, branchId, role, content, mode, now);
    }

    public List<TranscriptMessage> list(String workspaceId, String branchId) {
        if (branchId == null || branchId.isBlank()) {
            return jdbc.query("""
                    SELECT * FROM transcript_message
                    WHERE workspace_id = ?
                    ORDER BY created_at ASC
                    """, (rs, i) -> map(rs), workspaceId);
        }
        return jdbc.query("""
                SELECT * FROM transcript_message
                WHERE workspace_id = ? AND branch_id = ?
                ORDER BY created_at ASC
                """, (rs, i) -> map(rs), workspaceId, branchId);
    }

    public TranscriptMessage get(String messageId) {
        List<TranscriptMessage> found = jdbc.query(
                "SELECT * FROM transcript_message WHERE id = ?",
                (rs, i) -> map(rs),
                messageId);
        return found.isEmpty() ? null : found.getFirst();
    }

    private static TranscriptMessage map(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new TranscriptMessage(
                rs.getString("id"),
                rs.getString("workspace_id"),
                rs.getString("branch_id"),
                rs.getString("role"),
                rs.getString("content"),
                rs.getString("mode"),
                rs.getTimestamp("created_at").toInstant()
        );
    }

    public record TranscriptMessage(String id, String workspaceId, String branchId, String role,
                                    String content, String mode, Instant createdAt) {}
}
