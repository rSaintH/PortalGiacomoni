import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useClients, usePermissionSettings } from "@/hooks/useSupabaseQuery";
import { fetchAllActiveDocumentTypes, fetchAllDocumentMonthlyStatus } from "@/services/documents.service";
import { fetchFiscalSyncByMonth, fetchFiscalSyncCnpjBase, fetchFatorSyncCursor, runFatorFiscalPull } from "@/services/accounting.service";
import { canAccessAccountingReady, isSupervisorRole } from "@/services/permissions.logic";
import {
  buildClientAccountingInfos,
  filterClientInfos,
  computeDocCounts,
  computeFiscalCounts,
  computeCnpjCounts,
  formatDateTime,
  formatYearMonth,
} from "@/services/accounting.logic";
import type {
  StatusLevel,
  FiscalFilter,
  CnpjCrossFilter,
  CnpjCrossStatus,
} from "@/services/accounting.logic";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

const monthNames = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const statusConfig: Record<
  StatusLevel,
  { label: string; color: string; icon: typeof CheckCircle2; badgeBg: string }
> = {
  green: {
    label: "Pronto para fazer",
    color: "text-green-600 dark:text-green-400",
    icon: CheckCircle2,
    badgeBg: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800",
  },
  yellow: {
    label: "Da pra comecar",
    color: "text-yellow-600 dark:text-yellow-400",
    icon: AlertTriangle,
    badgeBg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
  },
  red: {
    label: "Documentos essenciais pendentes",
    color: "text-red-600 dark:text-red-400",
    icon: XCircle,
    badgeBg: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800",
  },
};

const statusBorderColors: Record<StatusLevel, string> = {
  green: "border-l-green-500",
  yellow: "border-l-yellow-500",
  red: "border-l-red-500",
};

function getFiscalBadgeClass(fiscalClosed: boolean | null): string {
  if (fiscalClosed === true) return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800";
  if (fiscalClosed === false) return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  return "bg-muted text-muted-foreground border-border";
}

function getFiscalBadgeLabel(fiscalClosed: boolean | null): string {
  if (fiscalClosed === true) return "Fiscal fechado";
  if (fiscalClosed === false) return "Fiscal nao fechado";
  return "Sem sync Fator R";
}

function getCnpjBadgeClass(status: CnpjCrossStatus): string {
  if (status === "match") return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800";
  if (status === "mismatch") return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800";
  return "bg-muted text-muted-foreground border-border";
}

function getCnpjBadgeLabel(status: CnpjCrossStatus): string {
  if (status === "match") return "CNPJ cruzado OK";
  if (status === "mismatch") return "CNPJ divergente";
  if (status === "missing_source") return "Sem CNPJ no factor-ace";
  return "Sem CNPJ local";
}

export default function AccountingReady() {
  const queryClient = useQueryClient();
  const { isAdmin, userRole, userSectorId } = useAuth();
  const { data: permissions } = usePermissionSettings();

  const hasAccess = useMemo(() => {
    return canAccessAccountingReady(isAdmin, userRole, userSectorId, permissions as any);
  }, [isAdmin, userRole, permissions, userSectorId]);

  const { data: clients, isLoading: loadingClients } = useClients();

  const waitingPermissions = !permissions && !isAdmin && !isSupervisorRole(userRole);
  if (waitingPermissions) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (permissions && !hasAccess) return <Navigate to="/" replace />;

  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const yearMonth = formatYearMonth(currentDate);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusLevel | "all">("all");
  const [fiscalFilter, setFiscalFilter] = useState<FiscalFilter>("all");
  const [cnpjFilter, setCnpjFilter] = useState<CnpjCrossFilter>("all");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const { data: allDocTypes, isLoading: loadingDocTypes } = useQuery({
    queryKey: ["all_document_types_active"],
    staleTime: 5 * 60 * 1000,
    queryFn: fetchAllActiveDocumentTypes,
  });

  const { data: allMonthlyStatus, isLoading: loadingStatus } = useQuery({
    queryKey: ["all_document_monthly_status", yearMonth],
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchAllDocumentMonthlyStatus(yearMonth),
    enabled: !!yearMonth,
  });

  const { data: fiscalSyncRows, isLoading: loadingFiscalSync } = useQuery({
    queryKey: ["fator_r_fiscal_sync", yearMonth],
    staleTime: 2 * 60 * 1000,
    queryFn: () => fetchFiscalSyncByMonth(yearMonth),
    enabled: !!yearMonth,
  });

  const { data: cnpjSyncRows, isLoading: loadingCnpjSync } = useQuery({
    queryKey: ["fator_r_fiscal_sync_cnpj_base"],
    staleTime: 10 * 60 * 1000,
    queryFn: fetchFiscalSyncCnpjBase,
  });

  const { data: syncCursor, isLoading: loadingSyncCursor } = useQuery({
    queryKey: ["fator_r_sync_cursor"],
    staleTime: 60 * 1000,
    queryFn: fetchFatorSyncCursor,
  });

  const handleRefreshAll = async () => {
    if (!isAdmin || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const result = await runFatorFiscalPull(5000);
      if (result?.ok === false) {
        toast.error(result.message || "Falha ao atualizar empresas.");
      } else {
        toast.success(`Atualizacao concluida: ${result?.imported_rows ?? 0} linha(s) importada(s).`);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["fator_r_fiscal_sync"] }),
        queryClient.invalidateQueries({ queryKey: ["fator_r_fiscal_sync_cnpj_base"] }),
        queryClient.invalidateQueries({ queryKey: ["fator_r_sync_cursor"] }),
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar empresas.";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const clientInfos = useMemo(() => {
    if (!clients || !allDocTypes || !allMonthlyStatus) return [];
    return buildClientAccountingInfos(clients as any, allDocTypes, allMonthlyStatus, fiscalSyncRows, cnpjSyncRows);
  }, [clients, allDocTypes, allMonthlyStatus, fiscalSyncRows, cnpjSyncRows]);

  const filteredInfos = useMemo(
    () => filterClientInfos(clientInfos, filterStatus, fiscalFilter, cnpjFilter, search),
    [clientInfos, filterStatus, fiscalFilter, cnpjFilter, search],
  );

  const toggleExpand = (clientId: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const docCounts = useMemo(() => computeDocCounts(clientInfos), [clientInfos]);
  const fiscalCounts = useMemo(() => computeFiscalCounts(clientInfos), [clientInfos]);
  const cnpjCounts = useMemo(() => computeCnpjCounts(clientInfos), [clientInfos]);

  const hasAnyFilter = filterStatus !== "all" || fiscalFilter !== "all" || cnpjFilter !== "all";
  const isLoading = loadingClients || loadingDocTypes || loadingStatus || loadingFiscalSync || loadingCnpjSync || loadingSyncCursor;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contabilidades Prontas</h1>
          <p className="text-sm text-muted-foreground">
            Status de documentos e fechamento fiscal sincronizado por competencia
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={isRefreshing} className="h-8">
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
                Atualizar empresas
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Ultimo refresh: {formatDateTime(syncCursor?.last_pull_at || null)}
            {syncCursor?.last_pull_status ? ` (${syncCursor.last_pull_status})` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge
          className={`cursor-pointer ${statusConfig.green.badgeBg} ${filterStatus === "green" ? "ring-2 ring-green-400" : ""}`}
          variant="outline"
          onClick={() => setFilterStatus(filterStatus === "green" ? "all" : "green")}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {docCounts.green} pronta(s)
        </Badge>
        <Badge
          className={`cursor-pointer ${statusConfig.yellow.badgeBg} ${filterStatus === "yellow" ? "ring-2 ring-yellow-400" : ""}`}
          variant="outline"
          onClick={() => setFilterStatus(filterStatus === "yellow" ? "all" : "yellow")}
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          {docCounts.yellow} parcial(is)
        </Badge>
        <Badge
          className={`cursor-pointer ${statusConfig.red.badgeBg} ${filterStatus === "red" ? "ring-2 ring-red-400" : ""}`}
          variant="outline"
          onClick={() => setFilterStatus(filterStatus === "red" ? "all" : "red")}
        >
          <XCircle className="h-3 w-3 mr-1" />
          {docCounts.red} pendente(s)
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge
          className={`cursor-pointer ${getFiscalBadgeClass(true)} ${fiscalFilter === "closed" ? "ring-2 ring-green-400" : ""}`}
          variant="outline"
          onClick={() => setFiscalFilter(fiscalFilter === "closed" ? "all" : "closed")}
        >
          {fiscalCounts.closed} fiscal fechado
        </Badge>
        <Badge
          className={`cursor-pointer ${getFiscalBadgeClass(false)} ${fiscalFilter === "open" ? "ring-2 ring-amber-400" : ""}`}
          variant="outline"
          onClick={() => setFiscalFilter(fiscalFilter === "open" ? "all" : "open")}
        >
          {fiscalCounts.open} fiscal nao fechado
        </Badge>
        <Badge
          className={`cursor-pointer ${getFiscalBadgeClass(null)} ${fiscalFilter === "no_sync" ? "ring-2 ring-muted-foreground" : ""}`}
          variant="outline"
          onClick={() => setFiscalFilter(fiscalFilter === "no_sync" ? "all" : "no_sync")}
        >
          {fiscalCounts.noSync} sem sync
        </Badge>
        {hasAnyFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => {
              setFilterStatus("all");
              setFiscalFilter("all");
              setCnpjFilter("all");
            }}
          >
            <Filter className="h-3 w-3 mr-1" /> Limpar filtros
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge
          className={`cursor-pointer ${getCnpjBadgeClass("match")} ${cnpjFilter === "match" ? "ring-2 ring-green-400" : ""}`}
          variant="outline"
          onClick={() => setCnpjFilter(cnpjFilter === "match" ? "all" : "match")}
        >
          {cnpjCounts.match} CNPJ ok
        </Badge>
        <Badge
          className={`cursor-pointer ${getCnpjBadgeClass("mismatch")} ${cnpjFilter === "mismatch" ? "ring-2 ring-red-400" : ""}`}
          variant="outline"
          onClick={() => setCnpjFilter(cnpjFilter === "mismatch" ? "all" : "mismatch")}
        >
          {cnpjCounts.mismatch} CNPJ divergente
        </Badge>
        <Badge
          className={`cursor-pointer ${getCnpjBadgeClass("missing_source")} ${cnpjFilter === "missing_source" ? "ring-2 ring-muted-foreground" : ""}`}
          variant="outline"
          onClick={() => setCnpjFilter(cnpjFilter === "missing_source" ? "all" : "missing_source")}
        >
          {cnpjCounts.missingSource} sem CNPJ no factor-ace
        </Badge>
        <Badge
          className={`cursor-pointer ${getCnpjBadgeClass("missing_local")} ${cnpjFilter === "missing_local" ? "ring-2 ring-muted-foreground" : ""}`}
          variant="outline"
          onClick={() => setCnpjFilter(cnpjFilter === "missing_local" ? "all" : "missing_local")}
        >
          {cnpjCounts.missingLocal} sem CNPJ local
        </Badge>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar empresa por nome ou CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredInfos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">
            Nenhuma empresa encontrada
            {hasAnyFilter ? " com estes filtros." : "."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredInfos.map((info) => {
            const config = statusConfig[info.status];
            const StatusIcon = config.icon;
            const isExpanded = expandedClients.has(info.clientId);

            return (
              <div
                key={info.clientId}
                className={`border rounded-lg border-l-4 ${statusBorderColors[info.status]} bg-card transition-shadow hover:shadow-md`}
              >
                <button onClick={() => toggleExpand(info.clientId)} className="w-full text-left p-3 flex items-start gap-3">
                  <StatusIcon className={`h-5 w-5 mt-0.5 shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{info.legalName}</p>
                    {info.tradeName && <p className="text-xs text-muted-foreground truncate">{info.tradeName}</p>}
                    <p className="text-[11px] text-muted-foreground truncate">
                      CNPJ local: {info.localCnpj || "-"}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                      <span className="text-xs">
                        <span className="font-medium text-red-600 dark:text-red-400">Essenciais:</span>{" "}
                        {info.essentialReceived}/{info.essentialTotal}
                      </span>
                      <span className="text-xs">
                        <span className="font-medium text-yellow-600 dark:text-yellow-400">Necessarios:</span>{" "}
                        {info.necessaryReceived}/{info.necessaryTotal}
                      </span>
                    </div>
                    <div className="mt-2">
                      <Badge variant="outline" className={`text-[10px] ${getFiscalBadgeClass(info.fiscalClosed)}`}>
                        {getFiscalBadgeLabel(info.fiscalClosed)}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ml-1 ${getCnpjBadgeClass(info.cnpjCrossStatus)}`}>
                        {getCnpjBadgeLabel(info.cnpjCrossStatus)}
                      </Badge>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t">
                    <div className="pt-2 text-xs text-muted-foreground">
                      Sync fiscal atualizado em: {formatDateTime(info.fiscalUpdatedAt)}
                    </div>
                    <div className="pt-1 text-xs text-muted-foreground">
                      CNPJ factor-ace: {info.sourceCnpj || "-"}
                    </div>
                    {info.missingDocs.length === 0 ? (
                      <p className="text-xs text-green-600 dark:text-green-400 pt-2">
                        Todos os documentos essenciais e necessarios foram recebidos.
                      </p>
                    ) : (
                      <div className="pt-2 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Documentos faltantes ({info.missingDocs.length}):
                        </p>
                        {info.missingDocs.map((doc, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs py-0.5">
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                                doc.classification === "essencial" ? "bg-red-500" : "bg-yellow-500"
                              }`}
                            />
                            <span className="truncate">{doc.name}</span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1 py-0 shrink-0 ${
                                doc.classification === "essencial"
                                  ? "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300"
                                  : "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-300"
                              }`}
                            >
                              {doc.classification === "essencial" ? "Essencial" : "Necessario"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
