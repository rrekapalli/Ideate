-- Ideate baseline schema. PostgreSQL + Apache AGE + pgvector.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS age;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'AGE extension not available: %', SQLERRM;
END
$$;

CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_account (
    account_id TEXT PRIMARY KEY REFERENCES account(id),
    plan TEXT NOT NULL DEFAULT 'dev',
    balance INTEGER NOT NULL DEFAULT 0,
    period_reset_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS workspace (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(id),
    name TEXT NOT NULL,
    persona TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branch (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    branch_role TEXT NOT NULL CHECK (branch_role IN ('mainstream', 'overlay')),
    parent_branch_id TEXT REFERENCES branch(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS idea_object (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    branch_id TEXT NOT NULL REFERENCES branch(id),
    display_id TEXT NOT NULL,
    type TEXT NOT NULL,
    origin TEXT NOT NULL DEFAULT 'original',
    derived_via TEXT,
    object_category TEXT NOT NULL DEFAULT 'active',
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    generated_by TEXT,
    source_user_message_id TEXT,
    source_assistant_message_id TEXT,
    deleted_at TIMESTAMPTZ,
    canvas_x DOUBLE PRECISION,
    canvas_y DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, branch_id, display_id)
);

CREATE TABLE IF NOT EXISTS idea_object_version (
    id TEXT PRIMARY KEY,
    object_id TEXT NOT NULL REFERENCES idea_object(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL,
    object_category TEXT NOT NULL,
    generated_by TEXT,
    source_user_message_id TEXT,
    source_assistant_message_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS idea_object_alias (
    object_id TEXT NOT NULL REFERENCES idea_object(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    PRIMARY KEY (object_id, alias)
);

CREATE TABLE IF NOT EXISTS idea_object_derived_from (
    object_id TEXT NOT NULL REFERENCES idea_object(id) ON DELETE CASCADE,
    parent_id TEXT NOT NULL REFERENCES idea_object(id),
    PRIMARY KEY (object_id, parent_id)
);

CREATE TABLE IF NOT EXISTS idea_edge (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    branch_id TEXT NOT NULL REFERENCES branch(id),
    display_id TEXT NOT NULL,
    type TEXT NOT NULL,
    from_object_id TEXT NOT NULL REFERENCES idea_object(id),
    to_object_id TEXT NOT NULL REFERENCES idea_object(id),
    why TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS idea_tag (
    object_id TEXT NOT NULL REFERENCES idea_object(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    PRIMARY KEY (object_id, tag)
);

CREATE TABLE IF NOT EXISTS transcript_message (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    branch_id TEXT NOT NULL REFERENCES branch(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    mode TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_folder (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES document_folder(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_item (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    folder_id TEXT REFERENCES document_folder(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_cache (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    branch_id TEXT NOT NULL REFERENCES branch(id),
    summary_text TEXT NOT NULL,
    covers_through_turn_id TEXT,
    generated_by TEXT,
    status TEXT NOT NULL CHECK (status IN ('current', 'superseded')),
    superseded_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_job (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES account(id),
    class TEXT NOT NULL,
    status TEXT NOT NULL,
    mode TEXT,
    agent TEXT,
    focus_object_ids TEXT[] NOT NULL DEFAULT '{}',
    result_object_ids TEXT[] NOT NULL DEFAULT '{}',
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ai_usage_event (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES account(id),
    job_id TEXT,
    provider TEXT,
    model TEXT,
    job_class TEXT,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cached_input_tokens INTEGER NOT NULL DEFAULT 0,
    embedding_tokens INTEGER NOT NULL DEFAULT 0,
    search_calls INTEGER NOT NULL DEFAULT 0,
    documents_fetched INTEGER NOT NULL DEFAULT 0,
    estimated_cost_minor INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_price (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    input_per_m NUMERIC NOT NULL,
    output_per_m NUMERIC NOT NULL,
    cached_input_per_m NUMERIC,
    batch_factor NUMERIC DEFAULT 1
);

CREATE TABLE IF NOT EXISTS workspace_ai_settings (
    workspace_id TEXT PRIMARY KEY REFERENCES workspace(id) ON DELETE CASCADE,
    provider_override TEXT,
    model_override TEXT,
    ollama_base_url TEXT
);

CREATE TABLE IF NOT EXISTS account_ai_settings (
    account_id TEXT PRIMARY KEY REFERENCES account(id) ON DELETE CASCADE,
    provider TEXT,
    model TEXT,
    ollama_base_url TEXT
);

CREATE TABLE IF NOT EXISTS credit_ledger (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(id),
    workspace_id TEXT,
    job_id TEXT,
    credits_delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS object_event (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    object_id TEXT,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS graph_problem (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    message TEXT NOT NULL,
    object_ids TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    dismissed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS display_id_seq (
    workspace_id TEXT NOT NULL,
    prefix TEXT NOT NULL,
    next_value INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (workspace_id, prefix)
);

CREATE TABLE IF NOT EXISTS object_embedding (
    object_id TEXT PRIMARY KEY REFERENCES idea_object(id) ON DELETE CASCADE,
    embedding vector(768)
);

INSERT INTO model_price (id, provider, model, input_per_m, output_per_m, cached_input_per_m, batch_factor)
VALUES
    ('price_ollama_default', 'ollama', 'llama3.2', 0, 0, 0, 1),
    ('price_openai_gpt4o_mini', 'openai', 'gpt-4o-mini', 0.15, 0.60, 0.075, 0.5)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_idea_object_workspace ON idea_object (workspace_id, branch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_idea_edge_workspace ON idea_edge (workspace_id, branch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transcript_workspace ON transcript_message (workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_object_event_workspace ON object_event (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_job_workspace ON ai_job (workspace_id, created_at DESC);
