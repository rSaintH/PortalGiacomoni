import { isPast, isToday } from "date-fns";

// ── Helpers ──

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function formatYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ── Task stats ──

export interface TaskStats {
  total: number;
  overdue: number;
  openToday: number;
}

interface TaskLike {
  status: string;
  due_date?: string | null;
}

export function computeTaskStats(tasks: TaskLike[] | undefined): TaskStats {
  if (!tasks) return { total: 0, overdue: 0, openToday: 0 };
  const open = tasks.filter((t) => !["Concluída", "Cancelada"].includes(t.status));
  const overdue = open.filter(
    (t) => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))
  );
  const today = open.filter((t) => t.due_date && isToday(new Date(t.due_date)));
  return { total: open.length, overdue: overdue.length, openToday: today.length };
}

export function getOverdueTasks<T extends TaskLike>(tasks: T[] | undefined, limit = 5): T[] {
  if (!tasks) return [];
  return tasks
    .filter(
      (t) =>
        !["Concluída", "Cancelada"].includes(t.status) &&
        t.due_date &&
        isPast(new Date(t.due_date)) &&
        !isToday(new Date(t.due_date))
    )
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, limit);
}

// ── Accounting dashboard stats ──

interface DocType {
  id: string;
  client_id: string;
  classification: string;
}

interface MonthlyStatus {
  document_type_id: string;
  has_document: boolean;
}

interface ClientLike {
  id: string;
  status: string;
  legal_name: string;
}

export interface AccountingStats {
  green: number;
  yellow: number;
  red: number;
  topRed: { name: string; missing: number }[];
}

export function computeAccountingStats(
  clients: ClientLike[] | undefined,
  allDocTypes: DocType[] | undefined,
  allMonthlyStatus: MonthlyStatus[] | undefined,
): AccountingStats {
  if (!clients || !allDocTypes || !allMonthlyStatus) {
    return { green: 0, yellow: 0, red: 0, topRed: [] };
  }

  const docTypesByClient: Record<string, DocType[]> = {};
  for (const dt of allDocTypes) {
    if (!docTypesByClient[dt.client_id]) docTypesByClient[dt.client_id] = [];
    docTypesByClient[dt.client_id].push(dt);
  }

  const statusByDocType: Record<string, boolean> = {};
  for (const s of allMonthlyStatus) {
    statusByDocType[s.document_type_id] = s.has_document;
  }

  let green = 0, yellow = 0, red = 0;
  const redClients: { name: string; missing: number }[] = [];

  const activeClients = clients.filter((c) => c.status === "Ativo");
  for (const client of activeClients) {
    const docTypes = docTypesByClient[client.id] || [];
    const essential = docTypes.filter((d) => d.classification === "essencial");
    const necessary = docTypes.filter((d) => d.classification === "necessario");

    const essentialReceived = essential.filter((d) => statusByDocType[d.id] === true).length;
    const necessaryReceived = necessary.filter((d) => statusByDocType[d.id] === true).length;

    const allEssential = essential.length === 0 || essentialReceived === essential.length;
    const allNecessary = necessary.length === 0 || necessaryReceived === necessary.length;

    if (allEssential && allNecessary) green++;
    else if (allEssential) yellow++;
    else {
      red++;
      redClients.push({ name: client.legal_name, missing: essential.length - essentialReceived });
    }
  }

  redClients.sort((a, b) => b.missing - a.missing);

  return { green, yellow, red, topRed: redClients.slice(0, 5) };
}
