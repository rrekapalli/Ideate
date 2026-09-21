package com.ideate.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

@Component
@RequestScope
public class CurrentUserHolder {

    private final CurrentUser user;

    public CurrentUserHolder(HttpServletRequest request, AuthProperties authProperties, JdbcTemplate jdbc) {
        String accountId = (String) request.getAttribute(DevAuthFilter.ACCOUNT_ATTR);
        if (accountId == null || accountId.isBlank()) {
            accountId = authProperties.getDevAccountId();
        }
        String finalId = accountId;
        this.user = jdbc.query(
                "SELECT id, email, display_name FROM account WHERE id = ?",
                rs -> {
                    if (!rs.next()) {
                        return new CurrentUser(finalId, authProperties.getDevEmail(), authProperties.getDevName());
                    }
                    return new CurrentUser(rs.getString("id"), rs.getString("email"), rs.getString("display_name"));
                },
                accountId);
    }

    public CurrentUser get() {
        return user;
    }
}
