-- Workspace-level reports (not graph cards). One living report per branch, versioned.

CREATE TABLE IF NOT EXISTS workspace_report (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    branch_id TEXT NOT NULL REFERENCES branch(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'preparing'
        CHECK (status IN ('preparing', 'ready', 'updating', 'failed')),
    current_version INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL DEFAULT '',
    error TEXT,
    last_job_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, branch_id)
);

CREATE TABLE IF NOT EXISTS workspace_report_version (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES workspace_report(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    generated_by TEXT,
    job_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (report_id, version)
);

CREATE INDEX IF NOT EXISTS idx_workspace_report_workspace_branch
    ON workspace_report (workspace_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_workspace_report_version_report
    ON workspace_report_version (report_id, version);
