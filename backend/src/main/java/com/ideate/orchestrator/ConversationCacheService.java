package com.ideate.orchestrator;

import com.ideate.IdeateProperties;
import com.ideate.context.ProjectStateAssembler;
import com.ideate.credits.CreditService;
import com.ideate.jobs.JobService;
import com.ideate.providers.ChatClient;
import com.ideate.providers.OpenAiCompatibleChatClient;
import com.ideate.transcript.TranscriptService;
import com.ideate.usage.UsageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ConversationCacheService {
    private static final Logger log = LoggerFactory.getLogger(ConversationCacheService.class);

    private final ProjectStateAssembler assembler;
    private final TranscriptService transcript;
    private final OpenAiCompatibleChatClient chatClient;
    private final IdeateProperties properties;
    private final JdbcTemplate jdbc;
    private final JobService jobs;
    private final UsageService usage;
    private final CreditService credits;

    public ConversationCacheService(ProjectStateAssembler assembler, TranscriptService transcript,
                                    OpenAiCompatibleChatClient chatClient, IdeateProperties properties,
                                    JdbcTemplate jdbc, JobService jobs, UsageService usage, CreditService credits) {
        this.assembler = assembler;
        this.transcript = transcript;
        this.chatClient = chatClient;
        this.properties = properties;
        this.jdbc = jdbc;
        this.jobs = jobs;
        this.usage = usage;
        this.credits = credits;
    }

    @Async
    public void refresh(String accountId, String workspaceId, String branchId, String throughTurnId) {
        try {
            credits.require(accountId, "SIMPLE");
            var job = jobs.enqueue(workspaceId, accountId, "SIMPLE", "explore", "cache", List.of());
            jobs.markRunning(job.id());
            String previous = assembler.currentCache(workspaceId, branchId);
            var tail = transcript.list(workspaceId, branchId);
            StringBuilder turns = new StringBuilder();
            for (var msg : tail) {
                turns.append(msg.role()).append(": ").append(msg.content()).append('\n');
            }
            ChatClient.ChatResult result = chatClient.complete(new ChatClient.ChatRequest(
                    properties.getOllama().getModel(),
                    properties.getOllama().getBaseUrl(),
                    "",
                    List.of(
                            new ChatClient.Message("system",
                                    "You update a workspace conversation cache. Replace the previous cache. Output the new cache only. Do not invent objects."),
                            new ChatClient.Message("user", "Previous cache:\n" + (previous == null ? "(none)" : previous)
                                    + "\n\nNew turns:\n" + turns)
                    ),
                    1500
            ));
            if (result.error() != null) {
                jobs.markFailed(job.id(), result.error());
                return;
            }
            jdbc.update("""
                    UPDATE conversation_cache SET status = 'superseded'
                    WHERE workspace_id = ? AND branch_id = ? AND status = 'current'
                    """, workspaceId, branchId);
            jdbc.update("""
                    INSERT INTO conversation_cache (id, workspace_id, branch_id, summary_text, covers_through_turn_id, generated_by, status)
                    VALUES (gen_random_uuid()::text, ?, ?, ?, ?, ?, 'current')
                    """, workspaceId, branchId, result.text(), throughTurnId, "ollama:" + properties.getOllama().getModel());
            usage.record(workspaceId, accountId, job.id(), "ollama", properties.getOllama().getModel(), "SIMPLE",
                    result.inputTokens(), result.outputTokens(), 0);
            jobs.markApplied(job.id(), List.of());
        } catch (Exception ex) {
            log.warn("Cache refresh failed: {}", ex.getMessage());
        }
    }
}
