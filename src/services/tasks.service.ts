import { supabase } from "@/integrations/supabase/client";
import { CLOSED_TASK_STATUSES } from "@/lib/constants";

export type CommentTable = "task_comments" | "occurrence_comments";
export type CommentForeignKey = "task_id" | "occurrence_id";

interface UpsertTaskPayload {
  taskId?: string;
  clientId: string;
  sectorId: string;
  sectionId: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  dueDate: string;
  monetaryValue: string;
  editorRoles: string[];
  userId?: string;
}

function normalizeUuid(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function upsertTask(payload: UpsertTaskPayload) {
  const clientId = normalizeUuid(payload.clientId);
  const sectorId = normalizeUuid(payload.sectorId);
  const sectionId = normalizeUuid(payload.sectionId);
  const userId = normalizeUuid(payload.userId);

  if (!clientId) {
    throw new Error("Selecione um cliente antes de salvar a pendencia.");
  }
  if (!sectorId) {
    throw new Error("Selecione um setor antes de salvar a pendencia.");
  }
  if (!payload.taskId && !userId) {
    throw new Error("Nao foi possivel identificar o usuario logado. Atualize a pagina e tente novamente.");
  }

  const body = {
    title: payload.title,
    description: payload.description,
    type: payload.type,
    priority: payload.priority,
    status: payload.status,
    client_id: clientId,
    sector_id: sectorId,
    section_id: sectionId,
    due_date: payload.dueDate || null,
    monetary_value: payload.monetaryValue ? parseFloat(payload.monetaryValue) : null,
    editor_roles: payload.editorRoles,
    updated_by: userId,
  };

  if (payload.taskId) {
    const { error } = await supabase.from("tasks").update(body).eq("id", payload.taskId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("tasks").insert({ ...body, created_by: userId as string });
  if (error) throw error;
}

export async function insertRecordComment(payload: {
  table: CommentTable;
  foreignKey: CommentForeignKey;
  recordId: string;
  comment: string;
  userId: string;
}) {
  const { error } = await supabase.from(payload.table).insert({
    [payload.foreignKey]: payload.recordId,
    comment: payload.comment,
    created_by: payload.userId,
  } as any);
  if (error) throw error;
}

export async function updateTaskStatus(taskId: string, newStatus: string, userId: string) {
  const isClosed = (CLOSED_TASK_STATUSES as readonly string[]).includes(newStatus);
  const payload: Record<string, unknown> = { status: newStatus, updated_by: userId };
  payload.closed_at = isClosed ? new Date().toISOString() : null;

  const { error } = await supabase.from("tasks").update(payload).eq("id", taskId);
  if (error) throw error;
}
