import { supabase } from "@/integrations/supabase/client";

export interface ClientFormData {
  legal_name: string;
  trade_name: string;
  cnpj: string;
  status: string;
  group_name: string;
  notes_quick: string;
  exclude_from_doc_report: boolean;
}

export interface ClientTagSelection {
  tagId: string;
  sectorId: string | null;
}

export interface ClientPartnerInput {
  id?: string;
  name: string;
}

interface SaveClientPayload {
  clientId?: string;
  form: ClientFormData;
  userId?: string;
  styleSelections: Record<string, string>;
  existingClientStyles?: any[];
  selectedTags: ClientTagSelection[];
  existingClientTags?: any[];
  hasPartners: boolean;
  partners: ClientPartnerInput[];
}

export interface ImportClientRow {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  grupo: string;
  informarSocios: boolean;
  socios: string[];
}

export async function fetchAllClientTags() {
  const { data, error } = await supabase.from("client_tags").select("client_id, tag_id");
  if (error) throw error;
  return data || [];
}

export async function toggleClientFavorite(userId: string, clientId: string, isFavorite: boolean) {
  if (isFavorite) {
    const { error } = await supabase
      .from("client_favorites" as any)
      .delete()
      .eq("user_id", userId)
      .eq("client_id", clientId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("client_favorites" as any)
    .insert({ user_id: userId, client_id: clientId });
  if (error) throw error;
}

export async function fetchClientPartners(clientId: string) {
  if (!clientId) return [];
  const { data, error } = await supabase
    .from("client_partners")
    .select("id, name, order_index")
    .eq("client_id", clientId)
    .order("order_index");
  if (error) throw error;
  return data || [];
}

export async function saveClientWithRelations(payload: SaveClientPayload): Promise<string> {
  const {
    clientId: initialClientId,
    form,
    userId,
    styleSelections,
    existingClientStyles = [],
    selectedTags,
    existingClientTags = [],
    hasPartners,
    partners,
  } = payload;

  let clientId = initialClientId;

  if (clientId) {
    const { error } = await supabase
      .from("clients")
      .update({ ...form, updated_by: userId })
      .eq("id", clientId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("clients")
      .insert({ ...form, created_by: userId, updated_by: userId })
      .select("id")
      .single();
    if (error) throw error;
    clientId = data.id;
  }

  for (const [sectorId, styleId] of Object.entries(styleSelections)) {
    if (!styleId || styleId === "none") {
      const { error } = await supabase
        .from("client_sector_styles")
        .delete()
        .eq("client_id", clientId)
        .eq("sector_id", sectorId);
      if (error) throw error;
      continue;
    }

    const existing = existingClientStyles.find((cs: any) => cs.sector_id === sectorId);
    if (existing) {
      const { error } = await supabase
        .from("client_sector_styles")
        .update({ style_id: styleId, updated_by: userId })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("client_sector_styles").insert({
        client_id: clientId,
        sector_id: sectorId,
        style_id: styleId,
        updated_by: userId,
      });
      if (error) throw error;
    }
  }

  const existingTagKeys = existingClientTags.map((ct: any) => `${ct.tag_id}__${ct.sector_id || ""}`);
  const newTagKeys = selectedTags.map((tag) => `${tag.tagId}__${tag.sectorId || ""}`);

  for (const ct of existingClientTags) {
    const key = `${ct.tag_id}__${ct.sector_id || ""}`;
    if (!newTagKeys.includes(key)) {
      const { error } = await supabase.from("client_tags").delete().eq("id", ct.id);
      if (error) throw error;
    }
  }

  for (const tag of selectedTags) {
    const key = `${tag.tagId}__${tag.sectorId || ""}`;
    if (!existingTagKeys.includes(key)) {
      const { error } = await supabase
        .from("client_tags")
        .insert({ client_id: clientId, tag_id: tag.tagId, sector_id: tag.sectorId } as any);
      if (error) throw error;
    }
  }

  if (hasPartners) {
    const { data: existingPartners, error: existingPartnersError } = await supabase
      .from("client_partners")
      .select("id")
      .eq("client_id", clientId);
    if (existingPartnersError) throw existingPartnersError;

    const existingIds = (existingPartners || []).map((p: any) => p.id);
    const currentIds = partners.filter((p) => p.id).map((p) => p.id as string);

    for (const existingId of existingIds) {
      if (!currentIds.includes(existingId)) {
        const { error } = await supabase.from("client_partners").delete().eq("id", existingId);
        if (error) throw error;
      }
    }

    for (let index = 0; index < partners.length; index += 1) {
      const partner = partners[index];
      if (!partner.name.trim()) continue;

      if (partner.id) {
        const { error } = await supabase
          .from("client_partners")
          .update({ name: partner.name.trim(), order_index: index })
          .eq("id", partner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_partners").insert({
          client_id: clientId,
          name: partner.name.trim(),
          order_index: index,
        });
        if (error) throw error;
      }
    }
  } else {
    const { error } = await supabase.from("client_partners").delete().eq("client_id", clientId);
    if (error) throw error;
  }

  return clientId;
}

export async function importClientsFromCsv(rows: ImportClientRow[], userId?: string) {
  if (rows.length === 0) return { importedCount: 0, duplicateCnpjs: [] as string[] };

  const cnpjs = rows.map((row) => row.cnpj).filter(Boolean);
  const { data: existing, error: existingError } = await supabase
    .from("clients")
    .select("cnpj")
    .in("cnpj", cnpjs);
  if (existingError) throw existingError;

  const existingSet = new Set((existing || []).map((item) => item.cnpj));
  const duplicateCnpjs = rows.filter((row) => existingSet.has(row.cnpj)).map((row) => row.cnpj);
  if (duplicateCnpjs.length > 0) {
    return { importedCount: 0, duplicateCnpjs };
  }

  for (const row of rows) {
    const { data: client, error } = await supabase
      .from("clients")
      .insert({
        legal_name: row.razaoSocial,
        trade_name: row.nomeFantasia,
        cnpj: row.cnpj,
        group_name: row.grupo || null,
        created_by: userId,
        updated_by: userId,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Erro ao inserir "${row.razaoSocial}": ${error.message}`);
    }

    if (row.informarSocios && row.socios.length > 0) {
      const partners = row.socios.map((name, index) => ({
        client_id: client.id,
        name,
        order_index: index,
      }));
      const { error: partnerError } = await supabase.from("client_partners").insert(partners);
      if (partnerError) {
        throw new Error(`Erro ao inserir socios de "${row.razaoSocial}": ${partnerError.message}`);
      }
    }
  }

  return { importedCount: rows.length, duplicateCnpjs: [] as string[] };
}

export async function createClientParticularity(payload: {
  clientId: string;
  sectorId: string;
  sectionId: string;
  title: string;
  details: string;
  priority: string;
  userId?: string;
}) {
  const { error } = await supabase.from("client_particularities").insert({
    client_id: payload.clientId,
    sector_id: payload.sectorId,
    section_id: payload.sectionId || null,
    title: payload.title,
    details: payload.details || null,
    priority: payload.priority,
    created_by: payload.userId,
    updated_by: payload.userId,
  });
  if (error) throw error;
}

export async function deleteClientParticularity(particularityId: string) {
  const { error } = await supabase.from("client_particularities").delete().eq("id", particularityId);
  if (error) throw error;
}
