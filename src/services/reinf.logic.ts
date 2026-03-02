import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ReinfEntry {
  id: string;
  client_id: string;
  ano: number;
  trimestre: number;
  lucro_mes1: number | null;
  lucro_mes2: number | null;
  lucro_mes3: number | null;
  status: string;
  status_mes1: string;
  status_mes2: string;
  status_mes3: string;
  created_by: string | null;
  contabil_usuario_id: string | null;
  contabil_preenchido_em: string | null;
  dp_usuario_id: string | null;
  dp_aprovado_em: string | null;
  fiscal_usuario_id: string | null;
  fiscal_enviado_em: string | null;
  contabil_usuario_id_mes1: string | null;
  contabil_preenchido_em_mes1: string | null;
  dp_usuario_id_mes1: string | null;
  dp_aprovado_em_mes1: string | null;
  fiscal_usuario_id_mes1: string | null;
  fiscal_enviado_em_mes1: string | null;
  contabil_usuario_id_mes2: string | null;
  contabil_preenchido_em_mes2: string | null;
  dp_usuario_id_mes2: string | null;
  dp_aprovado_em_mes2: string | null;
  fiscal_usuario_id_mes2: string | null;
  fiscal_enviado_em_mes2: string | null;
  contabil_usuario_id_mes3: string | null;
  contabil_preenchido_em_mes3: string | null;
  dp_usuario_id_mes3: string | null;
  dp_aprovado_em_mes3: string | null;
  fiscal_usuario_id_mes3: string | null;
  fiscal_enviado_em_mes3: string | null;
  created_at: string;
  clients: { legal_name: string; trade_name: string | null } | null;
}

export interface ReinfLog {
  id: string;
  reinf_entry_id: string;
  user_id: string;
  action: string;
  details: string | null;
  created_at: string;
}

export interface Profile {
  user_id: string;
  full_name: string;
}

export interface Partner {
  id: string;
  client_id: string;
  name: string;
}

export interface PartnerProfit {
  id: string;
  reinf_entry_id: string;
  partner_id: string;
  mes: number;
  valor: number;
}

export type PartnerSelections = Record<number, Record<string, { selected: boolean; valor: string }>>;

export const TRIMESTRE_LABELS: Record<number, string> = {
  1: "1º Tri (Jan-Mar)",
  2: "2º Tri (Abr-Jun)",
  3: "3º Tri (Jul-Set)",
  4: "4º Tri (Out-Dez)",
};

export const TRIMESTRE_MESES: Record<number, [string, string, string]> = {
  1: ["Janeiro", "Fevereiro", "Março"],
  2: ["Abril", "Maio", "Junho"],
  3: ["Julho", "Agosto", "Setembro"],
  4: ["Outubro", "Novembro", "Dezembro"],
};

export const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; nextAction?: string; nextLabel?: string; prevAction?: string; prevLabel?: string }
> = {
  pendente_contabil: {
    label: "Pendente Contábil",
    color: "bg-status-open/10 text-status-open border-status-open/30",
    nextAction: "contabil_ok",
    nextLabel: "Enviar para DP",
  },
  contabil_ok: {
    label: "Aguardando DP",
    color: "bg-status-waiting/10 text-status-waiting border-status-waiting/30",
    nextAction: "dp_aprovado",
    nextLabel: "Aprovar",
    prevAction: "pendente_contabil",
    prevLabel: "Voltar p/ Contábil",
  },
  dp_aprovado: {
    label: "Aguardando Fiscal",
    color: "bg-status-progress/10 text-status-progress border-status-progress/30",
    nextAction: "enviado",
    nextLabel: "Marcar Enviado",
    prevAction: "contabil_ok",
    prevLabel: "Voltar p/ DP",
  },
  enviado: {
    label: "Enviado",
    color: "bg-status-done/10 text-status-done border-status-done/30",
    prevAction: "dp_aprovado",
    prevLabel: "Voltar p/ Fiscal",
  },
};

const STATUS_ORDER = ["pendente_contabil", "contabil_ok", "dp_aprovado", "enviado"];

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatDate(dateStr: string) {
  return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function getMesStatus(entry: ReinfEntry, mes: number): string {
  return mes === 1 ? entry.status_mes1 : mes === 2 ? entry.status_mes2 : entry.status_mes3;
}

export function getMesLucro(entry: ReinfEntry, mes: number): number | null {
  return mes === 1 ? entry.lucro_mes1 : mes === 2 ? entry.lucro_mes2 : entry.lucro_mes3;
}

export function getMesContabilUser(entry: ReinfEntry, mes: number): string | null {
  return mes === 1 ? entry.contabil_usuario_id_mes1 : mes === 2 ? entry.contabil_usuario_id_mes2 : entry.contabil_usuario_id_mes3;
}

export function getMesDpUser(entry: ReinfEntry, mes: number): string | null {
  return mes === 1 ? entry.dp_usuario_id_mes1 : mes === 2 ? entry.dp_usuario_id_mes2 : entry.dp_usuario_id_mes3;
}

export function getMesFiscalUser(entry: ReinfEntry, mes: number): string | null {
  return mes === 1 ? entry.fiscal_usuario_id_mes1 : mes === 2 ? entry.fiscal_usuario_id_mes2 : entry.fiscal_usuario_id_mes3;
}

export function getMonthTotal(partnerSelections: PartnerSelections, mes: number) {
  const mesData = partnerSelections[mes] || {};
  return Object.entries(mesData)
    .filter(([, selection]) => selection.selected)
    .reduce((sum, [, selection]) => sum + (parseFloat(selection.valor) || 0), 0);
}

export function buildAdvanceMesStatusUpdate(entry: ReinfEntry, mes: number, userId?: string | null) {
  const currentStatus = getMesStatus(entry, mes);
  const statusConfig = STATUS_CONFIG[currentStatus];
  if (!statusConfig?.nextAction) return null;
  if (statusConfig.nextAction === "enviado") return null;

  const now = new Date().toISOString();
  const suffix = `_mes${mes}`;
  const updateData: Record<string, unknown> = { [`status${suffix}`]: statusConfig.nextAction };

  if (statusConfig.nextAction === "contabil_ok") {
    updateData[`contabil_usuario_id${suffix}`] = userId || null;
    updateData[`contabil_preenchido_em${suffix}`] = now;
  } else if (statusConfig.nextAction === "dp_aprovado") {
    updateData[`dp_usuario_id${suffix}`] = userId || null;
    updateData[`dp_aprovado_em${suffix}`] = now;
  }

  const allStatuses = [1, 2, 3].map((month) => (month === mes ? statusConfig.nextAction! : getMesStatus(entry, month)));
  const minIdx = Math.min(...allStatuses.map((status) => STATUS_ORDER.indexOf(status)));
  updateData.status = STATUS_ORDER[minIdx];

  return { updateData, currentStatus, nextStatus: statusConfig.nextAction };
}

export function buildRevertMesStatusUpdate(entry: ReinfEntry, mes: number) {
  const currentStatus = getMesStatus(entry, mes);
  const statusConfig = STATUS_CONFIG[currentStatus];
  if (!statusConfig?.prevAction) return null;
  if (currentStatus === "enviado") return null;

  const targetStatus = statusConfig.prevAction;
  const targetIdx = STATUS_ORDER.indexOf(targetStatus);
  const suffix = `_mes${mes}`;
  const updateData: Record<string, unknown> = { [`status${suffix}`]: targetStatus };

  if (targetIdx <= 0) {
    updateData[`contabil_usuario_id${suffix}`] = null;
    updateData[`contabil_preenchido_em${suffix}`] = null;
    updateData[`dp_usuario_id${suffix}`] = null;
    updateData[`dp_aprovado_em${suffix}`] = null;
    updateData[`fiscal_usuario_id${suffix}`] = null;
    updateData[`fiscal_enviado_em${suffix}`] = null;
  } else if (targetIdx <= 1) {
    updateData[`dp_usuario_id${suffix}`] = null;
    updateData[`dp_aprovado_em${suffix}`] = null;
    updateData[`fiscal_usuario_id${suffix}`] = null;
    updateData[`fiscal_enviado_em${suffix}`] = null;
  } else if (targetIdx <= 2) {
    updateData[`fiscal_usuario_id${suffix}`] = null;
    updateData[`fiscal_enviado_em${suffix}`] = null;
  }

  const allStatuses = [1, 2, 3].map((month) => (month === mes ? targetStatus : getMesStatus(entry, month)));
  const minIdx = Math.min(...allStatuses.map((status) => STATUS_ORDER.indexOf(status)));
  updateData.status = STATUS_ORDER[minIdx];

  return { updateData, currentStatus, targetStatus };
}

export function buildAdvanceFiscalTrimestralUpdate(userId?: string | null) {
  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {};

  for (const mes of [1, 2, 3]) {
    const suffix = `_mes${mes}`;
    updateData[`status${suffix}`] = "enviado";
    updateData[`fiscal_usuario_id${suffix}`] = userId || null;
    updateData[`fiscal_enviado_em${suffix}`] = now;
  }

  updateData.status = "enviado";
  updateData.fiscal_usuario_id = userId || null;
  updateData.fiscal_enviado_em = now;

  return updateData;
}

export function buildRevertFiscalTrimestralUpdate() {
  const updateData: Record<string, unknown> = {};

  for (const mes of [1, 2, 3]) {
    const suffix = `_mes${mes}`;
    updateData[`status${suffix}`] = "dp_aprovado";
    updateData[`fiscal_usuario_id${suffix}`] = null;
    updateData[`fiscal_enviado_em${suffix}`] = null;
  }

  updateData.status = "dp_aprovado";
  updateData.fiscal_usuario_id = null;
  updateData.fiscal_enviado_em = null;

  return updateData;
}

export function allMonthsDpAprovado(entry: ReinfEntry) {
  return [1, 2, 3].every((mes) => getMesStatus(entry, mes) === "dp_aprovado");
}

export function allMonthsEnviado(entry: ReinfEntry) {
  return [1, 2, 3].every((mes) => getMesStatus(entry, mes) === "enviado");
}
