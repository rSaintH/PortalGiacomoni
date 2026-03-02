import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useSectors, useSections, useClients, useTags } from "@/hooks/useSupabaseQuery";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import EditorRolesSelector from "@/components/EditorRolesSelector";
import { upsertPop } from "@/services/pops.service";

interface Props {
  open: boolean;
  onClose: () => void;
  pop?: any;
}

export default function PopFormDialog({ open, onClose, pop }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sectors } = useSectors();
  const { data: clients } = useClients();
  const { data: allTags } = useTags();
  const [sectorId, setSectorId] = useState(pop?.sector_id || "");
  const { data: sections } = useSections(sectorId || undefined);
  const [saving, setSaving] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(pop?.tag_ids || []);
  const [editorRoles, setEditorRoles] = useState<string[]>(pop?.editor_roles || ["admin", "colaborador"]);

  const [form, setForm] = useState({
    title: pop?.title || "",
    objective: pop?.objective || "",
    steps: pop?.steps || "",
    scope: pop?.scope || "Geral",
    status: pop?.status || "Rascunho",
    client_id: pop?.client_id || "",
    section_id: pop?.section_id || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await upsertPop({
        popId: pop?.id,
        version: pop?.version,
        title: form.title,
        objective: form.objective,
        steps: form.steps,
        scope: form.scope,
        status: form.status,
        clientId: form.client_id,
        sectorId,
        sectionId: form.section_id,
        selectedTagIds: selectedTags,
        editorRoles,
        userId: user?.id,
      });
      queryClient.invalidateQueries({ queryKey: ["pops"] });
      queryClient.invalidateQueries({ queryKey: ["pops", "client"] });
      toast({ title: pop ? "POP atualizado!" : "POP criado!" });
      onClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pop ? "Editar POP" : "Novo POP"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Escopo</Label>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Geral">Geral</SelectItem>
                  <SelectItem value="Cliente">Cliente</SelectItem>
                  <SelectItem value="Tag">Por Tag</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.scope === "Cliente" && (
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.trade_name || c.legal_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.scope !== "Cliente" && <div />}
            <div className="space-y-2">
              <Label>Setor *</Label>
              <Select value={sectorId} onValueChange={setSectorId} required>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {sectors?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Seção</Label>
              <Select value={form.section_id} onValueChange={(v) => setForm({ ...form, section_id: v })}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {sections?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Rascunho", "Em revisão", "Publicado", "Arquivado"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.scope === "Tag" && (
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-medium">Tags aplicáveis</Label>
              <div className="flex flex-wrap gap-2">
                {allTags?.map((tag: any) => (
                  <div
                    key={tag.id}
                    onClick={() => {
                      setSelectedTags(
                        selectedTags.includes(tag.id)
                          ? selectedTags.filter((t) => t !== tag.id)
                          : [...selectedTags, tag.id]
                      );
                    }}
                    className={`px-3 py-1 rounded-full cursor-pointer text-xs font-medium transition-all ${
                      selectedTags.includes(tag.id)
                        ? "ring-2 ring-offset-1"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    style={{
                      backgroundColor: tag.color || "#3b82f6",
                      color: "white",
                      borderColor: tag.color || "#3b82f6",
                    }}
                  >
                    {tag.name}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Objetivo</Label>
            <Input value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Passos / Procedimento</Label>
            <RichTextEditor
              content={form.steps}
              onChange={(html) => setForm({ ...form, steps: html })}
              placeholder="Descreva os passos e cole imagens aqui..."
            />
          </div>
          <EditorRolesSelector value={editorRoles} onChange={setEditorRoles} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
