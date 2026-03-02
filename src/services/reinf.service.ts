import { supabase } from "@/integrations/supabase/client";

export async function fetchReinfProfiles() {
  const { data, error } = await supabase.from("profiles").select("user_id, full_name");
  if (error) throw error;
  return data || [];
}

export async function fetchReinfLogs(entryIds: string[]) {
  if (entryIds.length === 0) return [];
  const { data, error } = await supabase
    .from("reinf_logs")
    .select("*")
    .in("reinf_entry_id", entryIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAllClientPartners() {
  const { data, error } = await supabase
    .from("client_partners")
    .select("id, client_id, name")
    .order("order_index");
  if (error) throw error;
  return data || [];
}

export async function fetchReinfEntries(payload: { ano: number; trimestre: number }) {
  const { data, error } = await supabase
    .from("reinf_entries")
    .select("*, clients(legal_name, trade_name)")
    .eq("ano", payload.ano)
    .eq("trimestre", payload.trimestre)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as any[];
}

export async function fetchPartnerProfitsByEntryIds(entryIds: string[]) {
  if (entryIds.length === 0) return [];
  const { data, error } = await supabase
    .from("reinf_partner_profits")
    .select("*")
    .in("reinf_entry_id", entryIds);
  if (error) throw error;
  return (data || []) as any[];
}

export async function fetchPartnerProfitsByEntryAndMonth(entryId: string, mes: number) {
  const { data, error } = await supabase
    .from("reinf_partner_profits")
    .select("*")
    .eq("reinf_entry_id", entryId)
    .eq("mes", mes);
  if (error) throw error;
  return (data || []) as any[];
}

export async function insertReinfLog(payload: {
  entryId: string;
  userId: string;
  action: string;
  details?: string;
}) {
  const { error } = await supabase.from("reinf_logs").insert({
    reinf_entry_id: payload.entryId,
    user_id: payload.userId,
    action: payload.action,
    details: payload.details || null,
  });
  if (error) throw error;
}

export async function createReinfEntry(payload: {
  clientId: string;
  ano: number;
  trimestre: number;
  userId?: string;
}) {
  const { data, error } = await supabase
    .from("reinf_entries")
    .insert({
      client_id: payload.clientId,
      ano: payload.ano,
      trimestre: payload.trimestre,
      created_by: payload.userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function updateReinfEntry(entryId: string, updateData: Record<string, unknown>) {
  const { error } = await supabase.from("reinf_entries").update(updateData).eq("id", entryId);
  if (error) throw error;
}

export async function replacePartnerProfitsForMonth(payload: {
  entryId: string;
  mes: number;
  values: { partner_id: string; valor: number }[];
}) {
  const { error: deleteError } = await supabase
    .from("reinf_partner_profits")
    .delete()
    .eq("reinf_entry_id", payload.entryId)
    .eq("mes", payload.mes);
  if (deleteError) throw deleteError;

  if (payload.values.length === 0) return;

  const rows = payload.values.map((value) => ({
    reinf_entry_id: payload.entryId,
    partner_id: value.partner_id,
    mes: payload.mes,
    valor: value.valor,
  }));
  const { error: insertError } = await supabase.from("reinf_partner_profits").insert(rows);
  if (insertError) throw insertError;
}
