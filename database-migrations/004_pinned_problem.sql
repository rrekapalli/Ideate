-- One pinned Question per workspace (product-research / analyst problem pin).

ALTER TABLE workspace
    ADD COLUMN IF NOT EXISTS pinned_object_id TEXT REFERENCES idea_object(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_pinned_object
    ON workspace (pinned_object_id);
