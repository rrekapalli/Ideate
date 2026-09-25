-- Structured per-type fields on cards, plus cross-workspace reuse pointers on edges.

ALTER TABLE idea_object
    ADD COLUMN IF NOT EXISTS details JSONB;

ALTER TABLE idea_object_version
    ADD COLUMN IF NOT EXISTS details JSONB;

ALTER TABLE idea_edge
    ADD COLUMN IF NOT EXISTS source_workspace_id TEXT REFERENCES workspace(id);
ALTER TABLE idea_edge
    ADD COLUMN IF NOT EXISTS source_object_id TEXT REFERENCES idea_object(id);

CREATE INDEX IF NOT EXISTS idx_idea_object_details
    ON idea_object USING GIN (details);

CREATE INDEX IF NOT EXISTS idx_idea_edge_source_object
    ON idea_edge (source_workspace_id, source_object_id);
