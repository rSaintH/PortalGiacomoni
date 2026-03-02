import { supabase } from "@/integrations/supabase/client";

interface UpsertPopPayload {
  popId?: string;
  version?: number;
  title: string;
  objective: string;
  steps: string;
  scope: string;
  status: string;
  clientId: string;
  sectorId: string;
  sectionId: string;
  selectedTagIds: string[];
  editorRoles: string[];
  userId?: string;
}

function normalizeUuid(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function upsertPop(payload: UpsertPopPayload) {
  const sectorId = normalizeUuid(payload.sectorId);
  const sectionId = normalizeUuid(payload.sectionId);
  const clientId = normalizeUuid(payload.clientId);
  const userId = normalizeUuid(payload.userId);

  if (!sectorId) {
    throw new Error("Selecione um setor antes de salvar o POP.");
  }
  if (payload.scope === "Cliente" && !clientId) {
    throw new Error("Selecione um cliente para POP com escopo Cliente.");
  }

  const body = {
    title: payload.title,
    objective: payload.objective,
    steps: payload.steps,
    scope: payload.scope,
    status: payload.status,
    sector_id: sectorId,
    section_id: sectionId,
    client_id: payload.scope === "Cliente" ? clientId : null,
    tag_ids: payload.scope === "Tag" ? payload.selectedTagIds : [],
    editor_roles: payload.editorRoles,
    updated_by: userId,
  };

  if (payload.popId) {
    const { error } = await supabase
      .from("pops")
      .update({
        ...body,
        version: (payload.version || 1) + 1,
      })
      .eq("id", payload.popId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("pops").insert({
    ...body,
    created_by: userId,
  });
  if (error) throw error;
}

export async function deletePop(popId: string) {
  const { error } = await supabase.from("pops").delete().eq("id", popId);
  if (error) throw error;
}

export async function restorePopVersion(popId: string, version: any, userId?: string) {
  const { error } = await supabase
    .from("pops")
    .update({
      title: version.title,
      objective: version.objective,
      steps: version.steps,
      links: version.links,
      scope: version.scope,
      status: version.status,
      sector_id: version.sector_id,
      section_id: version.section_id,
      client_id: version.client_id,
      editor_roles: version.editor_roles,
      tag_ids: version.tag_ids,
      updated_by: userId,
    })
    .eq("id", popId);
  if (error) throw error;
}

export async function saveClientPopNote(payload: {
  noteId?: string;
  clientId: string;
  popId: string;
  content: string;
  userId?: string;
}) {
  if (payload.noteId) {
    const { error } = await supabase
      .from("client_pop_notes")
      .update({ content: payload.content, updated_by: payload.userId })
      .eq("id", payload.noteId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("client_pop_notes").insert({
    client_id: payload.clientId,
    pop_id: payload.popId,
    content: payload.content,
    created_by: payload.userId,
    updated_by: payload.userId,
  });
  if (error) throw error;
}

export async function fetchPopById(popId: string) {
  const { data, error } = await supabase
    .from("pops")
    .select("*, sectors(name), sections(name), clients(legal_name, trade_name)")
    .eq("id", popId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function uploadPopImage(file: File) {
  const extension = file.name.split(".").pop() || "png";
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from("pop-images").upload(path, file, {
    contentType: file.type,
  });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("pop-images").getPublicUrl(path);

  return publicUrl;
}
