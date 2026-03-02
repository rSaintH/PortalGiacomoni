import { supabase } from "@/integrations/supabase/client";

export async function createSector(name: string, userId?: string) {
  const { error } = await supabase.from("sectors").insert({
    name,
    created_by: userId,
    updated_by: userId,
  });
  if (error) throw error;
}

export async function createSection(name: string, sectorId: string, userId?: string) {
  const { error } = await supabase.from("sections").insert({
    name,
    sector_id: sectorId,
    created_by: userId,
    updated_by: userId,
  });
  if (error) throw error;
}

export async function createSectorStyle(name: string, sectorId: string, userId?: string) {
  const { error } = await supabase.from("sector_styles").insert({
    sector_id: sectorId,
    name,
    created_by: userId,
    updated_by: userId,
  });
  if (error) throw error;
}

export async function replaceUserRole(userId: string, role: string) {
  const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", userId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("user_roles").insert({ user_id: userId, role });
  if (insertError) throw insertError;
}

export async function updateUserFunction(payload: {
  userId: string;
  sectorId?: string | null;
  fullName?: string;
  password?: string;
}) {
  const { userId, ...fields } = payload;
  const response = await supabase.functions.invoke("update-user", {
    body: {
      user_id: userId,
      ...(fields.sectorId !== undefined ? { sector_id: fields.sectorId } : {}),
      ...(fields.fullName !== undefined ? { full_name: fields.fullName } : {}),
      ...(fields.password !== undefined ? { password: fields.password } : {}),
    },
  });

  if (response.error) throw new Error(response.error.message);
  if (response.data?.error) throw new Error(response.data.error);
}

export async function createUserWithRole(payload: {
  email: string;
  password: string;
  fullName: string;
  sectorId: string | null;
  role: string;
}) {
  const response = await supabase.functions.invoke("create-user", {
    body: {
      email: payload.email,
      password: payload.password,
      full_name: payload.fullName,
      sector_id: payload.sectorId,
    },
  });

  if (response.error) throw new Error(response.error.message || "Erro ao criar usuario");
  if (response.data?.error) throw new Error(response.data.error);

  const userId = response.data?.user?.id as string | undefined;
  if (userId) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: payload.role });
    if (error) throw error;
  }
}

export async function createTag(payload: { name: string; color: string; userId?: string }) {
  const { error } = await supabase.from("tags").insert({
    name: payload.name,
    color: payload.color,
    created_by: payload.userId,
  });
  if (error) throw error;
}

export async function deleteTag(tagId: string) {
  const { error } = await supabase.from("tags").delete().eq("id", tagId);
  if (error) throw error;
}

export async function createDocTag(payload: { name: string; color: string; textColor: string; userId?: string }) {
  const { error } = await supabase.from("doc_tags").insert({
    name: payload.name,
    color: payload.color,
    text_color: payload.textColor,
    created_by: payload.userId,
  });
  if (error) throw error;
}

export async function deleteDocTag(tagId: string) {
  const { error } = await supabase.from("doc_tags").delete().eq("id", tagId);
  if (error) throw error;
}

export async function saveManagementReviewer(payload: {
  key: string;
  userId: string;
  actorUserId?: string;
  hasExisting: boolean;
}) {
  if (payload.hasExisting) {
    const { error } = await supabase
      .from("management_config" as any)
      .update({ user_id: payload.userId, updated_by: payload.actorUserId, updated_at: new Date().toISOString() })
      .eq("key", payload.key);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("management_config" as any)
    .insert({ key: payload.key, user_id: payload.userId, updated_by: payload.actorUserId });
  if (error) throw error;
}

export async function updatePermissionRoles(payload: { permKey: string; roles: string[]; userId?: string }) {
  const { error } = await supabase
    .from("permission_settings")
    .update({ allowed_roles: payload.roles, updated_by: payload.userId })
    .eq("key", payload.permKey);
  if (error) throw error;
}

export async function updatePermissionSectors(payload: { permKey: string; sectors: string[]; userId?: string }) {
  const { error } = await supabase
    .from("permission_settings")
    .update({ allowed_sectors: payload.sectors, updated_by: payload.userId })
    .eq("key", payload.permKey);
  if (error) throw error;
}

export async function updatePermissionSwitch(payload: { permKey: string; enabled: boolean; userId?: string }) {
  const { error } = await supabase
    .from("permission_settings")
    .update({ enabled: payload.enabled, updated_by: payload.userId })
    .eq("key", payload.permKey);
  if (error) throw error;
}
