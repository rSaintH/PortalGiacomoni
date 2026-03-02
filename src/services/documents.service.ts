import { supabase } from "@/integrations/supabase/client";

export async function fetchAllActiveDocumentTypes() {
  const { data, error } = await supabase
    .from("document_types")
    .select("id, client_id, name, classification, is_active")
    .eq("is_active", true)
    .order("order_index");
  if (error) throw error;
  return data || [];
}

export async function fetchAllDocumentMonthlyStatus(yearMonth: string) {
  const { data, error } = await supabase
    .from("document_monthly_status")
    .select("document_type_id, client_id, has_document")
    .eq("year_month", yearMonth);
  if (error) throw error;
  return data || [];
}

export async function fetchDocumentReportData(clientId: string, yearMonth: string) {
  const { data: docTypes, error: docError } = await supabase
    .from("document_types")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .neq("include_in_report", false)
    .order("order_index");
  if (docError) throw new Error(`Erro ao buscar documentos: ${docError.message}`);

  const { data: statuses, error: statusError } = await supabase
    .from("document_monthly_status")
    .select("*")
    .eq("client_id", clientId)
    .eq("year_month", yearMonth);
  if (statusError) throw new Error(`Erro ao buscar status: ${statusError.message}`);

  return { docTypes: docTypes || [], statuses: statuses || [] };
}

export async function insertDocumentReportLogs(logs: { client_id: string; year_month: string; generated_by: string }[]) {
  if (logs.length === 0) return;
  const { error } = await supabase.from("document_report_logs").insert(logs);
  if (error) throw error;
}

export async function setDocumentMonthlyHasDocument(payload: {
  statusId?: string;
  documentTypeId: string;
  clientId: string;
  yearMonth: string;
  hasDocument: boolean;
  userId?: string;
}) {
  if (payload.statusId) {
    const { error } = await supabase
      .from("document_monthly_status")
      .update({ has_document: payload.hasDocument, updated_by: payload.userId })
      .eq("id", payload.statusId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("document_monthly_status").insert({
    document_type_id: payload.documentTypeId,
    client_id: payload.clientId,
    year_month: payload.yearMonth,
    has_document: payload.hasDocument,
    updated_by: payload.userId,
  });
  if (error) throw error;
}

export async function setDocumentMonthlyObservation(payload: {
  statusId?: string;
  documentTypeId: string;
  clientId: string;
  yearMonth: string;
  observation: string;
  userId?: string;
}) {
  if (payload.statusId) {
    const { error } = await supabase
      .from("document_monthly_status")
      .update({ observation: payload.observation || null, updated_by: payload.userId })
      .eq("id", payload.statusId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("document_monthly_status").insert({
    document_type_id: payload.documentTypeId,
    client_id: payload.clientId,
    year_month: payload.yearMonth,
    has_document: false,
    observation: payload.observation || null,
    updated_by: payload.userId,
  });
  if (error) throw error;
}

export async function updateDocumentType(payload: {
  documentTypeId: string;
  fields: Record<string, unknown>;
}) {
  const { error } = await supabase.from("document_types").update(payload.fields).eq("id", payload.documentTypeId);
  if (error) throw error;
}

export async function replaceDocumentTypeTagAssignments(documentTypeId: string, tagIds: string[]) {
  const { error: deleteError } = await supabase
    .from("document_type_doc_tags")
    .delete()
    .eq("document_type_id", documentTypeId);
  if (deleteError) throw deleteError;

  if (tagIds.length === 0) return;

  const rows = tagIds.map((tagId) => ({
    document_type_id: documentTypeId,
    doc_tag_id: tagId,
  }));
  const { error: insertError } = await supabase.from("document_type_doc_tags").insert(rows);
  if (insertError) throw insertError;
}

export async function createDocumentType(payload: {
  clientId: string;
  name: string;
  classification: string;
  orderIndex: number;
  userId?: string;
}) {
  const { data, error } = await supabase
    .from("document_types")
    .insert({
      client_id: payload.clientId,
      name: payload.name,
      classification: payload.classification,
      order_index: payload.orderIndex,
      created_by: payload.userId,
      updated_by: payload.userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteDocumentType(documentTypeId: string) {
  const { error } = await supabase.from("document_types").delete().eq("id", documentTypeId);
  if (error) throw error;
}
