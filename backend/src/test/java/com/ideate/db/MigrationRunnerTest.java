package com.ideate.db;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MigrationRunnerTest {

    @Test
    void baselineIsRecognizedAndNotTreatedAsDestructive() {
        assertTrue(MigrationRunner.isBaseline("000_baseline.sql"));
        assertFalse(MigrationRunner.isDestructive("""
                CREATE TABLE IF NOT EXISTS workspace (id TEXT PRIMARY KEY);
                INSERT INTO model_price (id) VALUES ('x') ON CONFLICT (id) DO NOTHING;
                """));
    }

    @Test
    void dropAndTruncateAreRejected() {
        assertTrue(MigrationRunner.isDestructive("DROP TABLE workspace;"));
        assertTrue(MigrationRunner.isDestructive("drop schema public cascade"));
        assertTrue(MigrationRunner.isDestructive("TRUNCATE TABLE idea_object"));
    }
}
