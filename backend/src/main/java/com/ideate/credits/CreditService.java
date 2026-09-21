package com.ideate.credits;

import com.ideate.Ids;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CreditService {
    private final JdbcTemplate jdbc;

    public CreditService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public CreditBalance balance(String accountId) {
        return jdbc.queryForObject("""
                SELECT account_id, plan, balance FROM credit_account WHERE account_id = ?
                """, (rs, i) -> new CreditBalance(rs.getString("account_id"), rs.getString("plan"), rs.getInt("balance")),
                accountId);
    }

    public int costFor(String jobClass) {
        return switch (jobClass) {
            case "SIMPLE" -> 0;
            case "NORMAL" -> 1;
            case "DEEP" -> 5;
            case "BATCH" -> 5;
            default -> 1;
        };
    }

    public void require(String accountId, String jobClass) {
        int cost = costFor(jobClass);
        if (cost == 0) {
            return;
        }
        CreditBalance bal = balance(accountId);
        if (bal.balance() < cost) {
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED,
                    "Not enough credits for " + jobClass + " (need " + cost + ", have " + bal.balance() + ")");
        }
    }

    public void debit(String accountId, String workspaceId, String jobId, String jobClass) {
        int cost = costFor(jobClass);
        if (cost == 0) {
            return;
        }
        jdbc.update("UPDATE credit_account SET balance = balance - ? WHERE account_id = ?", cost, accountId);
        jdbc.update("""
                INSERT INTO credit_ledger (id, account_id, workspace_id, job_id, credits_delta, reason)
                VALUES (?,?,?,?,?,?)
                """, Ids.id("crd_"), accountId, workspaceId, jobId, -cost, jobClass.toLowerCase() + " job");
    }

    public record CreditBalance(String accountId, String plan, int balance) {}
}
