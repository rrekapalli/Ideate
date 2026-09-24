-- File attachments on graph nodes and chat messages. Bytes live on local disk.

CREATE TABLE IF NOT EXISTS attachment (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    object_id TEXT REFERENCES idea_object(id) ON DELETE CASCADE,
    message_id TEXT REFERENCES transcript_message(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    byte_size BIGINT NOT NULL,
    storage_key TEXT NOT NULL,
    extract_text TEXT,
    extract_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (extract_status IN ('pending', 'ok', 'skipped', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachment_workspace_object
    ON attachment (workspace_id, object_id)
    WHERE object_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attachment_workspace_message
    ON attachment (workspace_id, message_id)
    WHERE message_id IS NOT NULL;
