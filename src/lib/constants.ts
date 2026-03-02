import type { Tables } from "@/integrations/supabase/types";

// ── Domain Types ──
export type Sector = Tables<"sectors">;
export type Client = Tables<"clients">;
export type Task = Tables<"tasks">;
export type Pop = Tables<"pops">;
export type Occurrence = Tables<"occurrences">;
export type Particularity = Tables<"client_particularities">;
export type Section = Tables<"sections">;
export type Profile = Tables<"profiles">;
export type Tag = Tables<"tags">;
export type SectorStyle = Tables<"sector_styles">;
export type UserRole = Tables<"user_roles">;
export type ClientTag = Tables<"client_tags">;

// ── Constants ──
export const TASK_STATUSES = [
  "Aberta",
  "Em andamento",
  "Aguardando cliente",
  "Aguardando terceiro",
  "Concluída",
  "Cancelada",
] as const;

export const TASK_TYPES = [
  "Pendência",
  "Ajuste",
  "Solicitação ao cliente",
  "Conferência",
] as const;

export const PRIORITIES = ["Alta", "Média", "Baixa"] as const;

export const POP_STATUSES = ["Rascunho", "Em revisão", "Publicado", "Arquivado"] as const;

export const POP_SCOPES = ["Geral", "Cliente", "Tag"] as const;

export const OCCURRENCE_CATEGORIES = ["Informativa", "Atenção"] as const;

export const CLIENT_STATUSES = ["Ativo", "Inativo", "Prospecção"] as const;

export const CLOSED_TASK_STATUSES = ["Concluída", "Cancelada"] as const;

// ── Badge class helpers ──
export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "Aberta":
      return "bg-status-open/10 text-status-open border-status-open/30";
    case "Em andamento":
      return "bg-status-progress/10 text-status-progress border-status-progress/30";
    case "Aguardando cliente":
    case "Aguardando terceiro":
      return "bg-status-waiting/10 text-status-waiting border-status-waiting/30";
    case "Concluída":
      return "bg-status-done/10 text-status-done border-status-done/30";
    case "Cancelada":
      return "bg-status-cancelled/10 text-status-cancelled border-status-cancelled/30";
    default:
      return "";
  }
}

export function getPriorityBadgeClass(priority: string): string {
  switch (priority) {
    case "Alta":
      return "priority-alta";
    case "Média":
      return "priority-media";
    case "Baixa":
      return "priority-baixa";
    default:
      return "";
  }
}

export function getPopStatusBadgeClass(status: string): string {
  switch (status) {
    case "Publicado":
      return "bg-status-done/10 text-status-done";
    case "Rascunho":
      return "bg-muted text-muted-foreground";
    case "Em revisão":
      return "bg-status-progress/10 text-status-progress";
    case "Arquivado":
      return "bg-status-cancelled/10 text-status-cancelled";
    default:
      return "";
  }
}

export function getClientStatusBadgeClass(status: string): string {
  switch (status) {
    case "Ativo":
      return "bg-status-done/10 text-status-done";
    case "Inativo":
      return "bg-muted text-muted-foreground";
    case "Prospecção":
      return "bg-status-progress/10 text-status-progress";
    default:
      return "";
  }
}
