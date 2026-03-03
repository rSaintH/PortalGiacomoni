/**
 * Script de importação de dados para o novo Supabase.
 *
 * Uso:
 *   node scripts/import-data.mjs <caminho-do-json> <SUPABASE_URL_NOVO> <SERVICE_ROLE_KEY_NOVO>
 *
 * Exemplo:
 *   node scripts/import-data.mjs ./supabase_export_2026-03-03.json https://xyz.supabase.co eyJ...
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const [jsonPath, supabaseUrl, serviceRoleKey] = process.argv.slice(2);

if (!jsonPath || !supabaseUrl || !serviceRoleKey) {
  console.error(
    "Uso: node scripts/import-data.mjs <json> <SUPABASE_URL> <SERVICE_ROLE_KEY>"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const data = JSON.parse(readFileSync(jsonPath, "utf-8"));

// Ordem de inserção respeitando foreign keys
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

async function importTable(table, rows) {
  if (!rows || rows.length === 0) {
    console.log(`  ⏭  ${table}: vazio, pulando`);
    return;
  }

  // Inserir em lotes de 500
  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, {
      onConflict: "id",
      ignoreDuplicates: true,
    });

    if (error) {
      // Tentar sem onConflict para tabelas sem coluna "id" como PK
      const { error: error2 } = await supabase.from(table).insert(batch);
      if (error2) {
        console.error(`  ❌ ${table}: ${error2.message}`);
        // Tentar row por row para identificar o problema
        let rowErrors = 0;
        for (const row of batch) {
          const { error: rowErr } = await supabase.from(table).upsert(row, {
            ignoreDuplicates: true,
          });
          if (rowErr) {
            rowErrors++;
            if (rowErrors <= 3) {
              console.error(`     Row error: ${rowErr.message}`);
            }
          } else {
            inserted++;
          }
        }
        if (rowErrors > 3) {
          console.error(`     ... e mais ${rowErrors - 3} erros`);
        }
        continue;
      }
    }
    inserted += batch.length;
  }

  console.log(`  ✅ ${table}: ${inserted}/${rows.length} registros`);
}

async function main() {
  console.log("🚀 Iniciando importação...\n");

  for (const table of INSERT_ORDER) {
    if (data[table]) {
      await importTable(table, data[table]);
    } else {
      console.log(`  ⏭  ${table}: não encontrado no JSON`);
    }
  }

  // Importar tabelas extras que podem existir no JSON mas não na lista
  const extraTables = Object.keys(data).filter(
    (t) => !INSERT_ORDER.includes(t)
  );
  for (const table of extraTables) {
    console.log(`  📦 Tabela extra: ${table}`);
    await importTable(table, data[table]);
  }

  console.log("\n✅ Importação concluída!");
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
