import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useClients, useSectors, usePermissionSettings } from "@/hooks/useSupabaseQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Pencil,
  Check,
  Send,
  Loader2,
  Plus,
  Undo2,
  ChevronDown,
  History,
} from "lucide-react";
import {
  fetchReinfProfiles,
  fetchReinfLogs,
  fetchAllClientPartners,
  fetchReinfEntries,
  fetchPartnerProfitsByEntryIds,
  fetchPartnerProfitsByEntryAndMonth,
  insertReinfLog,
  createReinfEntry,
  updateReinfEntry,
  replacePartnerProfitsForMonth,
} from "@/services/reinf.service";
import {
  allMonthsDpAprovado,
  allMonthsEnviado,
  buildAdvanceFiscalTrimestralUpdate,
  buildAdvanceMesStatusUpdate,
  buildRevertFiscalTrimestralUpdate,
  buildRevertMesStatusUpdate,
  formatCurrency,
  formatDate,
  getMesContabilUser,
  getMesDpUser,
  getMesFiscalUser,
  getMesLucro,
  getMesStatus,
  getMonthTotal,
  type Partner,
  type PartnerProfit,
  type PartnerSelections,
  type Profile,
  type ReinfEntry,
  type ReinfLog,
  STATUS_CONFIG,
  TRIMESTRE_LABELS,
  TRIMESTRE_MESES,
} from "@/services/reinf.logic";
import { getReinfSectorPermissions, canFillReinfProfits } from "@/services/permissions.logic";

export default function Reinf() {
  const { user, isAdmin, userRole, userSectorId } = useAuth();
  const { data: clients } = useClients();
  const { data: sectors } = useSectors();
  const { data: permissionSettings } = usePermissionSettings();
  const [entries, setEntries] = useState<ReinfEntry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<ReinfLog[]>([]);
  const [loading, setLoading] = useState(true);

  const userSectorName = sectors?.find((s) => s.id === userSectorId)?.name || "";
  const { canContabil, canDP, canFiscal } = getReinfSectorPermissions(isAdmin, userSectorName);
  const canFillProfits = canFillReinfProfits(permissionSettings as any, userRole, canContabil);

  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const [filterAno, setFilterAno] = useState(currentYear.toString());
  const [filterTrimestre, setFilterTrimestre] = useState(currentQuarter.toString());

  const [createOpen, setCreateOpen] = useState(false);
  const [newClientId, setNewClientId] = useState("");
  const [newAno, setNewAno] = useState(currentYear.toString());
  const [newTrimestre, setNewTrimestre] = useState(currentQuarter.toString());
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ReinfEntry | null>(null);
  const [editMes, setEditMes] = useState<number>(1);
  const [savingLucros, setSavingLucros] = useState(false);

  const [editPartners, setEditPartners] = useState<Partner[]>([]);
  const [partnerSelections, setPartnerSelections] = useState<PartnerSelections>({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{entry: ReinfEntry;mes: number;type: "advance" | "revert";} | null>(null);

  const [allPartners, setAllPartners] = useState<Partner[]>([]);
  const [entryPartnerProfits, setEntryPartnerProfits] = useState<PartnerProfit[]>([]);

  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p) => {map[p.user_id] = p.full_name;});
    return map;
  }, [profiles]);

  const getProfileName = (userId: string | null) => {
    if (!userId) return null;
    return profileMap[userId] || "—";
  };

  const logsByEntry = useMemo(() => {
    const map: Record<string, ReinfLog[]> = {};
    logs.forEach((l) => {
      if (!map[l.reinf_entry_id]) map[l.reinf_entry_id] = [];
      map[l.reinf_entry_id].push(l);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    return map;
  }, [logs]);

  const fetchProfiles = useCallback(async () => {
    const data = await fetchReinfProfiles();
    setProfiles(data as Profile[]);
  }, []);

  const fetchLogs = useCallback(async (entryIds: string[]) => {
    if (entryIds.length === 0) {setLogs([]);return;}
    const data = await fetchReinfLogs(entryIds);
    setLogs(data as ReinfLog[]);
  }, []);

  const fetchAllPartners = useCallback(async () => {
    const data = await fetchAllClientPartners();
    setAllPartners(data as Partner[]);
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      const entries = await fetchReinfEntries({
        ano: parseInt(filterAno),
        trimestre: parseInt(filterTrimestre),
      });
      setEntries((entries || []) as ReinfEntry[]);
      setLoading(false);
      fetchLogs(entries.map((entry: any) => entry.id));
      if (entries.length > 0) {
        const profits = await fetchPartnerProfitsByEntryIds(entries.map((entry: any) => entry.id));
        setEntryPartnerProfits((profits || []) as PartnerProfit[]);
      } else {
        setEntryPartnerProfits([]);
      }
    } catch {
      toast.error("Erro ao carregar dados da REINF.");
    }
  }, [filterAno, filterTrimestre, fetchLogs]);

  useEffect(() => {
    setLoading(true);
    fetchEntries();
    fetchProfiles();
    fetchAllPartners();
  }, [fetchEntries, fetchProfiles, fetchAllPartners]);

  const addLog = async (entryId: string, action: string, details?: string) => {
    if (!user?.id) return;
    await insertReinfLog({ entryId, userId: user.id, action, details });
  };

  const handleCreate = async () => {
    if (!newClientId) {toast.error("Selecione um cliente.");return;}
    setCreating(true);
    try {
      const data = await createReinfEntry({
        clientId: newClientId,
        ano: parseInt(newAno),
        trimestre: parseInt(newTrimestre),
        userId: user?.id,
      });
      if (data) await addLog(data.id, "Entrada criada");
      toast.success("Entrada criada com sucesso!");
      setCreateOpen(false);
      setNewClientId("");
      fetchEntries();
    } catch (error: any) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        toast.error("Ja existe uma entrada para este cliente neste trimestre.");
      } else {
        toast.error("Erro ao criar entrada: " + error.message);
      }
    } finally {
      setCreating(false);
    }
  };

  const openEditDialog = async (entry: ReinfEntry, mesNum: number) => {
    setEditEntry(entry);
    setEditMes(mesNum);
    const clientPartners = allPartners.filter((p) => p.client_id === entry.client_id);
    setEditPartners(clientPartners);

    const selections: PartnerSelections = { [mesNum]: {} };
    if (clientPartners.length > 0) {
      const profits = await fetchPartnerProfitsByEntryAndMonth(entry.id, mesNum);
      for (const pp of (profits || []) as PartnerProfit[]) {
        selections[mesNum][pp.partner_id] = { selected: true, valor: pp.valor.toString() };
      }
    } else {
      const existingVal = getMesLucro(entry, mesNum);
      selections[mesNum] = { __no_partner__: { selected: true, valor: existingVal ? existingVal.toString() : "" } };
    }
    setPartnerSelections(selections);
    setEditOpen(true);
  };

  const handleSaveLucros = async () => {
    if (!editEntry) return;
    const mes = editMes;
    const meses = TRIMESTRE_MESES[editEntry.trimestre];
    const mesData = partnerSelections[mes] || {};

    if (editPartners.length > 0) {
      const realSelected = Object.entries(mesData).filter(([k, s]) => s.selected && k !== "__no_partner__");
      if (realSelected.length === 0) {toast.error(`Selecione ao menos um sócio para ${meses[mes - 1]}.`);return;}
    }

    const monthTotal = editPartners.length > 0 ?
    Object.entries(mesData).filter(([k, s]) => s.selected && k !== "__no_partner__").reduce((sum, [, s]) => sum + (parseFloat(s.valor) || 0), 0) :
    parseFloat(mesData.__no_partner__?.valor || "0") || 0;

    const oldVal = getMesLucro(editEntry, mes);
    const isUpdate = (oldVal || 0) !== 0;
    setSavingLucros(true);

    const updateField = mes === 1 ? "lucro_mes1" : mes === 2 ? "lucro_mes2" : "lucro_mes3";
    try {
      await updateReinfEntry(editEntry.id, { [updateField]: monthTotal });
    } catch {
      setSavingLucros(false);
      toast.error("Erro ao salvar lucros.");
      return;
    }

    if (editPartners.length > 0) {
      const inserts = Object.entries(mesData).
      filter(([k, s]) => s.selected && k !== "__no_partner__").
      map(([partnerId, sel]) => ({ partner_id: partnerId, valor: parseFloat(sel.valor) || 0 }));
      await replacePartnerProfitsForMonth({ entryId: editEntry.id, mes, values: inserts });
    }
    setSavingLucros(false);

    const partnerDetails = editPartners.length > 0 ?
    Object.entries(mesData).filter(([k, s]) => s.selected && k !== "__no_partner__").map(([pid, s]) => {
      const pName = editPartners.find((p) => p.id === pid)?.name || "?";
      return `${pName}: ${formatCurrency(parseFloat(s.valor) || 0)}`;
    }).join(", ") :
    "";

    if (isUpdate) {
      await addLog(editEntry.id, "Lucros alterados", `${meses[mes - 1]}: ${formatCurrency(oldVal || 0)} → ${formatCurrency(monthTotal)}${partnerDetails ? ` (${partnerDetails})` : ""}`);
    } else {
      await addLog(editEntry.id, "Lucros preenchidos", `${meses[mes - 1]}: ${formatCurrency(monthTotal)}${partnerDetails ? ` (${partnerDetails})` : ""}`);
    }
    toast.success("Lucros salvos com sucesso!");
    setEditOpen(false);
    fetchEntries();
  };

  // ── Per-month status actions ──
  const requestConfirmation = (entry: ReinfEntry, mes: number, type: "advance" | "revert") => {
    setConfirmAction({ entry, mes, type });
    setConfirmOpen(true);
  };

  // Quarterly fiscal confirmation
  const [confirmFiscalOpen, setConfirmFiscalOpen] = useState(false);
  const [confirmFiscalEntry, setConfirmFiscalEntry] = useState<ReinfEntry | null>(null);
  const [confirmFiscalType, setConfirmFiscalType] = useState<"advance" | "revert">("advance");

  const requestFiscalConfirmation = (entry: ReinfEntry, type: "advance" | "revert") => {
    setConfirmFiscalEntry(entry);
    setConfirmFiscalType(type);
    setConfirmFiscalOpen(true);
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    const { entry, mes, type } = confirmAction;
    setConfirmOpen(false);
    setConfirmAction(null);
    if (type === "advance") await doAdvanceMesStatus(entry, mes);else
    await doRevertMesStatus(entry, mes);
  };

  const doAdvanceMesStatus = async (entry: ReinfEntry, mes: number) => {
    const transition = buildAdvanceMesStatusUpdate(entry, mes, user?.id);
    if (!transition) return;

    try {
      await updateReinfEntry(entry.id, transition.updateData);
    } catch {
      toast.error("Erro ao atualizar status.");
      return;
    }

    const mesName = TRIMESTRE_MESES[entry.trimestre][mes - 1];
    const newLabel = STATUS_CONFIG[transition.nextStatus]?.label ?? transition.nextStatus;
    await addLog(entry.id, `Status avan�ado`, `${mesName}: -> "${newLabel}"`);
    toast.success(`${mesName} atualizado para "${newLabel}".`);
    fetchEntries();
  };

  const doRevertMesStatus = async (entry: ReinfEntry, mes: number) => {
    const transition = buildRevertMesStatusUpdate(entry, mes);
    if (!transition) return;

    try {
      await updateReinfEntry(entry.id, transition.updateData);
    } catch {
      toast.error("Erro ao reverter status.");
      return;
    }

    const mesName = TRIMESTRE_MESES[entry.trimestre][mes - 1];
    const fromLabel = STATUS_CONFIG[transition.currentStatus]?.label ?? transition.currentStatus;
    const toLabel = STATUS_CONFIG[transition.targetStatus]?.label ?? transition.targetStatus;
    await addLog(entry.id, `Status revertido`, `${mesName}: "${fromLabel}" -> "${toLabel}"`);
    toast.success(`${mesName} revertido para "${toLabel}".`);
    fetchEntries();
  };

  const doAdvanceFiscalTrimestral = async (entry: ReinfEntry) => {
    const updateData = buildAdvanceFiscalTrimestralUpdate(user?.id);

    try {
      await updateReinfEntry(entry.id, updateData);
    } catch {
      toast.error("Erro ao enviar fiscal.");
      return;
    }

    await addLog(entry.id, "Fiscal enviado (trimestral)", `Todos os 3 meses marcados como enviados`);
    toast.success("Trimestre marcado como enviado pelo Fiscal!");
    fetchEntries();
  };

  const doRevertFiscalTrimestral = async (entry: ReinfEntry) => {
    const updateData = buildRevertFiscalTrimestralUpdate();

    try {
      await updateReinfEntry(entry.id, updateData);
    } catch {
      toast.error("Erro ao reverter fiscal.");
      return;
    }

    await addLog(entry.id, "Fiscal revertido (trimestral)", `Todos os 3 meses revertidos para "Aguardando Fiscal"`);
    toast.success("Trimestre revertido para Aguardando Fiscal.");
    fetchEntries();
  };

  const executeFiscalConfirmed = async () => {
    if (!confirmFiscalEntry) return;
    setConfirmFiscalOpen(false);
    if (confirmFiscalType === "advance") await doAdvanceFiscalTrimestral(confirmFiscalEntry);else
    await doRevertFiscalTrimestral(confirmFiscalEntry);
    setConfirmFiscalEntry(null);
  };

  const togglePartner = (mes: number, partnerId: string) => {
    setPartnerSelections((prev) => {
      const mesData = { ...(prev[mes] || {}) };
      mesData[partnerId] = mesData[partnerId]?.selected ?
      { selected: false, valor: "" } :
      { selected: true, valor: mesData[partnerId]?.valor || "" };
      return { ...prev, [mes]: mesData };
    });
  };

  const setPartnerValor = (mes: number, partnerId: string, valor: string) => {
    setPartnerSelections((prev) => {
      const mesData = { ...(prev[mes] || {}) };
      mesData[partnerId] = { ...mesData[partnerId], selected: true, valor };
      return { ...prev, [mes]: mesData };
    });
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Confirm dialog text
  const confirmMesName = confirmAction ? TRIMESTRE_MESES[confirmAction.entry.trimestre]?.[confirmAction.mes - 1] : "";
  const confirmCurrentStatus = confirmAction ? getMesStatus(confirmAction.entry, confirmAction.mes) : "";
  const confirmTitle = confirmAction?.type === "advance" ?
  STATUS_CONFIG[confirmCurrentStatus]?.nextLabel ?? "Avançar" :
  STATUS_CONFIG[confirmCurrentStatus]?.prevLabel ?? "Reverter";
  const confirmTargetLabel = confirmAction?.type === "advance" ?
  STATUS_CONFIG[STATUS_CONFIG[confirmCurrentStatus]?.nextAction ?? ""]?.label :
  STATUS_CONFIG[STATUS_CONFIG[confirmCurrentStatus]?.prevAction ?? ""]?.label;
  const confirmDesc = `Deseja ${confirmAction?.type === "advance" ? "avançar" : "reverter"} o status de ${confirmMesName} (${confirmAction?.entry.clients?.trade_name || confirmAction?.entry.clients?.legal_name}) para "${confirmTargetLabel}"?`;

  if (loading && entries.length === 0) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">EFD-REINF</h1>
          <p className="text-muted-foreground">Controle de envio da EFD-REINF por cliente e trimestre.</p>
        </div>
      </div>

      {/* Filters + Actions */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Ano:</Label>
          <Select value={filterAno} onValueChange={setFilterAno}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Trimestre:</Label>
          <Select value={filterTrimestre} onValueChange={setFilterTrimestre}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>{[1, 2, 3, 4].map((t) => <SelectItem key={t} value={t.toString()}>{TRIMESTRE_LABELS[t]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {canFillProfits &&
        <div className="ml-auto">
            <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Nova Entrada</Button>
          </div>
        }
      </div>

      {/* Create Entry Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Entrada REINF</DialogTitle>
            <DialogDescription>Selecione o cliente e o período para criar uma nova entrada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={newClientId} onValueChange={setNewClientId}>
                <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>{clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.trade_name || c.legal_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select value={newAno} onValueChange={setNewAno}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trimestre</Label>
                <Select value={newTrimestre} onValueChange={setNewTrimestre}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1, 2, 3, 4].map((t) => <SelectItem key={t} value={t.toString()}>{TRIMESTRE_LABELS[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lucros Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preencher Lucros — {editEntry && TRIMESTRE_MESES[editEntry.trimestre]?.[editMes - 1]}</DialogTitle>
            <DialogDescription>{editEntry?.clients?.trade_name || editEntry?.clients?.legal_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editPartners.length > 0 ?
            <>
                <Label className="text-sm text-muted-foreground">Selecione os sócios e preencha o valor de cada um:</Label>
                <div className="space-y-3">
                  {editPartners.map((partner) => {
                  const sel = partnerSelections[editMes]?.[partner.id];
                  const isSelected = sel?.selected || false;
                  return (
                    <div key={partner.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Checkbox id={`partner-${editMes}-${partner.id}`} checked={isSelected} onCheckedChange={() => togglePartner(editMes, partner.id)} />
                          <Label htmlFor={`partner-${editMes}-${partner.id}`} className="text-sm cursor-pointer">{partner.name}</Label>
                        </div>
                        {isSelected &&
                      <div className="pl-6">
                            <Input type="number" step="0.01" placeholder="Valor do sócio" className="h-8 text-sm" value={sel?.valor || ""} onChange={(e) => setPartnerValor(editMes, partner.id, e.target.value)} />
                          </div>
                      }
                      </div>);

                })}
                </div>
                <div className="pt-2 border-t text-sm">
                  <span className="text-muted-foreground">Total do mês: </span>
                  <span className="font-semibold">{formatCurrency(getMonthTotal(partnerSelections, editMes))}</span>
                </div>
              </> :

            <div className="space-y-2">
                <Label>Valor do mês</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={partnerSelections[editMes]?.__no_partner__?.valor || ""}
              onChange={(e) => setPartnerSelections((prev) => ({ ...prev, [editMes]: { __no_partner__: { selected: true, valor: e.target.value } } }))} />
              </div>
            }
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveLucros} disabled={savingLucros}>{savingLucros ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation AlertDialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeConfirmedAction}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fiscal Quarterly Confirmation */}
      <AlertDialog open={confirmFiscalOpen} onOpenChange={setConfirmFiscalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmFiscalType === "advance" ? "Enviar Fiscal (Trimestre)" : "Reverter Fiscal (Trimestre)"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmFiscalType === "advance" ?
              `Deseja marcar todos os 3 meses de ${confirmFiscalEntry?.clients?.trade_name || confirmFiscalEntry?.clients?.legal_name} como enviados ao Fiscal?` :
              `Deseja reverter o envio fiscal de todos os 3 meses de ${confirmFiscalEntry?.clients?.trade_name || confirmFiscalEntry?.clients?.legal_name} para "Aguardando Fiscal"?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeFiscalConfirmed}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {entries.length === 0 ?
      <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          Nenhuma entrada para {TRIMESTRE_LABELS[parseInt(filterTrimestre)]} de {filterAno}. Clique em "Nova Entrada" para começar.
        </div> :

      <div className="space-y-4">
          {entries.map((entry) => {
          const meses = TRIMESTRE_MESES[entry.trimestre];
          const total = (entry.lucro_mes1 || 0) + (entry.lucro_mes2 || 0) + (entry.lucro_mes3 || 0);
          const entryLogs = logsByEntry[entry.id] || [];

          return (
            <div key={entry.id} className="rounded-lg border bg-card p-4 space-y-3">
                {/* Company header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{entry.clients?.trade_name || entry.clients?.legal_name || "—"}</h3>
                    <span className="text-sm text-muted-foreground font-medium">Total: {formatCurrency(total)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {entry.created_by && <span>Criado por: <span className="font-medium text-foreground">{getProfileName(entry.created_by)}</span></span>}
                  </div>
                </div>

                {/* Month cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[1, 2, 3].map((mesNum) => {
                  const mesStatus = getMesStatus(entry, mesNum);
                  const statusCfg = STATUS_CONFIG[mesStatus];
                  const lucro = getMesLucro(entry, mesNum);
                  const mesPartnerProfits = entryPartnerProfits.filter((pp) => pp.reinf_entry_id === entry.id && pp.mes === mesNum);
                  const contabilUser = getMesContabilUser(entry, mesNum);
                  const dpUser = getMesDpUser(entry, mesNum);
                  const fiscalUser = getMesFiscalUser(entry, mesNum);

                  return (
                    <Card key={mesNum} className="border flex flex-col h-full">
                        <CardHeader className="p-3 pb-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm">{meses[mesNum - 1]}</span>
                            <Badge variant="outline" className={`text-xs ${statusCfg?.color}`}>
                              {statusCfg?.label ?? mesStatus}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 space-y-2 flex flex-col flex-grow">
                          {/* Lucro value */}
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold">{formatCurrency(lucro || 0)}</span>
                            {mesStatus === "pendente_contabil" && canFillProfits &&
                          <Button variant="ghost" size="icon" className="h-7 w-7" title={`Editar ${meses[mesNum - 1]}`} onClick={() => openEditDialog(entry, mesNum)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                          }
                          </div>

                          {/* Partner breakdown */}
                          {mesPartnerProfits.length > 0 &&
                        <div className="space-y-0.5 pl-2 border-l-2 border-muted">
                              {mesPartnerProfits.map((pp) => {
                            const partnerName = allPartners.find((p) => p.id === pp.partner_id)?.name || "?";
                            return (
                              <div key={pp.id} className="text-xs text-muted-foreground">
                                    {partnerName}: <span className="font-medium text-foreground">{formatCurrency(pp.valor)}</span>
                                  </div>);

                          })}
                            </div>
                        }

                          {/* Responsible users */}
                          <div className="space-y-0.5 text-xs text-muted-foreground">
                            {contabilUser && <div>Contábil: <span className="font-medium text-foreground">{getProfileName(contabilUser)}</span></div>}
                            {dpUser && <div>DP: <span className="font-medium text-foreground">{getProfileName(dpUser)}</span></div>}
                            {fiscalUser && <div>Fiscal: <span className="font-medium text-foreground">{getProfileName(fiscalUser)}</span></div>}
                          </div>

                          {/* Action buttons — pushed to bottom (no fiscal here, it's quarterly) */}
                          <div className="flex flex-wrap gap-1 pt-2 mt-auto border-t">
                            {mesStatus === "pendente_contabil" && canFillProfits &&
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => requestConfirmation(entry, mesNum, "advance")} disabled={!lucro}>
                                <Send className="h-3 w-3 mr-1" /> Enviar p/ DP
                              </Button>
                          }
                            {mesStatus === "contabil_ok" && canDP &&
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => requestConfirmation(entry, mesNum, "advance")}>
                                <Check className="h-3 w-3 mr-1" /> Aprovar
                              </Button>
                          }
                            {mesStatus === "dp_aprovado" &&
                          <span className="text-[10px] text-muted-foreground italic">Aguardando fechamento fiscal do trimestre</span>
                          }
                            {mesStatus === "enviado" &&
                          <span className="text-[10px] text-status-done font-medium">✓ Enviado</span>
                          }
                            {isAdmin && STATUS_CONFIG[mesStatus]?.prevAction && mesStatus !== "enviado" &&
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => requestConfirmation(entry, mesNum, "revert")}>
                                <Undo2 className="h-3 w-3 mr-1" /> Reverter
                              </Button>
                          }
                          </div>
                        </CardContent>
                      </Card>);

                })}
                </div>

                {/* Quarterly Fiscal action */}
                {allMonthsDpAprovado(entry) && canFiscal &&
              <div className="flex items-center gap-2 p-3 rounded-md border border-status-progress/30 bg-status-progress/5">
                    <Send className="h-4 w-4 text-status-progress" />
                    <span className="text-sm font-medium flex-1">Todos os meses aprovados pelo DP. Pronto para envio fiscal.</span>
                    <Button size="sm" onClick={() => requestFiscalConfirmation(entry, "advance")}>
                      <Send className="h-3.5 w-3.5 mr-1" /> Enviar Fiscal (Trimestre)
                    </Button>
                  </div>
              }
                {allMonthsEnviado(entry) &&
              <div className="flex items-center gap-2 p-3 rounded-md border border-status-done/30 bg-status-done/5">
                    <Check className="h-4 w-4 text-status-done" />
                    <span className="text-sm font-medium text-status-done flex-1">EFD enviada pelo Fiscal ✓</span>
                    {isAdmin &&
                <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => requestFiscalConfirmation(entry, "revert")}>
                        <Undo2 className="h-3.5 w-3.5 mr-1" /> Reverter Fiscal
                      </Button>
                }
                  </div>
              }

                {entryLogs.length > 0 &&
              <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground p-0 h-auto hover:bg-transparent">
                        <History className="h-3.5 w-3.5 mr-1" /> Histórico ({entryLogs.length}) <ChevronDown className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 border-t pt-2 space-y-1.5">
                        {entryLogs.map((log) =>
                    <div key={log.id} className="text-xs flex gap-2">
                            <span className="text-muted-foreground whitespace-nowrap">{formatDate(log.created_at)}</span>
                            <span className="font-medium">{getProfileName(log.user_id)}</span>
                            <span className="text-muted-foreground">—</span>
                            <span>{log.action}{log.details ? `: ${log.details}` : ""}</span>
                          </div>
                    )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
              }
              </div>);

        })}
        </div>
      }
    </div>);

}




