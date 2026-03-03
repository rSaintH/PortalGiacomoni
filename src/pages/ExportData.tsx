import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

// Tabelas na ordem correta de dependências (pais antes de filhos)
const TABLES = [
  // Sem dependências externas
  "sectors",
  "tags",
  "parameter_options",
  "regime_period_config",
  "permission_settings",
  "management_config",
  // Depende de sectors
  "sections",
  "sector_styles",
  // Depende de sectors (via profiles)
  "profiles",
  "user_roles",
  // Depende de clients
  "clients",
  "client_particularities",
  "client_tags",
  "client_partners",
  "client_favorites",
  // Depende de pops
  "pops",
  "pop_revisions",
  "pop_versions",
  "client_pop_notes",
  // Depende de clients + sector_styles
  "client_sector_styles",
  // Depende de clients
  "tasks",
  "task_comments",
  "occurrences",
  "occurrence_comments",
  // REINF
  "reinf_entries",
  "reinf_logs",
  "reinf_partner_profits",
  // Documentos
  "document_types",
  "document_monthly_status",
  "document_report_logs",
  "doc_tags",
  "document_type_doc_tags",
  // Management
  "management_reviews",
  // User
  "user_palettes",
  // Fator R
  "fator_r_fiscal_sync",
  "fator_r_sync_cursor",
  "fator_r_pull_config",
] as const;

type TableStatus = "pending" | "loading" | "done" | "error" | "empty";

export default function ExportData() {
  const { isAdmin } = useAuth();
  const [statuses, setStatuses] = useState<Record<string, TableStatus>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [running, setRunning] = useState(false);
  const [exportedData, setExportedData] = useState<Record<string, unknown[]> | null>(null);
  const oldSupabaseUrl = import.meta.env.VITE_SUPABASE_OLD_URL as string | undefined;
  const oldSupabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_OLD_SERVICE_ROLE_KEY as string | undefined;
  const oldSupabasePublishableKey =
    (import.meta.env.VITE_SUPABASE_OLD_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_OLD_ANON_KEY as string | undefined);
  const oldSupabaseKey = oldSupabaseServiceRoleKey || oldSupabasePublishableKey;
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const useOldOnLocalhost = Boolean(isLocalhost && oldSupabaseUrl && oldSupabaseKey);
  const useOldServiceRoleOnLocalhost = Boolean(useOldOnLocalhost && oldSupabaseServiceRoleKey);

  const exportClient = useMemo(() => {
    if (useOldOnLocalhost && oldSupabaseUrl && oldSupabaseKey) {
      return createClient<Database>(oldSupabaseUrl, oldSupabaseKey, {
        auth: {
          storage: useOldServiceRoleOnLocalhost ? undefined : localStorage,
          persistSession: !useOldServiceRoleOnLocalhost,
          autoRefreshToken: !useOldServiceRoleOnLocalhost,
          detectSessionInUrl: !useOldServiceRoleOnLocalhost,
        },
      });
    }

    return supabase;
  }, [useOldOnLocalhost, oldSupabaseUrl, oldSupabaseKey, useOldServiceRoleOnLocalhost]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const updateStatus = (table: string, status: TableStatus) => {
    setStatuses((prev) => ({ ...prev, [table]: status }));
  };

  const exportAll = async () => {
    setRunning(true);
    setExportedData(null);
    const allData: Record<string, unknown[]> = {};

    for (const table of TABLES) {
      updateStatus(table, "loading");
      try {
        // Supabase limita a 1000 por request, paginar
        let allRows: unknown[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await exportClient
            .from(table)
            .select("*")
            .range(from, from + pageSize - 1);

          if (error) {
            console.error(`Erro em ${table}:`, error.message);
            // Tabela pode não existir ou sem permissão
            if (error.message.includes("does not exist") || error.code === "42P01") {
              updateStatus(table, "empty");
              break;
            }
            updateStatus(table, "error");
            break;
          }

          if (data && data.length > 0) {
            allRows = allRows.concat(data);
            from += pageSize;
            hasMore = data.length === pageSize;
          } else {
            hasMore = false;
          }
        }

        if (statuses[table] !== "error") {
          allData[table] = allRows;
          setCounts((prev) => ({ ...prev, [table]: allRows.length }));
          updateStatus(table, allRows.length > 0 ? "done" : "empty");
        }
      } catch (err) {
        console.error(`Erro em ${table}:`, err);
        updateStatus(table, "error");
      }
    }

    setExportedData(allData);
    setRunning(false);
  };

  const downloadJson = () => {
    if (!exportedData) return;
    const blob = new Blob([JSON.stringify(exportedData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `supabase_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusIcon = (s: TableStatus | undefined) => {
    if (!s || s === "pending") return null;
    if (s === "loading") return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    if (s === "done") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (s === "empty") return <CheckCircle2 className="h-4 w-4 text-gray-400" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Exportar Dados do Banco</h1>
      <p className="text-muted-foreground">
        Exporta todos os dados de todas as tabelas como JSON. Você precisa estar logado como admin.
      </p>
      <p className="text-xs text-muted-foreground">
        Origem atual: {useOldOnLocalhost ? "banco antigo (somente localhost)" : "banco atual do projeto"}
      </p>
      {useOldOnLocalhost && !useOldServiceRoleOnLocalhost && (
        <p className="text-xs text-amber-600">
          Atenção: exportando com chave pública do banco antigo. Tabelas com RLS podem sair incompletas.
        </p>
      )}

      <div className="flex gap-3">
        <Button onClick={exportAll} disabled={running} size="lg">
          {running ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Exportando...</>
          ) : (
            <><Download className="h-4 w-4 mr-2" /> Iniciar Exportação</>
          )}
        </Button>

        {exportedData && (
          <Button onClick={downloadJson} variant="outline" size="lg">
            <Download className="h-4 w-4 mr-2" /> Baixar JSON
          </Button>
        )}
      </div>

      {Object.keys(statuses).length > 0 && (
        <div className="border rounded-lg p-4 space-y-1">
          {TABLES.map((table) => (
            <div key={table} className="flex items-center gap-2 py-1 text-sm font-mono">
              {statusIcon(statuses[table])}
              <span className={statuses[table] === "empty" ? "text-muted-foreground" : ""}>
                {table}
              </span>
              {counts[table] !== undefined && (
                <span className="text-muted-foreground ml-auto">
                  {counts[table]} registro{counts[table] !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
