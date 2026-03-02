-- Document types: master list of documents per company
CREATE TABLE document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  classification text NOT NULL DEFAULT 'necessario' CHECK (classification IN ('essencial', 'necessario', 'irrelevante')),
  is_active boolean NOT NULL DEFAULT true,
  include_in_report boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Monthly status tracking per document
CREATE TABLE document_monthly_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type_id uuid NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year_month text NOT NULL,
  has_document boolean NOT NULL DEFAULT false,
  observation text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_type_id, year_month)
);

-- Report generation logs
CREATE TABLE document_report_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year_month text NOT NULL,
  generated_by uuid NOT NULL REFERENCES auth.users(id),
  generated_at timestamptz NOT NULL DEFAULT now()
);

-- Add exclude flag to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS exclude_from_doc_report boolean NOT NULL DEFAULT false;

-- Indexes
CREATE INDEX idx_document_types_client ON document_types(client_id);
CREATE INDEX idx_document_monthly_status_client_month ON document_monthly_status(client_id, year_month);
CREATE INDEX idx_document_monthly_status_doc_type ON document_monthly_status(document_type_id);
CREATE INDEX idx_document_report_logs_client ON document_report_logs(client_id, year_month);

-- RLS
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_monthly_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_report_logs ENABLE ROW LEVEL SECURITY;

-- Policies: all authenticated users can read, admins can write
CREATE POLICY "Authenticated users can read document_types" ON document_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage document_types" ON document_types FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Authenticated users can read document_monthly_status" ON document_monthly_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage document_monthly_status" ON document_monthly_status FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read document_report_logs" ON document_report_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert document_report_logs" ON document_report_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Auto-update timestamps
CREATE TRIGGER update_document_types_updated_at BEFORE UPDATE ON document_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_monthly_status_updated_at BEFORE UPDATE ON document_monthly_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
