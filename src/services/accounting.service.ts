import { supabase } from "@/integrations/supabase/client";

export async function fetchFiscalSyncByMonth(yearMonth: string) {
  const { data, error } = await supabase
    .from("fator_r_fiscal_sync")
    .select("cnpj, cnpj_digits, competencia, fiscal_fechou, source_updated_at")
    .eq("competencia", yearMonth);

  if (error) throw error;
  return data || [];
}

export async function fetchFiscalSyncCnpjBase() {
  const { data, error } = await supabase
    .from("fator_r_fiscal_sync")
    .select("cnpj, cnpj_digits, source_updated_at")
    .order("source_updated_at", { ascending: false })
    .limit(50000);

  if (error) throw error;
  return data || [];
}

export async function fetchFatorSyncCursor() {
  const { data, error } = await supabase
    .from("fator_r_sync_cursor")
    .select("last_pull_at, last_pull_status, last_pull_message")
    .eq("id", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function runFatorFiscalPull(batchSize = 5000) {
  const { data, error } = await supabase.rpc("run_fator_r_fiscal_pull", {
    p_batch_size: batchSize,
  });

  if (error) throw error;
  return (data ?? null) as { ok?: boolean; imported_rows?: number; message?: string } | null;
}
