package com.ideate.jobs;

import com.ideate.Ids;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Array;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Service
public class JobService {
    private final JdbcTemplate jdbc;

    public JobService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public JobRecord enqueue(String workspaceId, String accountId, String jobClass, String mode, String agent,
                             List<String> focusIds) {
        String id = Ids.id("job_");
        Instant now = Instant.now();
        String[] focus = focusIds == null ? new String[0] : focusIds.toArray(String[]::new);
        jdbc.update(connection -> {
            var ps = connection.prepareStatement("""
                    INSERT INTO ai_job (id, workspace_id, account_id, class, status, mode, agent, focus_object_ids, created_at)
                    VALUES (?,?,?,?, 'queued', ?, ?, ?, ?)
                    """);
            ps.setString(1, id);
            ps.setString(2, workspaceId);
            ps.setString(3, accountId);
            ps.setString(4, jobClass);
            ps.setString(5, mode);
            ps.setString(6, agent);
            ps.setArray(7, connection.createArrayOf("text", focus));
            ps.setTimestamp(8, Timestamp.from(now));
            return ps;
        });
        return get(workspaceId, id);
    }

    public void markRunning(String jobId) {
        jdbc.update("UPDATE ai_job SET status = 'running' WHERE id = ?", jobId);
    }

    public void markApplied(String jobId, List<String> resultIds) {
        String[] results = resultIds == null ? new String[0] : resultIds.toArray(String[]::new);
        jdbc.update(connection -> {
            var ps = connection.prepareStatement(
                    "UPDATE ai_job SET status = 'applied', result_object_ids = ?, finished_at = now() WHERE id = ?");
            ps.setArray(1, connection.createArrayOf("text", results));
            ps.setString(2, jobId);
            return ps;
        });
    }

    public void markFailed(String jobId, String error) {
        jdbc.update("UPDATE ai_job SET status = 'failed', error = ?, finished_at = now() WHERE id = ?", error, jobId);
    }

    public JobRecord get(String workspaceId, String jobId) {
        List<JobRecord> found = jdbc.query(
                "SELECT * FROM ai_job WHERE workspace_id = ? AND id = ?",
                jobMapper(), workspaceId, jobId);
        if (found.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found");
        }
        return found.getFirst();
    }

    public List<JobRecord> list(String workspaceId) {
        return jdbc.query(
                "SELECT * FROM ai_job WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100",
                jobMapper(), workspaceId);
    }

    private org.springframework.jdbc.core.RowMapper<JobRecord> jobMapper() {
        return (rs, i) -> new JobRecord(
                rs.getString("id"),
                rs.getString("workspace_id"),
                rs.getString("class"),
                rs.getString("status"),
                rs.getString("mode"),
                rs.getString("agent"),
                toList(rs.getArray("focus_object_ids")),
                toList(rs.getArray("result_object_ids")),
                rs.getString("error"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("finished_at") == null ? null : rs.getTimestamp("finished_at").toInstant()
        );
    }

    private static List<String> toList(Array array) throws java.sql.SQLException {
        if (array == null) {
            return List.of();
        }
        Object raw = array.getArray();
        if (raw instanceof String[] strings) {
            return Arrays.asList(strings);
        }
        return List.of();
    }

    public record JobRecord(String id, String workspaceId, String jobClass, String status, String mode, String agent,
                            List<String> focusObjectIds, List<String> resultObjectIds, String error,
                            Instant createdAt, Instant finishedAt) {}
}
