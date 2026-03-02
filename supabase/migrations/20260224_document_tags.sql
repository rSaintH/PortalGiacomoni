-- Document-specific tags (separate from client tags)
CREATE TABLE doc_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text,
  text_color text DEFAULT '#ffffff',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Junction: document_types <-> doc_tags
CREATE TABLE document_type_doc_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type_id uuid NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
  doc_tag_id uuid NOT NULL REFERENCES doc_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_type_id, doc_tag_id)
);

-- Indexes
CREATE INDEX idx_doc_tags_active ON doc_tags(is_active);
CREATE INDEX idx_document_type_doc_tags_doc ON document_type_doc_tags(document_type_id);
CREATE INDEX idx_document_type_doc_tags_tag ON document_type_doc_tags(doc_tag_id);

-- RLS
ALTER TABLE doc_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_type_doc_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read doc_tags" ON doc_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage doc_tags" ON doc_tags FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Authenticated users can read document_type_doc_tags" ON document_type_doc_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage document_type_doc_tags" ON document_type_doc_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto-update timestamp
CREATE TRIGGER update_doc_tags_updated_at BEFORE UPDATE ON doc_tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
