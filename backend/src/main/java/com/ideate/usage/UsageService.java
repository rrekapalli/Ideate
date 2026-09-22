package com.ideate.usage;

import com.ideate.Ids;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

@Service
public class UsageService {
    private final JdbcTemplate jdbc;

    public UsageService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void record(String workspaceId, String accountId, String jobId, String provider, String model,
                       String jobClass, int inputTokens, int outputTokens, int cachedInputTokens) {
        int costMinor = estimateCostMinor(provider, model, inputTokens, outputTokens, cachedInputTokens);
        jdbc.update("""
                INSERT INTO ai_usage_event (
                    id, workspace_id, account_id, job_id, provider, model, job_class,
                    input_tokens, output_tokens, cached_input_tokens, estimated_cost_minor, currency)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,'INR')
                """, Ids.id("use_"), workspaceId, accountId, jobId, provider, model, jobClass,
                inputTokens, outputTokens, cachedInputTokens, costMinor);
    }

    public UsageRollup rollup(String workspaceId) {
        Integer minor = jdbc.queryForObject(
                "SELECT COALESCE(SUM(estimated_cost_minor),0) FROM ai_usage_event WHERE workspace_id = ?",
                Integer.class, workspaceId);
        Integer inputTokens = jdbc.queryForObject(
                "SELECT COALESCE(SUM(input_tokens),0) FROM ai_usage_event WHERE workspace_id = ?",
                Integer.class, workspaceId);
        Integer outputTokens = jdbc.queryForObject(
                "SELECT COALESCE(SUM(output_tokens),0) FROM ai_usage_event WHERE workspace_id = ?",
                Integer.class, workspaceId);
        Integer calls = jdbc.queryForObject(
                "SELECT COUNT(*) FROM ai_usage_event WHERE workspace_id = ?",
                Integer.class, workspaceId);
        List<UsageEvent> recent = jdbc.query("""
                SELECT * FROM ai_usage_event WHERE workspace_id = ? ORDER BY created_at DESC
                """, (rs, i) -> new UsageEvent(
                rs.getString("id"),
                rs.getString("job_id"),
                rs.getString("provider"),
                rs.getString("model"),
                rs.getString("job_class"),
                rs.getInt("input_tokens"),
                rs.getInt("output_tokens"),
                rs.getInt("estimated_cost_minor"),
                rs.getTimestamp("created_at").toInstant()
        ), workspaceId);
        return new UsageRollup(
                workspaceId,
                minor == null ? 0 : minor,
                recent,
                inputTokens == null ? 0 : inputTokens,
                outputTokens == null ? 0 : outputTokens,
                calls == null ? 0 : calls);
    }

    private int estimateCostMinor(String provider, String model, int inTok, int outTok, int cached) {
        List<Price> prices = jdbc.query("""
                SELECT input_per_m, output_per_m, cached_input_per_m
                FROM model_price WHERE provider = ? AND model = ?
                ORDER BY effective_from DESC LIMIT 1
                """, (rs, i) -> new Price(rs.getBigDecimal("input_per_m"), rs.getBigDecimal("output_per_m"),
                rs.getBigDecimal("cached_input_per_m")), provider, model);
        if (prices.isEmpty()) {
            return 0;
        }
        Price p = prices.getFirst();
        BigDecimal in = p.input.multiply(BigDecimal.valueOf(inTok)).divide(BigDecimal.valueOf(1_000_000), 6, RoundingMode.HALF_UP);
        BigDecimal out = p.output.multiply(BigDecimal.valueOf(outTok)).divide(BigDecimal.valueOf(1_000_000), 6, RoundingMode.HALF_UP);
        BigDecimal cacheRate = p.cached == null ? p.input : p.cached;
        BigDecimal cachedCost = cacheRate.multiply(BigDecimal.valueOf(cached)).divide(BigDecimal.valueOf(1_000_000), 6, RoundingMode.HALF_UP);
        // USD * 83 * 100 paise approximation stored as INR minor units
        return in.add(out).add(cachedCost).multiply(BigDecimal.valueOf(8300)).setScale(0, RoundingMode.HALF_UP).intValue();
    }

    public record UsageRollup(
            String workspaceId,
            int estimatedCostMinorInr,
            List<UsageEvent> recent,
            int inputTokens,
            int outputTokens,
            int calls) {}

    public record UsageEvent(String id, String jobId, String provider, String model, String jobClass,
                             int inputTokens, int outputTokens, int estimatedCostMinor, Instant createdAt) {}

    private record Price(BigDecimal input, BigDecimal output, BigDecimal cached) {}
}
