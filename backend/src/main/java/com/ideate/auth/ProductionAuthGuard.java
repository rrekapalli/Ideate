package com.ideate.auth;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
@Order(0)
public class ProductionAuthGuard implements ApplicationRunner {

    private final AuthProperties authProperties;
    private final Environment environment;

    public ProductionAuthGuard(AuthProperties authProperties, Environment environment) {
        this.authProperties = authProperties;
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean prod = Arrays.stream(environment.getActiveProfiles()).anyMatch(p -> p.equalsIgnoreCase("prod"));
        if (prod && !authProperties.isEnabled()) {
            throw new IllegalStateException("ideate.auth.enabled=false is not allowed in production");
        }
    }
}

@Component
@Order(1)
class DevAccountSeeder implements ApplicationRunner {

    private final AuthProperties authProperties;
    private final JdbcTemplate jdbc;

    DevAccountSeeder(AuthProperties authProperties, JdbcTemplate jdbc) {
        this.authProperties = authProperties;
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbc.update("""
                INSERT INTO account (id, email, display_name)
                VALUES (?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name
                """, authProperties.getDevAccountId(), authProperties.getDevEmail(), authProperties.getDevName());
        jdbc.update("""
                INSERT INTO credit_account (account_id, plan, balance)
                VALUES (?, 'dev', ?)
                ON CONFLICT (account_id) DO NOTHING
                """, authProperties.getDevAccountId(), authProperties.getDevCreditBalance());
        jdbc.update("""
                INSERT INTO account_ai_settings (account_id, provider, model)
                VALUES (?, 'ollama', 'llama3.2')
                ON CONFLICT (account_id) DO NOTHING
                """, authProperties.getDevAccountId());
    }
}
