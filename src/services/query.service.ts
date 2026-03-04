import { supabase } from "@/integrations/supabase/client";

export type TaskFilters = {
  clientId?: string;
  sectorId?: string;
  status?: string;
};

export async function fetchSectors() {
  const { data, error } = await supabase
    .from("sectors")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data;
}

export async function fetchSections(sectorId?: string) {
  let query = supabase
    .from("sections")
    .select("*, sectors(name)")
    .eq("is_active", true)
    .order("order_index");
  if (sectorId) query = query.eq("sector_id", sectorId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchClients(userId?: string) {
  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .eq("is_archived", false)
    .order("legal_name");
  if (error) throw error;

  const baseClients = clients || [];
  if (!userId || baseClients.length === 0) {
    return baseClients.map((client) => ({ ...client, is_favorite: false }));
  }

  const { data: favoriteRows, error: favoritesError } = await supabase
    .from("client_favorites" as any)
    .select("client_id")
    .eq("user_id", userId);
  if (favoritesError) throw favoritesError;

  const favoriteIds = new Set((favoriteRows || []).map((row: any) => row.client_id));

  return baseClients
    .map((client) => ({
      ...client,
      is_favorite: favoriteIds.has(client.id),
    }))
    .sort((a, b) => {
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      return a.legal_name.localeCompare(b.legal_name, "pt-BR", { sensitivity: "base" });
    });
}

export async function fetchClientById(id: string) {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchClientParticularities(clientId: string) {
  const { data, error } = await supabase
    .from("client_particularities")
    .select("*, sectors(name), sections(name)")
    .eq("client_id", clientId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchAllParticularities(filters?: { sectorId?: string }) {
  let query = supabase
    .from("client_particularities")
    .select("*, sectors(name), sections(name), clients(legal_name, trade_name)")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });
  if (filters?.sectorId) query = query.eq("sector_id", filters.sectorId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchClientPops(clientId: string) {
  const { data, error } = await supabase
    .from("pops")
    .select("*, sectors(name), sections(name)")
    .eq("is_archived", false)
    .or(`scope.eq.Geral,client_id.eq.${clientId}`)
    .order("title");
  if (error) throw error;
  return data;
}

export async function fetchPops() {
  const { data, error } = await supabase
    .from("pops")
    .select("*, sectors(name), sections(name), clients(legal_name)")
    .eq("is_archived", false)
    .order("title");
  if (error) throw error;
  return data;
}

export async function fetchTasks(filters?: TaskFilters) {
  let query = supabase
    .from("tasks")
    .select("*, sectors(name), sections(name), clients(legal_name, trade_name)")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });
  if (filters?.clientId) query = query.eq("client_id", filters.clientId);
  if (filters?.sectorId) query = query.eq("sector_id", filters.sectorId);
  if (filters?.status) query = query.eq("status", filters.status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchTaskComments(taskId: string) {
  const { data, error } = await supabase
    .from("task_comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at");
  if (error) throw error;

  const creatorIds = [...new Set((data || []).map((comment: any) => comment.created_by).filter(Boolean))];
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", creatorIds);
    const profileMap: Record<string, any> = {};
    profiles?.forEach((profile: any) => {
      profileMap[profile.user_id] = profile;
    });
    return data?.map((comment: any) => ({ ...comment, profiles: profileMap[comment.created_by] || null })) || [];
  }

  return data?.map((comment: any) => ({ ...comment, profiles: null })) || [];
}

export async function fetchOccurrenceComments(occurrenceId: string) {
  const { data, error } = await supabase
    .from("occurrence_comments" as any)
    .select("*")
    .eq("occurrence_id", occurrenceId)
    .order("created_at");
  if (error) throw error;

  const creatorIds = [...new Set(((data as any[]) || []).map((comment: any) => comment.created_by).filter(Boolean))];
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", creatorIds);
    const profileMap: Record<string, any> = {};
    profiles?.forEach((profile: any) => {
      profileMap[profile.user_id] = profile;
    });
    return (data as any[])?.map((comment: any) => ({ ...comment, profiles: profileMap[comment.created_by] || null })) || [];
  }

  return (data as any[])?.map((comment: any) => ({ ...comment, profiles: null })) || [];
}

export async function fetchTasksWithComments(filters?: TaskFilters) {
  let query = supabase
    .from("tasks")
    .select("*, sectors(name), sections(name), clients(legal_name, trade_name)")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });
  if (filters?.clientId) query = query.eq("client_id", filters.clientId);
  if (filters?.sectorId) query = query.eq("sector_id", filters.sectorId);
  if (filters?.status) query = query.eq("status", filters.status);
  const { data, error } = await query;
  if (error) throw error;

  if (!data || data.length === 0) {
    return data?.map((task: any) => ({ ...task, profiles: null, comments: [] })) || [];
  }

  const taskIds = data.map((task: any) => task.id);
  const { data: comments } = await supabase
    .from("task_comments")
    .select("*")
    .in("task_id", taskIds)
    .order("created_at");

  const allUserIds = new Set<string>();
  data.forEach((task: any) => {
    if (task.created_by) allUserIds.add(task.created_by);
  });
  (comments || []).forEach((comment: any) => {
    if (comment.created_by) allUserIds.add(comment.created_by);
  });

  const profileMap: Record<string, any> = {};
  if (allUserIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", [...allUserIds]);
    profiles?.forEach((profile: any) => {
      profileMap[profile.user_id] = profile;
    });
  }

  const commentsByTask: Record<string, any[]> = {};
  comments?.forEach((comment: any) => {
    if (!commentsByTask[comment.task_id]) commentsByTask[comment.task_id] = [];
    commentsByTask[comment.task_id].push({ ...comment, profiles: profileMap[comment.created_by] || null });
  });

  return data.map((task: any) => ({
    ...task,
    profiles: profileMap[task.created_by] || null,
    comments: commentsByTask[task.id] || [],
  }));
}

export async function fetchOccurrencesWithComments(clientId?: string) {
  let query = supabase
    .from("occurrences")
    .select("*, sectors(name), sections(name), clients(legal_name)")
    .eq("is_archived", false)
    .order("occurred_at", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error } = await query;
  if (error) throw error;

  if (!data || data.length === 0) {
    return data?.map((occurrence: any) => ({ ...occurrence, profiles: null, comments: [] })) || [];
  }

  const occurrenceIds = data.map((occurrence: any) => occurrence.id);
  const { data: comments } = await supabase
    .from("occurrence_comments" as any)
    .select("*")
    .in("occurrence_id", occurrenceIds)
    .order("created_at");

  const allUserIds = new Set<string>();
  data.forEach((occurrence: any) => {
    if (occurrence.created_by) allUserIds.add(occurrence.created_by);
  });
  ((comments as any[]) || []).forEach((comment: any) => {
    if (comment.created_by) allUserIds.add(comment.created_by);
  });

  const profileMap: Record<string, any> = {};
  if (allUserIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", [...allUserIds]);
    profiles?.forEach((profile: any) => {
      profileMap[profile.user_id] = profile;
    });
  }

  const commentsByOccurrence: Record<string, any[]> = {};
  (comments as any[])?.forEach((comment: any) => {
    if (!commentsByOccurrence[comment.occurrence_id]) commentsByOccurrence[comment.occurrence_id] = [];
    commentsByOccurrence[comment.occurrence_id].push({ ...comment, profiles: profileMap[comment.created_by] || null });
  });

  return data.map((occurrence: any) => ({
    ...occurrence,
    profiles: profileMap[occurrence.created_by] || null,
    comments: commentsByOccurrence[occurrence.id] || [],
  }));
}

export async function fetchOccurrences(clientId?: string) {
  let query = supabase
    .from("occurrences")
    .select("*, sectors(name), sections(name), clients(legal_name)")
    .eq("is_archived", false)
    .order("occurred_at", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchProfilesWithRoles() {
  const { data: profiles, error } = await supabase.from("profiles").select("*").order("full_name");
  if (error) throw error;

  const userIds = profiles?.map((profile) => profile.user_id).filter(Boolean) || [];
  if (userIds.length === 0) return profiles;

  const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);

  const rolesMap: Record<string, any[]> = {};
  roles?.forEach((role) => {
    if (!rolesMap[role.user_id]) rolesMap[role.user_id] = [];
    rolesMap[role.user_id].push(role);
  });

  return profiles?.map((profile) => ({
    ...profile,
    user_roles: rolesMap[profile.user_id] || [],
  }));
}

export async function fetchClientPopNote(clientId: string, popId: string) {
  const { data, error } = await supabase
    .from("client_pop_notes")
    .select("*")
    .eq("client_id", clientId)
    .eq("pop_id", popId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchPermissionSettings() {
  const { data, error } = await supabase.from("permission_settings").select("*");
  if (error) throw error;
  return data;
}

export async function fetchSectorStyles(sectorId?: string) {
  let query = supabase.from("sector_styles").select("*").eq("is_active", true).order("order_index");
  if (sectorId) query = query.eq("sector_id", sectorId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchClientSectorStyles(clientId: string) {
  const { data, error } = await supabase
    .from("client_sector_styles")
    .select("*, sector_styles(name), sectors(name)")
    .eq("client_id", clientId);
  if (error) throw error;
  return data;
}

export async function fetchTaskStats() {
  const { data, error } = await supabase
    .from("tasks")
    .select("sector_id, status, due_date, sectors(name)")
    .eq("is_archived", false)
    .not("status", "in", '("Concluída","Cancelada")');
  if (error) throw error;
  return data;
}

export async function fetchTags() {
  const { data, error } = await supabase.from("tags").select("*").eq("is_active", true).order("name");
  if (error) throw error;
  return data;
}

export async function fetchParameterOptions(type?: string) {
  let query = supabase
    .from("parameter_options" as any)
    .select("*")
    .eq("is_active", true)
    .order("order_index");
  if (type) query = query.eq("type", type);
  const { data, error } = await query;
  if (error) throw error;
  return data as any[];
}

export async function fetchPopVersions(popId: string) {
  const { data, error } = await supabase
    .from("pop_versions" as any)
    .select("*")
    .eq("pop_id", popId)
    .order("saved_at", { ascending: false })
    .limit(10);
  if (error) throw error;

  const userIds = [...new Set(((data as any[]) || []).map((version: any) => version.saved_by).filter(Boolean))];
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
    const profileMap: Record<string, string> = {};
    profiles?.forEach((profile: any) => {
      profileMap[profile.user_id] = profile.full_name;
    });
    return (data as any[]).map((version: any) => ({ ...version, saved_by_name: profileMap[version.saved_by] || "—" }));
  }

  return (data as any[]).map((version: any) => ({ ...version, saved_by_name: "—" }));
}

export async function fetchDocumentTypes(clientId?: string) {
  let query = supabase.from("document_types").select("*").order("order_index");
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchDocumentMonthlyStatus(clientId: string, yearMonth: string) {
  const { data, error } = await supabase
    .from("document_monthly_status")
    .select("*")
    .eq("client_id", clientId)
    .eq("year_month", yearMonth);
  if (error) throw error;
  return data;
}

export async function fetchDocumentReportLogs(yearMonth: string) {
  const { data, error } = await supabase
    .from("document_report_logs")
    .select("*")
    .eq("year_month", yearMonth)
    .order("generated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchDocTags() {
  const { data, error } = await supabase.from("doc_tags").select("*").eq("is_active", true).order("name");
  if (error) throw error;
  return data;
}

export async function fetchDocumentTypeDocTags(documentTypeIds: string[]) {
  if (documentTypeIds.length === 0) return [];

  const { data, error } = await supabase
    .from("document_type_doc_tags")
    .select("*, doc_tags(id, name, color, text_color)")
    .in("document_type_id", documentTypeIds);
  if (error) throw error;
  return data;
}

export async function fetchManagementConfig() {
  const { data, error } = await supabase.from("management_config" as any).select("*");
  if (error) throw error;
  return data as any[];
}

export async function fetchManagementReviews(yearMonths: string[]) {
  if (yearMonths.length === 0) return [];

  const { data, error } = await supabase
    .from("management_reviews" as any)
    .select("*")
    .in("year_month", yearMonths);
  if (error) throw error;
  return data as any[];
}

export async function fetchClientTags(clientId: string) {
  const { data, error } = await supabase
    .from("client_tags")
    .select("*, tags(id, name, color)")
    .eq("client_id", clientId);
  if (error) throw error;
  return data as (typeof data extends (infer U)[] ? U & { sector_id: string | null } : never)[];
}
