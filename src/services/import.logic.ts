export type ExportDataMap = Record<string, unknown[]>;

export type UsersRow = {
  id?: string;
  user_id?: string;
  email?: string;
};

export type MappingFallbackDetail = {
  oldId: string;
  email: string;
};

export type MappingReport = {
  mappedCount: number;
  fallbackCount: number;
  fallbackDetails: MappingFallbackDetail[];
};

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

const GENERATED_COLUMNS: Record<string, string[]> = {
  fator_r_fiscal_sync: ["cnpj_digits"],
  management_config: ["id"],
};

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

function escapeSQL(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) {
    const items = val.map((v) => {
      if (v === null || v === undefined) return "NULL";
      return `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    });
    return `'{${items.join(",")}}'`;
  }
  if (typeof val === "object") {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

export function parseUsersRowsJson(payload: unknown): UsersRow[] {
  if (Array.isArray(payload)) return payload as UsersRow[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.rows)) return obj.rows as UsersRow[];
    if (Array.isArray(obj.users)) return obj.users as UsersRow[];
    if (Array.isArray(obj.data)) return obj.data as UsersRow[];
  }
  return [];
}

export function generateImportSqlLegacy(data: ExportDataMap): string {
  const lines: string[] = [];

  lines.push("-- ==============================================");
  lines.push("-- IMPORTACAO DE DADOS - MODO LEGADO");
  lines.push("-- Gerado em " + new Date().toISOString());
  lines.push("-- ==============================================");
  lines.push("");
  lines.push("SET session_replication_role = 'replica';");
  lines.push("");
  lines.push("-- Dropar FKs que apontam para auth.users");
  for (const fk of AUTH_USER_FKS) {
    lines.push(`ALTER TABLE IF EXISTS public.${fk.table} DROP CONSTRAINT IF EXISTS ${fk.constraint};`);
  }
  lines.push("");

  const profiles = data.profiles as Record<string, unknown>[] | undefined;
  if (profiles && profiles.length > 0) {
    lines.push("-- Criar usuarios em auth.users");
    for (const profile of profiles) {
      const userId = String(profile.user_id || "");
      if (!userId) continue;
      const email = (profile.email as string) || `user_${userId.slice(0, 8)}@imported.local`;
      lines.push(
        `INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current)` +
          ` VALUES (${escapeSQL(userId)}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${escapeSQL(email)}, crypt('TrocarSenha123!', gen_salt('bf')), now(), now(), now(), '', '', '', '')` +
          ` ON CONFLICT (id) DO NOTHING;`
      );
    }
    lines.push("");
    lines.push("-- Criar identities");
    for (const profile of profiles) {
      const userId = String(profile.user_id || "");
      if (!userId) continue;
      const email = (profile.email as string) || `user_${userId.slice(0, 8)}@imported.local`;
      lines.push(
        `INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)` +
          ` VALUES (gen_random_uuid(), ${escapeSQL(userId)}, ${escapeSQL(userId)}, 'email', jsonb_build_object('sub', ${escapeSQL(userId)}, 'email', ${escapeSQL(email)}), now(), now(), now())` +
          ` ON CONFLICT DO NOTHING;`
      );
    }
    lines.push("");
  }

  const allTables = [...INSERT_ORDER, ...Object.keys(data).filter((t) => !INSERT_ORDER.includes(t))];
  for (const table of allTables) {
    const rows = data[table];
    if (!rows || rows.length === 0) continue;

    const skipCols = GENERATED_COLUMNS[table] || [];
    lines.push(`-- ${table} (${rows.length} registros)`);

    for (const row of rows) {
      const obj = row as Record<string, unknown>;
      const cols = Object.keys(obj).filter((c) => !skipCols.includes(c));
      const vals = cols.map((c) => escapeSQL(obj[c]));
      lines.push(`INSERT INTO public.${table} (${cols.join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT DO NOTHING;`);
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

export function generateImportSqlWithExistingUsers(
  data: ExportDataMap,
  usersRows: UsersRow[],
  fallbackEmail: string,
): { sql: string; report: MappingReport } {
  const lines: string[] = [];

  const usersByEmail = new Map<string, string>();
  for (const row of usersRows) {
    const email = (row.email || "").toLowerCase().trim();
    const id = row.id || row.user_id;
    if (email && id) usersByEmail.set(email, id);
  }

  const normalizedFallbackEmail = fallbackEmail.toLowerCase().trim();
  const fallbackId = usersByEmail.get(normalizedFallbackEmail);
  if (!fallbackId) {
    throw new Error(`Email fallback '${fallbackEmail}' nao encontrado em users_rows.json`);
  }

  const oldToNewUser = new Map<string, string>();
  const fallbackDetails: MappingFallbackDetail[] = [];

  const profileRows = (data.profiles || []) as Record<string, unknown>[];
  for (const row of profileRows) {
    const oldId = String(row.user_id || "");
    if (!oldId) continue;
    const email = String(row.email || "").toLowerCase().trim();
    const mapped = usersByEmail.get(email);
    if (mapped) {
      oldToNewUser.set(oldId, mapped);
    } else {
      oldToNewUser.set(oldId, fallbackId);
      fallbackDetails.push({ oldId, email });
    }
  }

  const userRefByTable = new Map<string, Set<string>>();
  for (const fk of AUTH_USER_FKS) {
    if (!userRefByTable.has(fk.table)) userRefByTable.set(fk.table, new Set());
    userRefByTable.get(fk.table)!.add(fk.column);
  }

  lines.push("-- ==============================================");
  lines.push("-- IMPORTACAO DE DADOS - MODO MAPEADO");
  lines.push("-- Gerado em " + new Date().toISOString());
  lines.push(`-- Fallback para usuario sem match: ${fallbackEmail} (${fallbackId})`);
  lines.push("-- ==============================================");
  lines.push("");

  if (fallbackDetails.length > 0) {
    lines.push("-- Emails sem match (mapeados para fallback):");
    for (const item of fallbackDetails) {
      lines.push(`--   ${item.email || "(sem email)"} | old=${item.oldId}`);
    }
    lines.push("");
  }

  lines.push("BEGIN;");
  lines.push("");
  lines.push("SET session_replication_role = 'replica';");
  lines.push("");

  const allTables = [...INSERT_ORDER, ...Object.keys(data).filter((t) => !INSERT_ORDER.includes(t))];
  for (const table of allTables) {
    const rows = data[table];
    if (!rows || rows.length === 0) continue;

    const skipCols = GENERATED_COLUMNS[table] || [];
    const userRefColumns = userRefByTable.get(table) || new Set<string>();
    lines.push(`-- ${table} (${rows.length} registros)`);

    for (const rawRow of rows) {
      const row = { ...(rawRow as Record<string, unknown>) };

      if (table === "profiles") {
        row.user_id = oldToNewUser.get(String(row.user_id || "")) || fallbackId;
        const cols = Object.keys(row).filter((c) => !skipCols.includes(c));
        const vals = cols.map((c) => escapeSQL(row[c]));
        lines.push(
          `INSERT INTO public.profiles (${cols.join(", ")}) VALUES (${vals.join(", ")}) ` +
            `ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, sector_id = EXCLUDED.sector_id, must_change_password = EXCLUDED.must_change_password;`,
        );
        continue;
      }

      if (table === "user_roles") {
        row.user_id = oldToNewUser.get(String(row.user_id || "")) || fallbackId;
        const cols = Object.keys(row).filter((c) => !skipCols.includes(c));
        const vals = cols.map((c) => escapeSQL(row[c]));
        lines.push(`INSERT INTO public.user_roles (${cols.join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT (user_id, role) DO NOTHING;`);
        continue;
      }

      for (const col of userRefColumns) {
        const value = row[col];
        if (value === null || value === undefined) continue;
        row[col] = oldToNewUser.get(String(value)) || fallbackId;
      }

      const cols = Object.keys(row).filter((c) => !skipCols.includes(c));
      const vals = cols.map((c) => escapeSQL(row[c]));
      lines.push(`INSERT INTO public.${table} (${cols.join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT DO NOTHING;`);
    }

    lines.push("");
  }

  lines.push("-- Garantir FKs para auth.users");
  for (const fk of AUTH_USER_FKS) {
    lines.push(
      `DO $$ BEGIN ALTER TABLE public.${fk.table} ADD CONSTRAINT ${fk.constraint} FOREIGN KEY (${fk.column}) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    );
  }
  lines.push("");
  lines.push("SET session_replication_role = 'origin';");
  lines.push("COMMIT;");
  lines.push("");
  lines.push("-- FIM");

  return {
    sql: lines.join("\n"),
    report: {
      mappedCount: oldToNewUser.size - fallbackDetails.length,
      fallbackCount: fallbackDetails.length,
      fallbackDetails,
    },
  };
}

