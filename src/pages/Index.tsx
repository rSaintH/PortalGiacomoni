import { useState, useMemo, memo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  useClients,
  useClientPops,
  useClientParticularities,
  useTasks,
  useOccurrences,
  useSectors,
  useProfiles,
} from "@/hooks/useSupabaseQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Search,
  FileText,
  AlertTriangle,
  ClipboardList,
  MessageSquare,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { fetchAllActiveDocumentTypes, fetchAllDocumentMonthlyStatus } from "@/services/documents.service";
import { canSeeDashboard as checkCanSeeDashboard } from "@/services/permissions.logic";
import {
  getGreeting,
  formatYearMonth,
  monthNames,
  computeTaskStats,
  getOverdueTasks,
  computeAccountingStats,
} from "@/services/dashboard.logic";

// ── Dashboard Section (supervisão + admin) ──

function DashboardSection({ userSectorId }: { userSectorId: string | null }) {
  const { data: clients } = useClients();
  const { data: allTasks } = useTasks({});

  const now = new Date();
  const yearMonth = formatYearMonth(now);

  const { data: allDocTypes } = useQuery({
    queryKey: ["all_document_types_active"],
    staleTime: 5 * 60 * 1000,
    queryFn: fetchAllActiveDocumentTypes,
  });

  const { data: allMonthlyStatus } = useQuery({
    queryKey: ["all_document_monthly_status", yearMonth],
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchAllDocumentMonthlyStatus(yearMonth),
  });

  const taskStats = useMemo(() => computeTaskStats(allTasks as any), [allTasks]);
  const overdueTasks = useMemo(() => getOverdueTasks(allTasks as any, 5), [allTasks]);

  const accountingStats = useMemo(
    () => computeAccountingStats(clients as any, allDocTypes as any, allMonthlyStatus as any),
    [clients, allDocTypes, allMonthlyStatus],
  );

  const activeClientsCount = clients?.filter((c: any) => c.status === "Ativo").length ?? 0;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pendências Abertas</p>
                <p className="text-2xl font-bold mt-1">{taskStats.total}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-muted-foreground/30" />
            </div>
            {taskStats.overdue > 0 && (
              <p className="text-xs text-destructive font-medium mt-1">
                {taskStats.overdue} vencida(s)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Vencem Hoje</p>
                <p className="text-2xl font-bold mt-1">{taskStats.openToday}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Contabilidades</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">{accountingStats.green}</span>
                  <span className="text-muted-foreground/50">/</span>
                  <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{accountingStats.yellow}</span>
                  <span className="text-muted-foreground/50">/</span>
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">{accountingStats.red}</span>
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {monthNames[now.getMonth()]} {now.getFullYear()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Clientes Ativos</p>
                <p className="text-2xl font-bold mt-1">{activeClientsCount}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attention section: overdue tasks + red clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Overdue tasks */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Pendências Vencidas
              {taskStats.overdue > 0 && (
                <Badge variant="destructive" className="text-[10px] ml-auto">{taskStats.overdue}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {overdueTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Nenhuma pendência vencida.</p>
            ) : (
              <div className="space-y-0">
                {overdueTasks.map((t: any) => (
                  <div key={t.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.clients?.legal_name || t.clients?.trade_name || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="destructive" className="text-[10px]">{t.status}</Badge>
                      <span className="text-[11px] text-destructive font-medium">
                        {format(new Date(t.due_date), "dd/MM")}
                      </span>
                    </div>
                  </div>
                ))}
                {taskStats.overdue > 5 && (
                  <Link
                    to="/tasks"
                    className="flex items-center gap-1 text-xs text-primary hover:underline pt-2"
                  >
                    Ver todas ({taskStats.overdue}) <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Red clients - docs missing */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Empresas com Docs Essenciais Faltando
              {accountingStats.red > 0 && (
                <Badge variant="outline" className="text-[10px] ml-auto bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {accountingStats.red}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {accountingStats.topRed.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                <CheckCircle2 className="h-3.5 w-3.5 inline mr-1 text-green-500" />
                Todas as empresas com essenciais em dia.
              </p>
            ) : (
              <div className="space-y-0">
                {accountingStats.topRed.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <p className="text-sm font-medium truncate flex-1 min-w-0">{c.name}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      {c.missing} essencial(is)
                    </Badge>
                  </div>
                ))}
                {accountingStats.red > 5 && (
                  <Link
                    to="/accounting-ready"
                    className="flex items-center gap-1 text-xs text-primary hover:underline pt-2"
                  >
                    Ver todas ({accountingStats.red}) <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Colaborador section: own sector overdue tasks ──

function ColaboradorSection({ userSectorId }: { userSectorId: string | null }) {
  const { data: allTasks } = useTasks({ sectorId: userSectorId ?? undefined });
  const { data: sectors } = useSectors();

  const sectorName = sectors?.find((s: any) => s.id === userSectorId)?.name ?? "Seu setor";

  const taskStats = useMemo(() => computeTaskStats(allTasks as any), [allTasks]);
  const overdueTasks = useMemo(() => getOverdueTasks(allTasks as any, 5), [allTasks]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-lg">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground font-medium">Pendências ({sectorName})</p>
            <p className="text-2xl font-bold mt-1">{taskStats.total}</p>
            {taskStats.overdue > 0 && (
              <p className="text-xs text-destructive font-medium mt-1">{taskStats.overdue} vencida(s)</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground font-medium">Vencem Hoje</p>
            <p className="text-2xl font-bold mt-1">{taskStats.openToday}</p>
          </CardContent>
        </Card>
      </div>

      {overdueTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Pendências Vencidas
              <Badge variant="destructive" className="text-[10px] ml-auto">{overdueTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {overdueTasks.map((t: any) => (
              <div key={t.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.clients?.legal_name || t.clients?.trade_name || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="destructive" className="text-[10px]">{t.status}</Badge>
                  <span className="text-[11px] text-destructive font-medium">
                    {format(new Date(t.due_date), "dd/MM")}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main Page ──

export default function Index() {
  const { user, isAdmin, userRole, userSectorId } = useAuth();
  const { data: profiles } = useProfiles();

  const canSeeDashboard = checkCanSeeDashboard(isAdmin, userRole);

  // Get user's full name from profiles
  const userName = useMemo(() => {
    if (!profiles || !user) return null;
    const profile = profiles.find((p: any) => p.user_id === user.id);
    if (!profile) return null;
    const name = (profile as any).full_name as string | undefined;
    return name?.split(" ")[0] ?? null; // First name only
  }, [profiles, user]);

  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const { data: clients } = useClients();
  const { data: sectors } = useSectors();

  const selectedClient = useMemo(
    () => clients?.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const filteredClients = useMemo(() => {
    if (!search.trim() || !clients) return [];
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.legal_name.toLowerCase().includes(q) ||
        c.trade_name?.toLowerCase().includes(q) ||
        c.cnpj?.includes(q)
    ).slice(0, 8);
  }, [clients, search]);

  // Data for selected client
  const { data: pops } = useClientPops(selectedClientId ?? "");
  const { data: particularities } = useClientParticularities(selectedClientId ?? "");
  const { data: tasks } = useTasks({ clientId: selectedClientId ?? undefined });
  const { data: occurrences } = useOccurrences(selectedClientId ?? undefined);

  const handleSelectClient = (id: string) => {
    setSelectedClientId(id);
    const client = clients?.find((c) => c.id === id);
    setSearch(client?.legal_name ?? "");
    setShowResults(false);
  };

  const handleClear = () => {
    setSelectedClientId(null);
    setSearch("");
  };

  // Group data by sector
  const sectorData = useMemo(() => {
    if (!sectors) return [];
    return sectors.map((sector) => ({
      sector,
      pops: pops?.filter((p: any) => p.sector_id === sector.id) ?? [],
      particularities: particularities?.filter((p: any) => p.sector_id === sector.id) ?? [],
      tasks: tasks?.filter((t: any) => t.sector_id === sector.id) ?? [],
      occurrences: occurrences?.filter((o: any) => o.sector_id === sector.id) ?? [],
    }));
  }, [sectors, pops, particularities, tasks, occurrences]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">
          {getGreeting()}{userName ? `, ${userName}` : ""}!
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {canSeeDashboard
            ? "Visão geral do escritório"
            : "Sua área de trabalho"}
        </p>
      </div>

      {/* Dashboard for admin/supervisor */}
      {canSeeDashboard && <DashboardSection userSectorId={userSectorId} />}

      {/* Colaborador: own sector stats */}
      {!canSeeDashboard && <ColaboradorSection userSectorId={userSectorId} />}

      {/* Divider */}
      <div className="border-t pt-4">
        <h2 className="text-lg font-semibold mb-3">Área de Trabalho</h2>
        <p className="text-muted-foreground text-sm mb-3">
          Selecione um cliente para visualizar informações por setor
        </p>
      </div>

      {/* Client search */}
      <div className="relative max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente por nome ou CNPJ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowResults(true);
              if (!e.target.value.trim()) setSelectedClientId(null);
            }}
            onFocus={() => setShowResults(true)}
            className="pl-9 pr-4"
          />
        </div>

        {showResults && filteredClients.length > 0 && !selectedClientId && (
          <Card className="absolute z-50 w-full mt-1 shadow-lg">
            <CardContent className="p-1">
              {filteredClients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectClient(c.id)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-accent text-sm transition-colors flex items-center gap-2"
                >
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.legal_name}</p>
                    {c.trade_name && (
                      <p className="text-xs text-muted-foreground truncate">{c.trade_name}</p>
                    )}
                  </div>
                  {c.cnpj && (
                    <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">
                      {c.cnpj}
                    </span>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Selected client info */}
      {selectedClient && (
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm py-1 px-3 gap-2">
            <Building2 className="h-3.5 w-3.5" />
            {selectedClient.legal_name}
            {selectedClient.trade_name && ` (${selectedClient.trade_name})`}
          </Badge>
          <button
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Trocar cliente
          </button>
        </div>
      )}

      {/* No client selected */}
      {!selectedClientId && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhum cliente selecionado</p>
            <p className="text-sm mt-1">Use a busca acima para começar</p>
          </CardContent>
        </Card>
      )}

      {/* Sector tabs */}
      {selectedClientId && sectors && sectors.length > 0 && (
        <Tabs defaultValue={sectors[0]?.id} className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {sectors.map((s) => {
              const sd = sectorData.find((d) => d.sector.id === s.id);
              const overdueCount = sd?.tasks.filter(
                (t: any) => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))
              ).length ?? 0;

              return (
                <TabsTrigger key={s.id} value={s.id} className="gap-1.5 text-sm">
                  {s.name}
                  {overdueCount > 0 && (
                    <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                      {overdueCount}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {sectorData.map(({ sector, pops: sPops, particularities: sPartics, tasks: sTasks, occurrences: sOccurrences }) => (
            <TabsContent key={sector.id} value={sector.id} className="mt-4 space-y-4">
              {/* Pendências */}
              <SectionBlock
                title="Pendências"
                icon={<ClipboardList className="h-4 w-4" />}
                count={sTasks.length}
                emptyText="Nenhuma pendência neste setor"
              >
                {sTasks.map((t: any) => {
                  const overdue = t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date));
                  return (
                    <div key={t.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{t.title}</p>
                        {t.description && (
                          <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={overdue ? "destructive" : "secondary"} className="text-[10px]">
                          {t.status}
                        </Badge>
                        {t.due_date && (
                          <span className={`text-[11px] ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                            {format(new Date(t.due_date), "dd/MM")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </SectionBlock>

              {/* Particularidades */}
              <SectionBlock
                title="Particularidades"
                icon={<AlertTriangle className="h-4 w-4" />}
                count={sPartics.length}
                emptyText="Nenhuma particularidade registrada"
              >
                {sPartics.map((p: any) => (
                  <div key={p.id} className="py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{p.title}</p>
                      <Badge variant="outline" className="text-[10px]">{p.priority}</Badge>
                    </div>
                    {p.details && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.details}</p>
                    )}
                  </div>
                ))}
              </SectionBlock>

              {/* POPs */}
              <SectionBlock
                title="POPs"
                icon={<FileText className="h-4 w-4" />}
                count={sPops.length}
                emptyText="Nenhum POP disponível"
              >
                {sPops.map((p: any) => (
                  <div key={p.id} className="flex items-start justify-between py-2 border-b last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{p.title}</p>
                      {p.objective && (
                        <p className="text-xs text-muted-foreground truncate">{p.objective}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-[10px]">{p.scope}</Badge>
                      <Badge variant="secondary" className="text-[10px]">v{p.version}</Badge>
                    </div>
                  </div>
                ))}
              </SectionBlock>

              {/* Ocorrências */}
              <SectionBlock
                title="Ocorrências"
                icon={<MessageSquare className="h-4 w-4" />}
                count={sOccurrences.length}
                emptyText="Nenhuma ocorrência registrada"
              >
                {sOccurrences.map((o: any) => (
                  <div key={o.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{o.title}</p>
                      {o.description && (
                        <p className="text-xs text-muted-foreground truncate">{o.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-[10px]">{o.category}</Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(o.occurred_at), "dd/MM")}
                      </span>
                    </div>
                  </div>
                ))}
              </SectionBlock>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

const SectionBlock = memo(function SectionBlock({
  title,
  icon,
  count,
  emptyText,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {icon}
          {title}
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {count}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {count === 0 ? (
          <p className="text-xs text-muted-foreground py-2">{emptyText}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
});
