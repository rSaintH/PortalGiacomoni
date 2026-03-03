import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileJson, Download, Copy, CheckCircle2 } from "lucide-react";

const INSERT_ORDER = [
  "sectors",
  "sections",
  "profiles",
  "user_roles",
  "tags",
  "parameter_options",
  "regime_period_config",
  "clients",
  "client_particularities",
  "client_tags",
  "client_partners",
  "client_favorites",
  "sector_styles",
  "client_sector_styles",
  "pops",
  "pop_revisions",
  "pop_versions",
  "client_pop_notes",
  "tasks",
  "task_comments",
  "occurrences",
  "occurrence_comments",
  "reinf_entries",
  "reinf_logs",
  "reinf_partner_profits",
  "document_types",
  "document_monthly_status",
  "document_report_logs",
  "doc_tags",
  "document_type_doc_tags",
  "permission_settings",
  "management_config",
  "management_reviews",
  "user_palettes",
  "fator_r_fiscal_sync",
  "fator_r_sync_cursor",
  "fator_r_pull_config",
];

// Colunas geradas que não devem ser inseridas
const GENERATED_COLUMNS: Record<string, string[]> = {
  fator_r_fiscal_sync: ["cnpj_digits"],
  management_config: ["id"],
};

function escapeSQL(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) {
    // PostgreSQL array literal
    const items = val.map((v) => {
      if (v === null || v === undefined) return "NULL";
      return `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    });
    return `'{${items.join(",")}}'`;
  }
  if (typeof val === "object") {
    // JSONB
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  // String
  return `'${String(val).replace(/'/g, "''")}'`;
}

// FKs que apontam para auth.users (precisam ser dropadas temporariamente)
const AUTH_USER_FKS: { table: string; constraint: string; column: string }[] = [
  { table: "user_roles", constraint: "user_roles_user_id_fkey", column: "user_id" },
  { table: "profiles", constraint: "profiles_user_id_fkey", column: "user_id" },
  { table: "sectors", constraint: "sectors_created_by_fkey", column: "created_by" },
  { table: "sectors", constraint: "sectors_updated_by_fkey", column: "updated_by" },
  { table: "sections", constraint: "sections_created_by_fkey", column: "created_by" },
  { table: "sections", constraint: "sections_updated_by_fkey", column: "updated_by" },
  { table: "clients", constraint: "clients_created_by_fkey", column: "created_by" },
  { table: "clients", constraint: "clients_updated_by_fkey", column: "updated_by" },
  { table: "client_particularities", constraint: "client_particularities_created_by_fkey", column: "created_by" },
  { table: "client_particularities", constraint: "client_particularities_updated_by_fkey", column: "updated_by" },
  { table: "pops", constraint: "pops_created_by_fkey", column: "created_by" },
  { table: "pops", constraint: "pops_updated_by_fkey", column: "updated_by" },
  { table: "pop_revisions", constraint: "pop_revisions_created_by_fkey", column: "created_by" },
  { table: "pop_revisions", constraint: "pop_revisions_reviewer_id_fkey", column: "reviewer_id" },
  { table: "tasks", constraint: "tasks_created_by_fkey", column: "created_by" },
  { table: "tasks", constraint: "tasks_updated_by_fkey", column: "updated_by" },
  { table: "tasks", constraint: "tasks_assignee_id_fkey", column: "assignee_id" },
  { table: "task_comments", constraint: "task_comments_created_by_fkey", column: "created_by" },
  { table: "occurrences", constraint: "occurrences_created_by_fkey", column: "created_by" },
  { table: "document_types", constraint: "document_types_created_by_fkey", column: "created_by" },
  { table: "document_types", constraint: "document_types_updated_by_fkey", column: "updated_by" },
  { table: "document_monthly_status", constraint: "document_monthly_status_updated_by_fkey", column: "updated_by" },
  { table: "document_report_logs", constraint: "document_report_logs_generated_by_fkey", column: "generated_by" },
  { table: "doc_tags", constraint: "doc_tags_created_by_fkey", column: "created_by" },
  { table: "doc_tags", constraint: "doc_tags_updated_by_fkey", column: "updated_by" },
  { table: "user_palettes", constraint: "user_palettes_user_id_fkey", column: "user_id" },
  { table: "client_favorites", constraint: "client_favorites_user_id_fkey", column: "user_id" },
  { table: "management_config", constraint: "management_config_user_id_fkey", column: "user_id" },
  { table: "management_config", constraint: "management_config_updated_by_fkey", column: "updated_by" },
  { table: "management_reviews", constraint: "management_reviews_reviewed_by_fkey", column: "reviewed_by" },
  { table: "permission_settings", constraint: "permission_settings_updated_by_fkey", column: "updated_by" },
  { table: "fator_r_pull_config", constraint: "fator_r_pull_config_updated_by_fkey", column: "updated_by" },
];

function generateSQL(data: Record<string, unknown[]>): string {
  const lines: string[] = [];

  lines.push("-- ==============================================");
  lines.push("-- IMPORTAÇÃO DE DADOS - Portal Giacomoni");
  lines.push("-- Gerado em " + new Date().toISOString());
  lines.push("-- ==============================================");
  lines.push("");
  lines.push("-- Desabilitar triggers de usuario (updated_at etc)");
  lines.push("SET session_replication_role = 'replica';");
  lines.push("");
  lines.push("-- Dropar FKs que apontam para auth.users (serao recriadas no final)");
  for (const fk of AUTH_USER_FKS) {
    lines.push(`ALTER TABLE IF EXISTS public.${fk.table} DROP CONSTRAINT IF EXISTS ${fk.constraint};`);
  }
  lines.push("");

  // Criar usuarios em auth.users com os mesmos UUIDs
  const profiles = data["profiles"] as Record<string, unknown>[] | undefined;
  if (profiles && profiles.length > 0) {
    lines.push("-- =============================================");
    lines.push("-- CRIAR USUARIOS EM auth.users COM MESMOS UUIDs");
    lines.push("-- =============================================");
    lines.push("");
    for (const profile of profiles) {
      const userId = profile.user_id as string;
      const email = (profile.email as string) || `user_${userId.slice(0, 8)}@imported.local`;
      const fullName = (profile.full_name as string) || "Usuário Importado";
      // Senha temporária - todos os usuarios importados devem trocar a senha
      lines.push(
        `INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current)` +
        ` VALUES (${escapeSQL(userId)}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${escapeSQL(email)}, crypt('TrocarSenha123!', gen_salt('bf')), now(), now(), now(), '', '', '', '')` +
        ` ON CONFLICT (id) DO NOTHING;`
      );
    }
    lines.push("");
    // Criar identities para que o login funcione
    lines.push("-- Criar identities para login por email");
    for (const profile of profiles) {
      const userId = profile.user_id as string;
      const email = (profile.email as string) || `user_${userId.slice(0, 8)}@imported.local`;
      lines.push(
        `INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)` +
        ` VALUES (gen_random_uuid(), ${escapeSQL(userId)}, ${escapeSQL(userId)}, 'email', jsonb_build_object('sub', ${escapeSQL(userId)}, 'email', ${escapeSQL(email)}), now(), now(), now())` +
        ` ON CONFLICT DO NOTHING;`
      );
    }
    lines.push("");
  }

  const allTables = [
    ...INSERT_ORDER,
    ...Object.keys(data).filter((t) => !INSERT_ORDER.includes(t)),
  ];

  for (const table of allTables) {
    const rows = data[table];
    if (!rows || rows.length === 0) continue;

    const skipCols = GENERATED_COLUMNS[table] || [];

    lines.push(`-- ${table} (${rows.length} registros)`);

    for (const row of rows) {
      const obj = row as Record<string, unknown>;
      const cols = Object.keys(obj).filter((c) => !skipCols.includes(c));
      const vals = cols.map((c) => escapeSQL(obj[c]));
      lines.push(
        `INSERT INTO public.${table} (${cols.join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT DO NOTHING;`
      );
    }

    lines.push("");
  }

  lines.push("-- Recriar FKs para auth.users");
  for (const fk of AUTH_USER_FKS) {
    lines.push(
      `DO $$ BEGIN ALTER TABLE public.${fk.table} ADD CONSTRAINT ${fk.constraint} FOREIGN KEY (${fk.column}) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
    );
  }
  lines.push("");
  lines.push("SET session_replication_role = 'origin';");
  lines.push("");
  lines.push("-- FIM");

  return lines.join("\n");
}

export default function ImportData() {
  const { isAdmin } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [jsonData, setJsonData] = useState<Record<string, unknown[]> | null>(null);
  const [fileName, setFileName] = useState("");
  const [sqlGenerated, setSqlGenerated] = useState("");
  const [copied, setCopied] = useState(false);

  if (!isAdmin) return <Navigate to="/" replace />;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSqlGenerated("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        setJsonData(parsed);
      } catch {
        alert("Arquivo JSON inválido!");
      }
    };
    reader.readAsText(file);
  };

  const generate = () => {
    if (!jsonData) return;
    const sql = generateSQL(jsonData);
    setSqlGenerated(sql);
  };

  const downloadSQL = () => {
    const blob = new Blob([sqlGenerated], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import_data_${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySQL = async () => {
    await navigator.clipboard.writeText(sqlGenerated);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const tableCount = jsonData
    ? Object.keys(jsonData).filter((t) => (jsonData[t]?.length || 0) > 0).length
    : 0;
  const totalRows = jsonData
    ? Object.values(jsonData).reduce((sum, arr) => sum + (arr?.length || 0), 0)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Importar Dados no Banco Novo</h1>

      {/* Passo 1: Upload do JSON */}
      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="font-semibold text-lg">1. Selecionar JSON exportado</h2>
        <p className="text-sm text-muted-foreground">
          Selecione o arquivo <code>supabase_export_*.json</code> que você baixou.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <FileJson className="h-4 w-4 mr-2" />
            {fileName || "Selecionar arquivo JSON"}
          </Button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleFile} className="hidden" />
        </div>
        {jsonData && (
          <p className="text-sm text-green-600">
            {tableCount} tabelas com dados, {totalRows} registros total.
          </p>
        )}
      </div>

      {/* Passo 2: Gerar SQL */}
      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="font-semibold text-lg">2. Gerar SQL de importação</h2>
        <Button onClick={generate} disabled={!jsonData}>
          Gerar SQL
        </Button>

        {sqlGenerated && (
          <div className="space-y-3">
            <p className="text-sm text-green-600">
              SQL gerado com {sqlGenerated.split("\n").length} linhas.
            </p>
            <div className="flex gap-2">
              <Button onClick={downloadSQL} variant="outline">
                <Download className="h-4 w-4 mr-2" /> Baixar arquivo .sql
              </Button>
              <Button onClick={copySQL} variant="outline">
                {copied ? (
                  <><CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> Copiado!</>
                ) : (
                  <><Copy className="h-4 w-4 mr-2" /> Copiar SQL</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Passo 3: Instruções */}
      {sqlGenerated && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
          <h2 className="font-semibold text-lg">3. Rodar no banco novo</h2>
          <ol className="text-sm space-y-2 list-decimal list-inside">
            <li>Abra o <b>Supabase Dashboard</b> do projeto novo</li>
            <li>Vá em <b>SQL Editor</b> (menu lateral esquerdo)</li>
            <li>Clique em <b>New Query</b></li>
            <li>Cole o SQL (ou abra o arquivo .sql baixado)</li>
            <li>Clique em <b>Run</b></li>
            <li>Aguarde finalizar - pode demorar dependendo do volume de dados</li>
          </ol>
          <p className="text-sm text-muted-foreground mt-2">
            <b>Nota:</b> O SQL usa <code>ON CONFLICT DO NOTHING</code>, então é seguro rodar mais de uma vez.
            Os triggers são desabilitados temporariamente para evitar que <code>updated_at</code> seja sobrescrito.
          </p>
        </div>
      )}
    </div>
  );
}
