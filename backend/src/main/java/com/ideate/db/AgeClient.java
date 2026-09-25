package com.ideate.db;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Statement;

@Component
public class AgeClient {
    private static final Logger log = LoggerFactory.getLogger(AgeClient.class);
    private final JdbcTemplate jdbc;
    private volatile Boolean available;

    public AgeClient(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean isAvailable() {
        return ensure();
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void upsertVertex(String id, String type, String workspaceId, String displayId, String title) {
        if (!ensure()) {
            return;
        }
        String label = sanitizeLabel(type);
        String cypher = """
                SELECT * FROM cypher('ideate', $$
                  MERGE (n:%s {id: '%s'})
                  SET n.workspace_id = '%s', n.display_id = '%s', n.title = '%s', n.type = '%s'
                  RETURN n
                $$) AS (v agtype)
                """.formatted(label, esc(id), esc(workspaceId), esc(displayId), esc(title), esc(type));
        run(cypher);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void upsertEdge(String id, String type, String fromId, String toId, String workspaceId) {
        if (!ensure()) {
            return;
        }
        String rel = sanitizeLabel(type);
        String cypher = """
                SELECT * FROM cypher('ideate', $$
                  MATCH (a {id: '%s'}), (b {id: '%s'})
                  MERGE (a)-[r:%s {id: '%s'}]->(b)
                  SET r.workspace_id = '%s', r.type = '%s'
                  RETURN r
                $$) AS (e agtype)
                """.formatted(esc(fromId), esc(toId), rel, esc(id), esc(workspaceId), esc(type));
        run(cypher);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void deleteVertex(String id) {
        if (!ensure()) {
            return;
        }
        run("""
                SELECT * FROM cypher('ideate', $$
                  MATCH (n {id: '%s'}) DETACH DELETE n RETURN 1
                $$) AS (v agtype)
                """.formatted(esc(id)));
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void deleteEdge(String id) {
        if (!ensure()) {
            return;
        }
        run("""
                SELECT * FROM cypher('ideate', $$
                  MATCH ()-[r {id: '%s'}]-() DELETE r RETURN 1
                $$) AS (e agtype)
                """.formatted(esc(id)));
    }

    private boolean ensure() {
        Boolean snapshot = available;
        if (snapshot != null) {
            return snapshot;
        }
        synchronized (this) {
            if (available == null) {
                boolean detected = detect();
                available = detected;
                if (detected) {
                    ensureGraph();
                } else {
                    log.warn("Apache AGE is not loaded; graph traversals will use relational SQL");
                }
            }
            return available;
        }
    }

    private boolean detect() {
        try {
            jdbc.execute((ConnectionCallback<Void>) con -> {
                try (Statement st = con.createStatement()) {
                    st.execute("CREATE EXTENSION IF NOT EXISTS age");
                    st.execute("LOAD 'age'");
                }
                return null;
            });
            return true;
        } catch (DataAccessException ex) {
            log.warn("AGE detect failed: {}", ex.getMessage());
            return false;
        }
    }

    private void ensureGraph() {
        try {
            onAgeConnection(st -> {
                st.execute("SELECT * FROM ag_catalog.create_graph('ideate')");
            });
        } catch (DataAccessException ex) {
            log.debug("create_graph: {}", ex.getMessage());
        }
    }

    private void run(String sql) {
        try {
            onAgeConnection(st -> st.execute(sql));
        } catch (DataAccessException ex) {
            log.warn("AGE write failed: {}", ex.getMessage());
        }
    }

    private void onAgeConnection(SqlWork work) {
        jdbc.execute((ConnectionCallback<Void>) con -> {
            boolean previous = con.getAutoCommit();
            con.setAutoCommit(false);
            try (Statement st = con.createStatement()) {
                // One transaction so PgBouncer keeps a single server connection.
                // SET LOCAL dies at commit; a session-level SET would leak onto the
                // next request and resolve "workspace" to ag_catalog.workspace.
                st.execute("LOAD 'age'");
                st.execute("SET LOCAL search_path = ag_catalog, \"$user\", public");
                work.run(st);
                con.commit();
            } catch (RuntimeException | java.sql.SQLException ex) {
                con.rollback();
                throw ex;
            } finally {
                con.setAutoCommit(previous);
            }
            return null;
        });
    }

    @FunctionalInterface
    private interface SqlWork {
        void run(Statement st) throws java.sql.SQLException;
    }

    private static String sanitizeLabel(String type) {
        String cleaned = type.replaceAll("[^A-Za-z0-9_]", "_");
        if (cleaned.isBlank()) {
            return "Node";
        }
        return Character.toUpperCase(cleaned.charAt(0)) + cleaned.substring(1);
    }

    private static String esc(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("'", "\\'");
    }
}
