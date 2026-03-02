import { supabase } from "@/integrations/supabase/client";

interface CreateOccurrencePayload {
  clientId: string;
  sectorId: string;
  sectionId: string;
  title: string;
  description: string;
  category: string;
  occurredAt: string;
  monetaryValue: string;
  editorRoles: string[];
  userId?: string;
}

export async function createOccurrence(payload: CreateOccurrencePayload) {
  const { error } = await supabase.from("occurrences").insert({
    client_id: payload.clientId,
    sector_id: payload.sectorId,
    section_id: payload.sectionId || null,
    title: payload.title,
    description: payload.description || null,
    category: payload.category,
    occurred_at: payload.occurredAt || new Date().toISOString(),
    monetary_value: payload.monetaryValue ? parseFloat(payload.monetaryValue) : null,
    editor_roles: payload.editorRoles,
    created_by: payload.userId,
  } as any);
  if (error) throw error;
}
