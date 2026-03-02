import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useDocumentTypes, useDocTags, useDocumentTypeDocTags } from "@/hooks/useSupabaseQuery";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Pencil, Tag } from "lucide-react";
import {
  createDocumentType,
  deleteDocumentType,
  replaceDocumentTypeTagAssignments,
  updateDocumentType,
} from "@/services/documents.service";

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

const classificationColors: Record<string, string> = {
  essencial: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  necessario: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  irrelevante: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const classificationLabels: Record<string, string> = {
  essencial: "Essencial",
  necessario: "Necessário",
  irrelevante: "Irrelevante",
};

export default function DocumentTypeManager({ open, onClose, clientId, clientName }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: docTypes, isLoading } = useDocumentTypes(clientId);
  const { data: allDocTags } = useDocTags();
  const docTypeIds = docTypes?.map((d: any) => d.id) || [];
  const { data: docTypeTagAssignments } = useDocumentTypeDocTags(docTypeIds);

  const [newName, setNewName] = useState("");
  const [newClassification, setNewClassification] = useState("necessario");
  const [newSelectedTags, setNewSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editClassification, setEditClassification] = useState("");
  const [editSelectedTags, setEditSelectedTags] = useState<string[]>([]);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);

  const saveTagAssignments = async (docTypeId: string, tagIds: string[]) => {
    await replaceDocumentTypeTagAssignments(docTypeId, tagIds);
    queryClient.invalidateQueries({ queryKey: ["document_type_doc_tags"] });
  };

  const getTagsForDoc = (docId: string) => {
    return docTypeTagAssignments?.filter((a: any) => a.document_type_id === docId) || [];
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const maxOrder = docTypes?.length ? Math.max(...docTypes.map((d: any) => d.order_index)) + 1 : 0;
      const docTypeId = await createDocumentType({
        clientId,
        name: newName.trim(),
        classification: newClassification,
        orderIndex: maxOrder,
        userId: user?.id,
      });
      if (docTypeId && newSelectedTags.length > 0) {
        await saveTagAssignments(docTypeId, newSelectedTags);
      }
      setNewName("");
      setNewClassification("necessario");
      setNewSelectedTags([]);
      queryClient.invalidateQueries({ queryKey: ["document_types", clientId] });
      toast({ title: "Documento adicionado!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (doc: any) => {
    try {
      await updateDocumentType({
        documentTypeId: doc.id,
        fields: { is_active: !doc.is_active, updated_by: user?.id },
      });
      queryClient.invalidateQueries({ queryKey: ["document_types", clientId] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleReport = async (doc: any) => {
    try {
      await updateDocumentType({
        documentTypeId: doc.id,
        fields: { include_in_report: !doc.include_in_report, updated_by: user?.id },
      });
      queryClient.invalidateQueries({ queryKey: ["document_types", clientId] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocumentType(id);
      queryClient.invalidateQueries({ queryKey: ["document_types", clientId] });
      toast({ title: "Documento removido!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateDocumentType({
        documentTypeId: editingId,
        fields: { name: editName.trim(), classification: editClassification, updated_by: user?.id },
      });
      await saveTagAssignments(editingId, editSelectedTags);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["document_types", clientId] });
      toast({ title: "Documento atualizado!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const startEdit = (doc: any) => {
    setEditingId(doc.id);
    setEditName(doc.name);
    setEditClassification(doc.classification);
    setEditSelectedTags(getTagsForDoc(doc.id).map((a: any) => a.doc_tag_id));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Documentos - {clientName}</DialogTitle>
        </DialogHeader>

        {/* Add new document */}
        <div className="space-y-2">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Nome do documento</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Balancete mensal"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div className="w-40 space-y-1">
              <Label className="text-xs">Classificação</Label>
              <Select value={newClassification} onValueChange={setNewClassification}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="essencial">Essencial</SelectItem>
                  <SelectItem value="necessario">Necessário</SelectItem>
                  <SelectItem value="irrelevante">Irrelevante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={saving || !newName.trim()} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
          {allDocTags && allDocTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {allDocTags.map((tag: any) => {
                const isSelected = newSelectedTags.includes(tag.id);
                return (
                  <span
                    key={tag.id}
                    onClick={() => {
                      setNewSelectedTags(isSelected
                        ? newSelectedTags.filter((id) => id !== tag.id)
                        : [...newSelectedTags, tag.id]);
                    }}
                    className={`px-2 py-0.5 rounded-full cursor-pointer text-[10px] font-medium transition-all ${
                      isSelected ? "ring-2 ring-offset-1" : "opacity-50 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: tag.color || "#3b82f6", color: tag.text_color || "#ffffff" }}
                  >
                    {tag.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Document list */}
        <div className="space-y-1 mt-4">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {docTypes?.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground">Nenhum documento cadastrado.</p>
          )}
          {docTypes?.map((doc: any) => (
            <div
              key={doc.id}
              className={`flex items-center gap-2 p-2 rounded-md border ${!doc.is_active ? "opacity-50" : ""}`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

              {editingId === doc.id ? (
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 h-8"
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                    />
                    <Select value={editClassification} onValueChange={setEditClassification}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="essencial">Essencial</SelectItem>
                        <SelectItem value="necessario">Necessário</SelectItem>
                        <SelectItem value="irrelevante">Irrelevante</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-8" onClick={handleSaveEdit}>Salvar</Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingId(null)}>Cancelar</Button>
                  </div>
                  {allDocTags && allDocTags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pl-1">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      {allDocTags.map((tag: any) => {
                        const isSelected = editSelectedTags.includes(tag.id);
                        return (
                          <span
                            key={tag.id}
                            onClick={() => {
                              setEditSelectedTags(isSelected
                                ? editSelectedTags.filter((id) => id !== tag.id)
                                : [...editSelectedTags, tag.id]);
                            }}
                            className={`px-2 py-0.5 rounded-full cursor-pointer text-[10px] font-medium transition-all ${
                              isSelected ? "ring-2 ring-offset-1" : "opacity-50 hover:opacity-100"
                            }`}
                            style={{ backgroundColor: tag.color || "#3b82f6", color: tag.text_color || "#ffffff" }}
                          >
                            {tag.name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex-1 flex items-center gap-1.5">
                    <span className="text-sm font-medium">{doc.name}</span>
                    {getTagsForDoc(doc.id).map((a: any) => (
                      <span
                        key={a.id}
                        className="px-1.5 py-0 rounded-full text-[9px] font-medium"
                        style={{ backgroundColor: a.doc_tags?.color || "#3b82f6", color: a.doc_tags?.text_color || "#ffffff" }}
                      >
                        {a.doc_tags?.name}
                      </span>
                    ))}
                  </div>
                  <Badge variant="outline" className={classificationColors[doc.classification]}>
                    {classificationLabels[doc.classification]}
                  </Badge>
                  <div className="flex items-center gap-1" title="Incluir no relatório">
                    <Label className="text-[10px] text-muted-foreground">Relatório</Label>
                    <Switch
                      checked={doc.include_in_report}
                      onCheckedChange={() => handleToggleReport(doc)}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center gap-1" title={doc.is_active ? "Ativo" : "Inativo"}>
                    <Label className="text-[10px] text-muted-foreground">Ativo</Label>
                    <Switch
                      checked={doc.is_active}
                      onCheckedChange={() => handleToggleActive(doc)}
                      className="scale-75"
                    />
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(doc)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
