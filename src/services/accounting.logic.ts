// ── Types ──

export type StatusLevel = "green" | "yellow" | "red";
export type FiscalFilter = "all" | "closed" | "open" | "no_sync";
export type CnpjCrossFilter = "all" | "match" | "mismatch" | "missing_source" | "missing_local";
export type CnpjCrossStatus = "match" | "mismatch" | "missing_source" | "missing_local";

export interface ClientAccountingInfo {
  clientId: string;
  legalName: string;
  tradeName: string | null;
  localCnpj: string | null;
  sourceCnpj: string | null;
  cnpjCrossStatus: CnpjCrossStatus;
  status: StatusLevel;
  essentialTotal: number;
  essentialReceived: number;
  necessaryTotal: number;
  necessaryReceived: number;
  missingDocs: { name: string; classification: string }[];
  fiscalClosed: boolean | null;
  fiscalUpdatedAt: string | null;
}

// ── CNPJ utilities ──

export function extractCnpjDigits(value: string | null | undefined): string {
  return String(value || "")
    .replace(/[./-]/g, "")
    .replace(/[^0-9]/g, "");
}

export function normalizeCnpjForCompare(value: string | null | undefined): string {
  const digits = extractCnpjDigits(value);
  if (!digits) return "";
  if (digits.length === 13) return digits.padStart(14, "0");
  if (digits.length > 14) return digits.slice(-14);
  return digits;
}

export function cnpjEquivalent(a: string | null | undefined, b: string | null | undefined): boolean {
  const aRaw = extractCnpjDigits(a);
  const bRaw = extractCnpjDigits(b);
  if (!aRaw || !bRaw) return false;

  const aNorm = normalizeCnpjForCompare(aRaw);
  const bNorm = normalizeCnpjForCompare(bRaw);
  if (aNorm === bNorm || aRaw === bRaw) return true;

  const aNoLeadingZero = aNorm.replace(/^0+/, "");
  const bNoLeadingZero = bNorm.replace(/^0+/, "");
  return aNoLeadingZero.length > 0 && aNoLeadingZero === bNoLeadingZero;
}

// ── Date / format helpers ──

export function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

export function formatYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// ── Business computation ──

interface FiscalSyncRow {
  cnpj_digits?: string | null;
  cnpj?: string | null;
  fiscal_fechou?: boolean | null;
  source_updated_at?: string | null;
}

interface DocType {
  id: string;
  client_id: string;
  name: string;
  classification: string;
}

interface MonthlyStatus {
  document_type_id: string;
  has_document: boolean;
}

interface ClientRow {
  id: string;
  legal_name: string;
  trade_name: string | null;
  cnpj: string | null;
  status: string;
}

export function buildClientAccountingInfos(
  clients: ClientRow[],
  allDocTypes: DocType[],
  allMonthlyStatus: MonthlyStatus[],
  fiscalSyncRows: FiscalSyncRow[] | undefined,
  cnpjSyncRows: FiscalSyncRow[] | undefined,
): ClientAccountingInfo[] {
  const syncByCnpjCanonical = new Map<string, FiscalSyncRow>();
  const syncByCnpjRaw = new Map<string, FiscalSyncRow>();
  for (const sync of fiscalSyncRows || []) {
    const canonical = normalizeCnpjForCompare(sync.cnpj_digits || sync.cnpj);
    const raw = extractCnpjDigits(sync.cnpj_digits || sync.cnpj);
    if (canonical) syncByCnpjCanonical.set(canonical, sync);
    if (raw) syncByCnpjRaw.set(raw, sync);
  }

  const anySyncByCnpjCanonical = new Map<string, FiscalSyncRow>();
  const anySyncByCnpjRaw = new Map<string, FiscalSyncRow>();
  for (const sync of cnpjSyncRows || []) {
    const canonical = normalizeCnpjForCompare(sync.cnpj_digits || sync.cnpj);
    const raw = extractCnpjDigits(sync.cnpj_digits || sync.cnpj);
    if (canonical && !anySyncByCnpjCanonical.has(canonical)) {
      anySyncByCnpjCanonical.set(canonical, sync);
    }
    if (raw && !anySyncByCnpjRaw.has(raw)) {
      anySyncByCnpjRaw.set(raw, sync);
    }
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

  const activeClients = clients.filter((c) => c.status === "Ativo");

  return activeClients.map((client) => {
    const docTypes = docTypesByClient[client.id] || [];
    const essentialDocs = docTypes.filter((d) => d.classification === "essencial");
    const necessaryDocs = docTypes.filter((d) => d.classification === "necessario");

    const essentialReceived = essentialDocs.filter((d) => statusByDocType[d.id] === true).length;
    const necessaryReceived = necessaryDocs.filter((d) => statusByDocType[d.id] === true).length;

    const allEssentialReceived = essentialDocs.length === 0 || essentialReceived === essentialDocs.length;
    const allNecessaryReceived = necessaryDocs.length === 0 || necessaryReceived === necessaryDocs.length;

    let status: StatusLevel;
    if (allEssentialReceived && allNecessaryReceived) status = "green";
    else if (allEssentialReceived) status = "yellow";
    else status = "red";

    const missingDocs: { name: string; classification: string }[] = [];
    for (const d of essentialDocs) {
      if (statusByDocType[d.id] !== true) missingDocs.push({ name: d.name, classification: "essencial" });
    }
    for (const d of necessaryDocs) {
      if (statusByDocType[d.id] !== true) missingDocs.push({ name: d.name, classification: "necessario" });
    }

    const cnpjCanonical = normalizeCnpjForCompare(client.cnpj);
    const cnpjRaw = extractCnpjDigits(client.cnpj);
    const monthSyncRow =
      (cnpjCanonical && syncByCnpjCanonical.get(cnpjCanonical)) ||
      (cnpjRaw && syncByCnpjRaw.get(cnpjRaw)) ||
      undefined;
    const anySyncRow =
      (cnpjCanonical && anySyncByCnpjCanonical.get(cnpjCanonical)) ||
      (cnpjRaw && anySyncByCnpjRaw.get(cnpjRaw)) ||
      undefined;
    const sourceCnpj = anySyncRow?.cnpj || monthSyncRow?.cnpj || null;
    const cnpjCrossStatus: CnpjCrossStatus = !cnpjCanonical
      ? "missing_local"
      : !anySyncRow
        ? "missing_source"
        : cnpjEquivalent(client.cnpj, sourceCnpj)
          ? "match"
          : "mismatch";

    return {
      clientId: client.id,
      legalName: client.legal_name,
      tradeName: client.trade_name,
      localCnpj: client.cnpj,
      sourceCnpj,
      cnpjCrossStatus,
      status,
      essentialTotal: essentialDocs.length,
      essentialReceived,
      necessaryTotal: necessaryDocs.length,
      necessaryReceived,
      missingDocs,
      fiscalClosed: monthSyncRow ? (monthSyncRow.fiscal_fechou ?? null) : null,
      fiscalUpdatedAt: monthSyncRow?.source_updated_at || null,
    };
  });
}

// ── Filtering ──

export function filterClientInfos(
  clientInfos: ClientAccountingInfo[],
  filterStatus: StatusLevel | "all",
  fiscalFilter: FiscalFilter,
  cnpjFilter: CnpjCrossFilter,
  search: string,
): ClientAccountingInfo[] {
  let result = clientInfos;

  if (filterStatus !== "all") {
    result = result.filter((c) => c.status === filterStatus);
  }

  if (fiscalFilter === "closed") result = result.filter((c) => c.fiscalClosed === true);
  else if (fiscalFilter === "open") result = result.filter((c) => c.fiscalClosed === false);
  else if (fiscalFilter === "no_sync") result = result.filter((c) => c.fiscalClosed === null);

  if (cnpjFilter !== "all") result = result.filter((c) => c.cnpjCrossStatus === cnpjFilter);

  if (search.trim()) {
    const term = search.toLowerCase();
    const termDigits = extractCnpjDigits(term);
    result = result.filter(
      (c) =>
        c.legalName.toLowerCase().includes(term) ||
        (c.tradeName || "").toLowerCase().includes(term) ||
        (termDigits.length > 0 &&
          (normalizeCnpjForCompare(c.localCnpj).includes(termDigits) ||
            normalizeCnpjForCompare(c.sourceCnpj).includes(termDigits))),
    );
  }

  return result;
}

// ── Counts ──

export function computeDocCounts(infos: ClientAccountingInfo[]) {
  const count = { green: 0, yellow: 0, red: 0 };
  for (const info of infos) count[info.status]++;
  return count;
}

export function computeFiscalCounts(infos: ClientAccountingInfo[]) {
  const count = { closed: 0, open: 0, noSync: 0 };
  for (const info of infos) {
    if (info.fiscalClosed === true) count.closed++;
    else if (info.fiscalClosed === false) count.open++;
    else count.noSync++;
  }
  return count;
}

export function computeCnpjCounts(infos: ClientAccountingInfo[]) {
  const count = { match: 0, mismatch: 0, missingSource: 0, missingLocal: 0 };
  for (const info of infos) {
    if (info.cnpjCrossStatus === "match") count.match++;
    else if (info.cnpjCrossStatus === "mismatch") count.mismatch++;
    else if (info.cnpjCrossStatus === "missing_source") count.missingSource++;
    else count.missingLocal++;
  }
  return count;
}
