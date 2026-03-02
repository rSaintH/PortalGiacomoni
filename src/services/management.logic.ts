// ── Helpers ──

export const monthNamesShort = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function formatYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function parseYearMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-").map(Number);
  return { year: y, month: m - 1 };
}

export function getFirstName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] || null;
}

// ── Month generation ──

export const MIN_DATE = new Date(2026, 0, 1);

export function generateMonths(baseDate: Date, monthCount: number): string[] {
  const result: string[] = [];
  const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    if (d >= MIN_DATE) result.push(formatYearMonth(d));
  }
  return result;
}

export function canGoPrev(baseDate: Date, monthCount: number): boolean {
  const first = new Date(baseDate.getFullYear(), baseDate.getMonth() - monthCount - (monthCount - 1), 1);
  return first >= MIN_DATE;
}

// ── Review map ──

export interface ReviewRecord {
  id: string;
  client_id: string;
  year_month: string;
  reviewer_number: number;
  reviewed_by: string;
  reviewed_at: string;
}

export function buildReviewMap(reviews: ReviewRecord[] | undefined): Record<string, ReviewRecord> {
  const map: Record<string, ReviewRecord> = {};
  reviews?.forEach((r) => {
    map[`${r.client_id}_${r.year_month}_${r.reviewer_number}`] = r;
  });
  return map;
}

// ── Profile map ──

export function buildProfileMap(profiles: Array<{ user_id?: string; full_name?: string; email?: string }> | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  profiles?.forEach((p) => {
    if (p.user_id) map[p.user_id] = p.full_name || p.email || "";
  });
  return map;
}

// ── Month stats ──

export interface MonthStat {
  ym: string;
  total: number;
  both: number;
  onlyR1: number;
  onlyR2: number;
  none: number;
}

export function computeMonthStats(
  months: string[],
  activeClients: Array<{ id: string }>,
  reviewMap: Record<string, ReviewRecord>,
): MonthStat[] {
  const total = activeClients.length;
  return months.map((ym) => {
    let both = 0, onlyR1 = 0, onlyR2 = 0, none = 0;
    for (const c of activeClients) {
      const hasR1 = !!reviewMap[`${c.id}_${ym}_1`];
      const hasR2 = !!reviewMap[`${c.id}_${ym}_2`];
      if (hasR1 && hasR2) both++;
      else if (hasR1) onlyR1++;
      else if (hasR2) onlyR2++;
      else none++;
    }
    return { ym, total, both, onlyR1, onlyR2, none };
  });
}

// ── Filtering ──

export function filterActiveClients(
  clients: Array<{ id: string; status: string; legal_name: string; trade_name?: string | null }> | undefined,
  search: string,
  filterC1: boolean,
  filterC2: boolean,
  filterNoneMonth: string,
  months: string[],
  reviewMap: Record<string, ReviewRecord>,
): Array<{ id: string; status: string; legal_name: string; trade_name?: string | null }> {
  let list = clients?.filter((c) => c.status === "Ativo") || [];

  if (search.trim()) {
    const term = search.toLowerCase();
    list = list.filter(
      (c) =>
        c.legal_name.toLowerCase().includes(term) ||
        (c.trade_name || "").toLowerCase().includes(term)
    );
  }

  const hasFilter = filterC1 || filterC2 || !!filterNoneMonth;
  if (hasFilter) {
    list = list.filter((c) => {
      if (filterNoneMonth) {
        const hasR1 = !!reviewMap[`${c.id}_${filterNoneMonth}_1`];
        const hasR2 = !!reviewMap[`${c.id}_${filterNoneMonth}_2`];
        return !hasR1 && !hasR2;
      }
      return months.some((ym) => {
        const hasR1 = !!reviewMap[`${c.id}_${ym}_1`];
        const hasR2 = !!reviewMap[`${c.id}_${ym}_2`];
        if (filterC1 && filterC2) return hasR1 && hasR2;
        if (filterC1) return hasR1;
        if (filterC2) return hasR2;
        return true;
      });
    });
  }

  return list;
}
