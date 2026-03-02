import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useClients, useDocumentTypes, useDocumentMonthlyStatus, useDocumentReportLogs } from "@/hooks/useSupabaseQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, ChevronRight, FileText, Settings2, Download,
  FileDown, Search, AlertTriangle, CheckCircle2, Loader2
} from "lucide-react";
import DocumentMonthlyChecklist from "@/components/DocumentMonthlyChecklist";
import DocumentTypeManager from "@/components/DocumentTypeManager";
import { insertDocumentReportLogs } from "@/services/documents.service";
import {
  monthNames,
  formatYearMonth,
  sanitizeFilename,
  generatePdfBlob,
  generateMassZip,
  triggerDownload,
} from "@/services/documents.logic";

export default function Documents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: clients, isLoading: loadingClients } = useClients();


  // Month selector
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const yearMonth = formatYearMonth(currentDate);

  // Report logs for current month
  const { data: reportLogs } = useDocumentReportLogs(yearMonth);

  // Selected client
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [showMassGenerate, setShowMassGenerate] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [massGenerating, setMassGenerating] = useState(false);

  // Mass generation selections
  const [massSelected, setMassSelected] = useState<Set<string>>(new Set());

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // Filter clients
  const filteredClients = clients?.filter((c: any) => {
    if (c.status !== "Ativo") return false;
    const term = search.toLowerCase();
    return (
      c.legal_name.toLowerCase().includes(term) ||
      (c.trade_name || "").toLowerCase().includes(term) ||
      (c.cnpj || "").includes(term)
    );
  }) || [];

  const selectedClient = clients?.find((c: any) => c.id === selectedClientId);

  // Get set of client IDs that have logs for current month
  const clientsWithLogs = new Set(reportLogs?.map((l: any) => l.client_id) || []);

  // Eligible clients for mass generation (active, not excluded, not archived)
  const eligibleClients = clients?.filter((c: any) =>
    c.status === "Ativo" && !c.exclude_from_doc_report && !c.is_archived
  ) || [];

  const clientsNotGenerated = eligibleClients.filter((c: any) => !clientsWithLogs.has(c.id));

  // ── PDF Generation ──

  const generatePdfForClient = useCallback(
    (clientId: string, clientName: string) => generatePdfBlob(clientId, clientName, yearMonth, currentDate),
    [yearMonth, currentDate],
  );

  const handleGeneratePdf = async () => {
    if (!selectedClientId || !selectedClient) return;
    setGeneratingPdf(true);
    try {
      const blob = await generatePdfForClient(selectedClientId, selectedClient.legal_name);
      if (!blob) {
        toast({ title: "Nenhum documento pendente para gerar relatório." });
        return;
      }

      triggerDownload(blob, `Documentos_${sanitizeFilename(selectedClient.legal_name)}_${yearMonth}.pdf`);

      // Log
      await insertDocumentReportLogs([{
        client_id: selectedClientId,
        year_month: yearMonth,
        generated_by: user!.id,
      }]);
      queryClient.invalidateQueries({ queryKey: ["document_report_logs", yearMonth] });
      toast({ title: "PDF gerado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao gerar PDF", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  };

  // ── Mass PDF Generation ──

  const handleOpenMassGenerate = () => {
    setMassSelected(new Set(eligibleClients.map((c: any) => c.id)));
    setShowMassGenerate(true);
  };

  const selectNotGenerated = () => {
    setMassSelected(new Set(clientsNotGenerated.map((c: any) => c.id)));
  };

  const selectAll = () => {
    setMassSelected(new Set(eligibleClients.map((c: any) => c.id)));
  };

  const selectNone = () => {
    setMassSelected(new Set());
  };

  const toggleMassClient = (id: string) => {
    setMassSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMassGenerate = async () => {
    if (massSelected.size === 0) return;
    setMassGenerating(true);
    const selectedIds = [...massSelected];
    const blobs: { name: string; blob: Blob; clientId: string }[] = [];

    try {
      for (const clientId of selectedIds) {
        const client = clients?.find((c: any) => c.id === clientId);
        if (!client) continue;
        const blob = await generatePdfForClient(clientId, client.legal_name);
        if (blob) {
          blobs.push({ name: `Documentos_${sanitizeFilename(client.legal_name)}_${yearMonth}.pdf`, blob, clientId });
        }
      }

      if (blobs.length === 0) {
        toast({ title: "Nenhum relatório gerado", description: "Nenhuma empresa possui documentos pendentes." });
        setMassGenerating(false);
        return;
      }

      const { blob: downloadBlob, filename } = await generateMassZip(blobs, yearMonth);
      triggerDownload(downloadBlob, filename);

      // Log all generated reports
      const logEntries = blobs.map((b) => ({
        client_id: b.clientId,
        year_month: yearMonth,
        generated_by: user!.id,
      }));
      await insertDocumentReportLogs(logEntries);
      queryClient.invalidateQueries({ queryKey: ["document_report_logs", yearMonth] });
      toast({ title: `${blobs.length} relatório(s) gerado(s) com sucesso!` });
      setShowMassGenerate(false);
    } catch (err: any) {
      toast({ title: "Erro na geração em massa", description: err.message, variant: "destructive" });
    } finally {
      setMassGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Solicitação de Documentos</h1>
          <p className="text-sm text-muted-foreground">Controle mensal de documentos por empresa</p>
        </div>

        {/* Month selector */}
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
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleOpenMassGenerate}>
          <FileDown className="h-4 w-4 mr-1" /> Gerar PDFs em Massa
        </Button>
        {clientsNotGenerated.length > 0 && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {clientsNotGenerated.length} empresa(s) sem relatório neste mês
          </Badge>
        )}
      </div>

      {/* Main layout */}
      <div className="flex gap-4 h-[calc(100vh-230px)]">
        {/* Company list */}
        <div className="w-80 shrink-0 border rounded-lg flex flex-col">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingClients && (
              <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
            )}
            {filteredClients.map((client: any) => {
              const hasLog = clientsWithLogs.has(client.id);
              const isExcluded = client.exclude_from_doc_report;
              return (
                <button
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={`w-full text-left px-3 py-2.5 border-b transition-colors hover:bg-accent/50 ${
                    selectedClientId === client.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate flex-1">{client.legal_name}</span>
                    {hasLog && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                    {!hasLog && !isExcluded && (
                      <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" title="Relatório não gerado" />
                    )}
                    {isExcluded && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">Excluída</Badge>
                    )}
                  </div>
                  {client.trade_name && (
                    <span className="text-xs text-muted-foreground">{client.trade_name}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 border rounded-lg overflow-y-auto">
          {!selectedClientId ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Selecione uma empresa para visualizar os documentos</p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Client header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{selectedClient?.legal_name}</h2>
                  {selectedClient?.trade_name && (
                    <p className="text-sm text-muted-foreground">{selectedClient.trade_name}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowTypeManager(true)}>
                    <Settings2 className="h-4 w-4 mr-1" /> Gerenciar Documentos
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleGeneratePdf}
                    disabled={generatingPdf}
                  >
                    {generatingPdf ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    Gerar PDF
                  </Button>
                </div>
              </div>

              {/* Monthly checklist */}
              <DocumentMonthlyChecklist clientId={selectedClientId} yearMonth={yearMonth} />
            </div>
          )}
        </div>
      </div>

      {/* Document type manager dialog */}
      {showTypeManager && selectedClientId && selectedClient && (
        <DocumentTypeManager
          open={showTypeManager}
          onClose={() => setShowTypeManager(false)}
          clientId={selectedClientId}
          clientName={selectedClient.legal_name}
        />
      )}

      {/* Mass generate dialog */}
      <Dialog open={showMassGenerate} onOpenChange={setShowMassGenerate}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar PDFs em Massa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Selecione as empresas para gerar relatórios de documentos pendentes para{" "}
            <strong>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</strong>.
          </p>

          <div className="flex flex-wrap gap-2 my-2">
            <Button variant="outline" size="sm" onClick={selectAll}>Selecionar Todas</Button>
            <Button variant="outline" size="sm" onClick={selectNone}>Desmarcar Todas</Button>
            {clientsNotGenerated.length > 0 && (
              <Button variant="outline" size="sm" onClick={selectNotGenerated}>
                <AlertTriangle className="h-3.5 w-3.5 mr-1 text-amber-500" />
                Sem relatório ({clientsNotGenerated.length})
              </Button>
            )}
          </div>

          <div className="space-y-1 max-h-[50vh] overflow-y-auto border rounded-md p-2">
            {eligibleClients.map((client: any) => {
              const hasLog = clientsWithLogs.has(client.id);
              return (
                <label
                  key={client.id}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/50 cursor-pointer"
                >
                  <Checkbox
                    checked={massSelected.has(client.id)}
                    onCheckedChange={() => toggleMassClient(client.id)}
                  />
                  <span className="text-sm flex-1">{client.legal_name}</span>
                  {hasLog && (
                    <Badge variant="outline" className="text-[10px] text-green-600 bg-green-50 dark:bg-green-900/30">
                      Gerado
                    </Badge>
                  )}
                  {!hasLog && (
                    <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/30">
                      Pendente
                    </Badge>
                  )}
                </label>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-muted-foreground">{massSelected.size} empresa(s) selecionada(s)</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowMassGenerate(false)}>Cancelar</Button>
              <Button onClick={handleMassGenerate} disabled={massGenerating || massSelected.size === 0}>
                {massGenerating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-1" />
                )}
                Gerar {massSelected.size > 1 ? `${massSelected.size} PDFs` : "PDF"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

