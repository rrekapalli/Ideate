package com.ideate.db;

import com.ideate.IdeateProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.stream.Stream;

@Component
@Order(-10)
public class MigrationRunner implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(MigrationRunner.class);
    private static final Pattern DESTRUCTIVE = Pattern.compile(
            "(?i)\\b(drop\\s+(table|schema|database|extension)|truncate\\s+table)\\b");

    private final JdbcTemplate jdbc;
    private final IdeateProperties properties;

    public MigrationRunner(JdbcTemplate jdbc, IdeateProperties properties) {
        this.jdbc = jdbc;
        this.properties = properties;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        Path dir = resolveMigrationsDir();
        if (!Files.isDirectory(dir)) {
            throw new IllegalStateException("Migrations directory not found: " + dir.toAbsolutePath());
        }
        if (jdbc.getDataSource() == null) {
            throw new IllegalStateException("No DataSource for migrations");
        }
        try (Connection con = jdbc.getDataSource().getConnection()) {
            con.setAutoCommit(true);
            try (Statement st = con.createStatement()) {
                st.execute("""
                        CREATE TABLE IF NOT EXISTS schema_migrations (
                            filename TEXT PRIMARY KEY,
                            applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
                        )
                        """);
            }
            try (Stream<Path> files = Files.list(dir)) {
                List<Path> sqlFiles = files
                        .filter(p -> p.getFileName().toString().endsWith(".sql"))
                        .sorted(Comparator.comparing(p -> p.getFileName().toString()))
                        .toList();
                for (Path file : sqlFiles) {
                    applyOne(con, file);
                }
            }
            log.info("Migrations ready; {} workspace(s) present", countWorkspaces(con));
        }
    }

    private void applyOne(Connection con, Path file) throws Exception {
        String name = file.getFileName().toString();
        if (isApplied(con, name)) {
            log.info("Skipping migration {} (already applied)", name);
            return;
        }
        if (isBaseline(name) && publicTableExists(con, "workspace")) {
            markApplied(con, name);
            log.warn("Skipping {} — public.workspace already exists; marking applied so startup never re-inits", name);
            return;
        }
        String sql = Files.readString(file);
        if (isDestructive(sql)) {
            throw new IllegalStateException("Refusing to run destructive SQL in " + name);
        }
        log.info("Applying migration {}", name);
        try (Statement st = con.createStatement()) {
            st.execute(sql);
        }
        markApplied(con, name);
    }

    static boolean isDestructive(String sql) {
        return DESTRUCTIVE.matcher(sql).find();
    }

    static boolean isBaseline(String filename) {
        return filename.toLowerCase(Locale.ROOT).contains("baseline");
    }

    private static boolean isApplied(Connection con, String name) throws Exception {
        try (PreparedStatement ps = con.prepareStatement(
                "SELECT 1 FROM schema_migrations WHERE filename = ?")) {
            ps.setString(1, name);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private static void markApplied(Connection con, String name) throws Exception {
        try (PreparedStatement ps = con.prepareStatement(
                "INSERT INTO schema_migrations (filename) VALUES (?) ON CONFLICT (filename) DO NOTHING")) {
            ps.setString(1, name);
            ps.executeUpdate();
        }
    }

    private static boolean publicTableExists(Connection con, String table) throws Exception {
        try (PreparedStatement ps = con.prepareStatement("""
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = ?
                """)) {
            ps.setString(1, table);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private static int countWorkspaces(Connection con) {
        try (Statement st = con.createStatement();
             ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM public.workspace")) {
            return rs.next() ? rs.getInt(1) : 0;
        } catch (Exception ex) {
            return 0;
        }
    }

    private Path resolveMigrationsDir() {
        Path configured = Paths.get(properties.getMigrationsPath());
        if (Files.isDirectory(configured)) {
            return configured;
        }
        Path fromBackend = Paths.get("database-migrations");
        if (Files.isDirectory(fromBackend)) {
            return fromBackend;
        }
        Path fromParent = Paths.get("..", "database-migrations");
        if (Files.isDirectory(fromParent)) {
            return fromParent;
        }
        return configured;
    }
}
