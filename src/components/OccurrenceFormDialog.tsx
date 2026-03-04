import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSectors, useSections, useParameterOptions, useClients } from "@/hooks/useSupabaseQuery";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import EditorRolesSelector from "@/components/EditorRolesSelector";

interface Props {
  open: boolean;
  onClose: () => void;
  clientId?: string;
  sectorId?: string;
}

export default function OccurrenceFormDialog({ open, onClose, clientId, sectorId: initialSectorId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sectors } = useSectors();
  const { data: clients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState(clientId || "");
  const [sectorId, setSectorId] = useState(initialSectorId || "");
  const { data: sections } = useSections(sectorId || undefined);
  const { data: occCategories } = useParameterOptions("occurrence_category");
  const [saving, setSaving] = useState(false);

  const [editorRoles, setEditorRoles] = useState<string[]>(["admin", "colaborador"]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Informativa",
    section_id: "",
    occurred_at: "",
    monetary_value: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("occurrences").insert({
        client_id: selectedClientId || null,
        sector_id: sectorId,
        section_id: form.section_id || null,
        title: form.title,
        description: form.description || null,
        category: form.category,
        occurred_at: form.occurred_at || new Date().toISOString(),
        monetary_value: form.monetary_value ? parseFloat(form.monetary_value) : null,
        editor_roles: editorRoles,
        created_by: user?.id,
      } as any);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["occurrences_with_comments"] });
      toast({ title: "Ocorrência registrada!" });
      onClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova ocorrência</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          {!clientId && (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger><SelectValue placeholder="Opcional — sem vínculo a cliente" /></SelectTrigger>
                <SelectContent>
                  {clients?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.trade_name || c.legal_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
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
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(occCategories || []).map((c: any) => (
                    <SelectItem key={c.id} value={c.value}>{c.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da ocorrência</Label>
              <Input type="datetime-local" value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Valor monetário (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.monetary_value}
                onChange={(e) => setForm({ ...form, monetary_value: e.target.value })}
              />
            </div>
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
