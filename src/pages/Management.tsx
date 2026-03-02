import React, { useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import { useClients, useProfiles, useManagementConfig, useManagementReviews, usePermissionSettings } from "@/hooks/useSupabaseQuery";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Plus, Minus, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toggleManagementReview } from "@/services/management.service";
import {
  monthNamesShort,
  formatYearMonth,
  parseYearMonth,
  getFirstName,
  MIN_DATE,
  generateMonths,
  canGoPrev as canGoPrevFn,
  buildReviewMap,
  buildProfileMap,
  computeMonthStats,
  filterActiveClients,
} from "@/services/management.logic";

export default function Management() {
  const { user, isAdmin, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: permissions } = usePermissionSettings();

  // Permission check
  const hasAccess = useMemo(() => {
    if (isAdmin) return true;
    const perm = permissions?.find((p: any) => p.key === "view_management");
    if (!perm) return true;
    return (perm.allowed_roles || []).includes(userRole);
  }, [isAdmin, permissions, userRole]);

  const { data: clients, isLoading: loadingClients } = useClients();
  const { data: profiles } = useProfiles();
  const { data: config } = useManagementConfig();

  if (permissions && !hasAccess) return <Navigate to="/" replace />;

  const [search, setSearch] = useState("");
  const [monthCount, setMonthCount] = useState(6);
  const [baseDate, setBaseDate] = useState(() => new Date());
  const [filterC1, setFilterC1] = useState(false);
  const [filterC2, setFilterC2] = useState(false);
  const [filterNoneMonth, setFilterNoneMonth] = useState<string>("");

  // Reviewer config
  const reviewer1Id = config?.find((c: any) => c.key === "reviewer_1")?.user_id || null;
  const reviewer2Id = config?.find((c: any) => c.key === "reviewer_2")?.user_id || null;

  const profileMap = useMemo(() => buildProfileMap(profiles as any), [profiles]);

  const reviewer1Name = reviewer1Id ? profileMap[reviewer1Id] : null;
  const reviewer2Name = reviewer2Id ? profileMap[reviewer2Id] : null;
  const reviewer1FirstName = getFirstName(reviewer1Name);
  const reviewer2FirstName = getFirstName(reviewer2Name);

  const months = useMemo(() => generateMonths(baseDate, monthCount), [baseDate, monthCount]);

  const addMonth = () => {
    if (monthCount >= 12) return;
    setMonthCount((prev) => prev + 1);
    setBaseDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const removeMonth = () => setMonthCount((prev) => Math.max(prev - 1, 1));

  const canGoPrev = useMemo(() => canGoPrevFn(baseDate, monthCount), [baseDate, monthCount]);

  const prevPeriod = () => {
    if (!canGoPrev) return;
    setBaseDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - monthCount, 1));
  };
  const nextPeriod = () => {
    setBaseDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + monthCount, 1));
  };
  const goToNow = () => setBaseDate(new Date());

  // Fetch reviews for visible months
  const { data: reviews } = useManagementReviews(months);

  const reviewMap = useMemo(() => buildReviewMap(reviews as any), [reviews]);

  // All active clients (unfiltered) for dashboard stats
  const allActiveClients = useMemo(() => {
    return clients?.filter((c: any) => c.status === "Ativo") || [];
  }, [clients]);

  const monthStats = useMemo(
    () => computeMonthStats(months, allActiveClients, reviewMap),
    [months, allActiveClients, reviewMap],
  );

  // Filter handlers
  const handleFilterC1 = () => {
    if (!filterC1) {
      setFilterC1(true);
      setFilterNoneMonth("");
    } else {
      setFilterC1(false);
    }
  };
  const handleFilterC2 = () => {
    if (!filterC2) {
      setFilterC2(true);
      setFilterNoneMonth("");
    } else {
      setFilterC2(false);
    }
  };
  const handleFilterNoneMonth = (value: string) => {
    setFilterNoneMonth(value === "none" ? "" : value);
    if (value !== "none") {
      setFilterC1(false);
      setFilterC2(false);
    }
  };
  const hasFilter = filterC1 || filterC2 || !!filterNoneMonth;

  const activeClients = useMemo(
    () => filterActiveClients(clients as any, search, filterC1, filterC2, filterNoneMonth, months, reviewMap),
    [clients, search, hasFilter, filterC1, filterC2, filterNoneMonth, months, reviewMap],
  );

  // Can current user toggle?
  const currentUserId = user?.id;
  const canToggle1 = currentUserId === reviewer1Id;
  const canToggle2 = currentUserId === reviewer2Id;

  const handleToggle = useCallback(
    async (clientId: string, yearMonth: string, reviewerNumber: number) => {
      const key = `${clientId}_${yearMonth}_${reviewerNumber}`;
      const existing = reviewMap[key];

      try {
        if (existing) {
          await toggleManagementReview({
            reviewId: existing.id,
            clientId,
            yearMonth,
            reviewerNumber,
            userId: currentUserId,
          });
        } else {
          await toggleManagementReview({
            clientId,
            yearMonth,
            reviewerNumber,
            userId: currentUserId,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["management_reviews"] });
      } catch (err: any) {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      }
    },
    [reviewMap, currentUserId, queryClient, toast]
  );

  const isLoading = loadingClients;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gerência</h1>
          <p className="text-sm text-muted-foreground">
            Conferência mensal de contabilidade por empresa
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevPeriod} disabled={!canGoPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToNow}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextPeriod}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 ml-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={removeMonth} disabled={monthCount <= 1}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-xs font-medium w-16 text-center">{monthCount} {monthCount === 1 ? "mês" : "meses"}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={addMonth} disabled={monthCount >= 12}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mini dashboard */}
      {!isLoading && monthStats.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {monthStats.map((s) => {
            const { year, month } = parseYearMonth(s.ym);
            const pct = s.total > 0 ? Math.round((s.both / s.total) * 100) : 0;
            return (
              <div key={s.ym} className="border rounded-lg px-3 py-2 min-w-[130px] bg-card">
                <p className="text-[11px] font-medium text-muted-foreground mb-1">
                  {monthNamesShort[month]} {year}
                </p>
                <p className="text-lg font-bold">{pct}%</p>
                <div className="w-full h-1.5 bg-muted rounded-full mt-1 mb-2">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-green-600 dark:text-green-400">Conferidas</span>
                    <span className="font-medium">{s.both}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600 dark:text-blue-400">
                      apenas por {reviewer1FirstName || "C1"}
                    </span>
                    <span className="font-medium">{s.onlyR1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-600 dark:text-purple-400">
                      apenas por {reviewer2FirstName || "C2"}
                    </span>
                    <span className="font-medium">{s.onlyR2}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600 dark:text-red-400">Pendentes</span>
                    <span className="font-medium">{s.none}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reviewer legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-blue-200 dark:bg-blue-900 border" />
          C1: {reviewer1Name || <span className="text-muted-foreground italic">Não definido</span>}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-purple-200 dark:bg-purple-900 border" />
          C2: {reviewer2Name || <span className="text-muted-foreground italic">Não definido</span>}
        </span>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Badge
            variant="outline"
            className={`cursor-pointer text-xs px-2 py-0.5 ${filterC1 ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700" : ""}`}
            onClick={handleFilterC1}
          >
            C1
          </Badge>
          <Badge
            variant="outline"
            className={`cursor-pointer text-xs px-2 py-0.5 ${filterC2 ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300 dark:border-purple-700" : ""}`}
            onClick={handleFilterC2}
          >
            C2
          </Badge>
          <Select value={filterNoneMonth || "none"} onValueChange={handleFilterNoneMonth}>
            <SelectTrigger className={`h-7 w-[160px] text-xs ${filterNoneMonth ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30" : ""}`}>
              <SelectValue placeholder="Sem marcação..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem marcação...</SelectItem>
              {months.map((ym) => {
                const { year, month } = parseYearMonth(ym);
                return (
                  <SelectItem key={ym} value={ym}>
                    {monthNamesShort[month]} {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-xs text-muted-foreground"
              onClick={() => { setFilterC1(false); setFilterC2(false); setFilterNoneMonth(""); }}
            >
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Spreadsheet */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {(() => {
            const colW = 48;
            const empW = 350;
            const totalW = empW + months.length * 2 * colW;
            const colgroup = (
              <colgroup>
                <col style={{ width: empW }} />
                {months.map((ym) => (
                  <React.Fragment key={`col-${ym}`}>
                    <col style={{ width: colW }} />
                    <col style={{ width: colW }} />
                  </React.Fragment>
                ))}
              </colgroup>
            );
            const tableStyle = { borderCollapse: "separate" as const, borderSpacing: 0, tableLayout: "fixed" as const, width: totalW };

            return (
              <>
                {/* Header fixo */}
                <div className="overflow-hidden bg-primary text-primary-foreground" id="management-header">
                  <table className="text-sm" style={tableStyle}>
                    {colgroup}
                    <thead>
                      <tr>
                        <th className="text-left px-3 py-2 border-b border-r border-primary-foreground/20 font-semibold">
                          Empresa
                        </th>
                        {months.map((ym) => {
                          const { year, month } = parseYearMonth(ym);
                          return (
                            <th
                              key={ym}
                              colSpan={2}
                              className="text-center px-1 py-2 border-b border-r border-primary-foreground/20 font-medium whitespace-nowrap"
                            >
                              <span className="text-xs">
                                {monthNamesShort[month]} {year}
                              </span>
                            </th>
                          );
                        })}
                      </tr>
                      <tr>
                        <th className="border-b border-r border-primary-foreground/20" />
                        {months.map((ym) => (
                          <React.Fragment key={`sub-${ym}`}>
                            <th className="text-center px-1 py-1 border-b border-r border-primary-foreground/20 text-[10px] font-normal text-primary-foreground/70">
                              C1
                            </th>
                            <th className="text-center px-1 py-1 border-b border-r border-primary-foreground/20 text-[10px] font-normal text-primary-foreground/70">
                              C2
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                  </table>
                </div>
                {/* Body scrollável */}
                <div
                  className="overflow-auto max-h-[calc(100vh-400px)]"
                  onScroll={(e) => {
                    const header = document.getElementById("management-header");
                    if (header) header.scrollLeft = e.currentTarget.scrollLeft;
                  }}
                >
                  <table className="text-sm" style={tableStyle}>
                    {colgroup}
                    <tbody>
                      {activeClients.map((client: any) => (
                        <tr key={client.id} className="hover:bg-accent/30">
                          <td className="sticky left-0 z-10 bg-card px-3 py-1.5 border-b border-r font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                            <span className="text-sm" title={client.legal_name}>{client.legal_name}</span>
                          </td>
                          {months.map((ym) => {
                            const r1 = reviewMap[`${client.id}_${ym}_1`];
                            const r2 = reviewMap[`${client.id}_${ym}_2`];
                            const bothChecked = !!r1 && !!r2;
                            const oneChecked = (!!r1 || !!r2) && !bothChecked;

                            const cellBg = bothChecked
                              ? "bg-green-50 dark:bg-green-950/30"
                              : oneChecked
                                ? "bg-yellow-50 dark:bg-yellow-950/30"
                                : "";

                            return (
                              <React.Fragment key={`${client.id}-${ym}`}>
                                <td className={`text-center border-b border-r px-1 py-1 ${cellBg}`}>
                                  <ReviewCell
                                    review={r1}
                                    canToggle={canToggle1 || (isAdmin && !!r1)}
                                    reviewerName={r1 ? profileMap[r1.reviewed_by] || "—" : ""}
                                    onToggle={() => handleToggle(client.id, ym, 1)}
                                  />
                                </td>
                                <td className={`text-center border-b border-r px-1 py-1 ${cellBg}`}>
                                  <ReviewCell
                                    review={r2}
                                    canToggle={canToggle2 || (isAdmin && !!r2)}
                                    reviewerName={r2 ? profileMap[r2.reviewed_by] || "—" : ""}
                                    onToggle={() => handleToggle(client.id, ym, 2)}
                                  />
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ))}
                      {activeClients.length === 0 && (
                        <tr>
                          <td colSpan={1 + months.length * 2} className="text-center text-muted-foreground py-8 text-sm">
                            Nenhuma empresa encontrada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── Review Cell ──

function ReviewCell({
  review,
  canToggle,
  reviewerName,
  onToggle,
}: {
  review: any;
  canToggle: boolean;
  reviewerName: string;
  onToggle: () => void;
}) {
  const checked = !!review;
  const date = review?.reviewed_at
    ? new Date(review.reviewed_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  if (!checked && !canToggle) {
    return <span className="inline-block h-4 w-4" />;
  }

  const checkbox = (
    <Checkbox
      checked={checked}
      onCheckedChange={onToggle}
      disabled={!canToggle}
      className="h-4 w-4"
    />
  );

  if (checked) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{checkbox}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{reviewerName}</p>
          <p className="text-muted-foreground">{date}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return checkbox;
}
