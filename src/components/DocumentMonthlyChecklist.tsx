import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useDocumentTypes, useDocumentMonthlyStatus, useDocumentTypeDocTags } from "@/hooks/useSupabaseQuery";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Eye, EyeOff, FileText } from "lucide-react";
import {
  setDocumentMonthlyHasDocument,
  setDocumentMonthlyObservation,
  updateDocumentType,
} from "@/services/documents.service";

interface Props {
  clientId: string;
  yearMonth: string;
}

const classificationColors: Record<string, string> = {
  essencial: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  necessario: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  irrelevante: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const classificationLabels: Record<string, string> = {
  essencial: "Essencial",
  necessario: "Necessario",
  irrelevante: "Irrelevante",
};

export default function DocumentMonthlyChecklist({ clientId, yearMonth }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: docTypes, isLoading: loadingTypes } = useDocumentTypes(clientId);
  const { data: monthlyStatus, isLoading: loadingStatus } = useDocumentMonthlyStatus(clientId, yearMonth);
  const docTypeIds = docTypes?.map((d: any) => d.id) || [];
  const { data: docTypeTagAssignments } = useDocumentTypeDocTags(docTypeIds);
  const [showInactive, setShowInactive] = useState(false);
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [internalObs, setInternalObs] = useState<Record<string, string>>({});
  const [savingObs, setSavingObs] = useState<Record<string, boolean>>({});
  const [savingInternal, setSavingInternal] = useState<Record<string, boolean>>({});

  const statusMap: Record<string, any> = {};
  monthlyStatus?.forEach((status: any) => {
    statusMap[status.document_type_id] = status;
  });

  useEffect(() => {
    if (monthlyStatus) {
      const nextObservations: Record<string, string> = {};
      monthlyStatus.forEach((status: any) => {
        if (status.observation) nextObservations[status.document_type_id] = status.observation;
      });
      setObservations(nextObservations);
    }
  }, [monthlyStatus]);

  useEffect(() => {
    if (docTypes) {
      const nextInternalObs: Record<string, string> = {};
      docTypes.forEach((documentType: any) => {
        if (documentType.internal_observation) nextInternalObs[documentType.id] = documentType.internal_observation;
      });
      setInternalObs(nextInternalObs);
    }
  }, [docTypes]);

  const activeDocTypes = docTypes?.filter((documentType: any) => showInactive || documentType.is_active) || [];

  const toggleDocument = useCallback(
    async (docTypeId: string, currentHas: boolean) => {
      try {
        const existing = statusMap[docTypeId];
        await setDocumentMonthlyHasDocument({
          statusId: existing?.id,
          documentTypeId: docTypeId,
          clientId,
          yearMonth,
          hasDocument: !currentHas,
          userId: user?.id,
        });
        queryClient.invalidateQueries({ queryKey: ["document_monthly_status", clientId, yearMonth] });
      } catch (error: any) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      }
    },
    [statusMap, clientId, yearMonth, user?.id, queryClient, toast]
  );

  const toggleIncludeInReport = useCallback(
    async (doc: any) => {
      try {
        await updateDocumentType({
          documentTypeId: doc.id,
          fields: { include_in_report: !doc.include_in_report, updated_by: user?.id },
        });
        queryClient.invalidateQueries({ queryKey: ["document_types", clientId] });
      } catch (error: any) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      }
    },
    [clientId, user?.id, queryClient, toast]
  );

  const saveClientObservation = useCallback(
    async (docTypeId: string) => {
      setSavingObs((prev) => ({ ...prev, [docTypeId]: true }));
      try {
        const existing = statusMap[docTypeId];
        const observation = observations[docTypeId] || "";
        await setDocumentMonthlyObservation({
          statusId: existing?.id,
          documentTypeId: docTypeId,
          clientId,
          yearMonth,
          observation,
          userId: user?.id,
        });
        queryClient.invalidateQueries({ queryKey: ["document_monthly_status", clientId, yearMonth] });
        toast({ title: "Observacao do cliente salva!" });
      } catch (error: any) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } finally {
        setSavingObs((prev) => ({ ...prev, [docTypeId]: false }));
      }
    },
    [statusMap, observations, clientId, yearMonth, user?.id, queryClient, toast]
  );

  const saveInternalObservation = useCallback(
    async (docTypeId: string) => {
      setSavingInternal((prev) => ({ ...prev, [docTypeId]: true }));
      try {
        const observation = internalObs[docTypeId] || "";
        await updateDocumentType({
          documentTypeId: docTypeId,
          fields: { internal_observation: observation || null, updated_by: user?.id },
        });
        queryClient.invalidateQueries({ queryKey: ["document_types", clientId] });
        toast({ title: "Observacao interna salva!" });
      } catch (error: any) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } finally {
        setSavingInternal((prev) => ({ ...prev, [docTypeId]: false }));
      }
    },
    [internalObs, clientId, user?.id, queryClient, toast]
  );

  if (loadingTypes || loadingStatus) {
    return <div className="text-sm text-muted-foreground py-4">Carregando documentos...</div>;
  }

  if (!docTypes || docTypes.length === 0) {
    return <div className="text-sm text-muted-foreground py-4">Nenhum documento cadastrado para esta empresa.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {activeDocTypes.filter((doc: any) => statusMap[doc.id]?.has_document).length}/
          {activeDocTypes.filter((doc: any) => doc.is_active).length} documentos recebidos
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
          {showInactive ? "Ocultar inativos" : "Mostrar inativos"}
        </Button>
      </div>

      <div className="space-y-1">
        {activeDocTypes.map((doc: any) => {
          const status = statusMap[doc.id];
          const hasDoc = status?.has_document ?? false;
          const isMissing = !hasDoc;
          const obsValue = observations[doc.id] ?? "";
          const intObsValue = internalObs[doc.id] ?? "";

          return (
            <div key={doc.id} className={`rounded-md border ${!doc.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-3 p-2.5">
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id={`doc-received-${doc.id}`}
                    checked={hasDoc}
                    onCheckedChange={() => toggleDocument(doc.id, hasDoc)}
                    disabled={!doc.is_active}
                  />
                  <Label
                    htmlFor={`doc-received-${doc.id}`}
                    className={`text-[10px] cursor-pointer select-none ${hasDoc ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
                  >
                    {hasDoc ? "Recebido" : "Pendente"}
                  </Label>
                </div>

                <div className={`flex-1 flex items-center gap-1.5 ${hasDoc ? "text-muted-foreground" : ""}`}>
                  <span className={`text-sm ${hasDoc ? "line-through" : "font-medium"}`}>{doc.name}</span>
                  {docTypeTagAssignments
                    ?.filter((assignment: any) => assignment.document_type_id === doc.id)
                    .map((assignment: any) => (
                      <span
                        key={assignment.id}
                        className="px-1.5 py-0 rounded-full text-[9px] font-medium shrink-0"
                        style={{
                          backgroundColor: assignment.doc_tags?.color || "#3b82f6",
                          color: assignment.doc_tags?.text_color || "#ffffff",
                        }}
                      >
                        {assignment.doc_tags?.name}
                      </span>
                    ))}
                </div>

                <Badge variant="outline" className={`text-[10px] ${classificationColors[doc.classification]}`}>
                  {classificationLabels[doc.classification]}
                </Badge>

                <div className="flex items-center gap-1.5" title="Incluir este documento no relatorio PDF">
                  <Checkbox
                    id={`doc-report-${doc.id}`}
                    checked={doc.include_in_report}
                    onCheckedChange={() => toggleIncludeInReport(doc)}
                  />
                  <Label
                    htmlFor={`doc-report-${doc.id}`}
                    className="text-[10px] text-muted-foreground cursor-pointer select-none whitespace-nowrap"
                  >
                    <FileText className="h-3 w-3 inline mr-0.5" />
                    Relatorio
                  </Label>
                </div>

                {!doc.is_active && (
                  <Badge variant="outline" className="text-[10px]">
                    Inativo
                  </Badge>
                )}
              </div>

              {isMissing && doc.is_active && (
                <div className="px-2.5 pb-2 pt-0">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Observacao para o cliente (vai no PDF)"
                      value={obsValue}
                      onChange={(event) => setObservations({ ...observations, [doc.id]: event.target.value })}
                      rows={1}
                      className="text-xs min-h-[32px] resize-none"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0"
                      onClick={() => saveClientObservation(doc.id)}
                      disabled={savingObs[doc.id]}
                      title="Salvar observacao do cliente"
                    >
                      <Save className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">Salvar</span>
                    </Button>
                  </div>
                </div>
              )}

              {doc.is_active && (
                <div className="px-2.5 pb-2.5 pt-0">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Observacao interna (nao aparece no PDF - igual para todos os meses)"
                      value={intObsValue}
                      onChange={(event) => setInternalObs({ ...internalObs, [doc.id]: event.target.value })}
                      rows={1}
                      className="text-xs min-h-[32px] resize-none border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 border-dashed border-amber-300"
                      onClick={() => saveInternalObservation(doc.id)}
                      disabled={savingInternal[doc.id]}
                      title="Salvar observacao interna"
                    >
                      <Save className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">Salvar</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
