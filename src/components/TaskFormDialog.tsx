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
  task?: any;
}

export default function TaskFormDialog({ open, onClose, clientId, sectorId: initialSectorId, task }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sectors } = useSectors();
  const { data: clients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState(clientId || task?.client_id || "");
  const [sectorId, setSectorId] = useState(task?.sector_id || initialSectorId || "");
  const { data: sections } = useSections(sectorId || undefined);
  const { data: taskStatuses } = useParameterOptions("task_status");
  const { data: taskTypes } = useParameterOptions("task_type");
  const { data: taskPriorities } = useParameterOptions("task_priority");
  const [saving, setSaving] = useState(false);

  const [editorRoles, setEditorRoles] = useState<string[]>(task?.editor_roles || ["admin", "colaborador"]);

  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    type: task?.type || "Pendência",
    priority: task?.priority || "Média",
    status: task?.status || "Aberta",
    due_date: task?.due_date || "",
    section_id: task?.section_id || "",
    monetary_value: task?.monetary_value || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        client_id: selectedClientId || null,
        sector_id: sectorId,
        section_id: form.section_id || null,
        due_date: form.due_date || null,
        monetary_value: form.monetary_value ? parseFloat(form.monetary_value) : null,
        editor_roles: editorRoles,
        updated_by: user?.id,
      };
      if (task) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", task.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert({
          ...payload,
          created_by: user?.id,
        });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks_with_comments"] });
      queryClient.invalidateQueries({ queryKey: ["task_stats"] });
      toast({ title: task ? "Pendência atualizada!" : "Pendência criada!" });
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
          <DialogTitle>{task ? "Editar pendência" : "Nova pendência"}</DialogTitle>
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
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(taskTypes || []).map((t: any) => (
                    <SelectItem key={t.id} value={t.value}>{t.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(taskPriorities || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.value}>{p.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(taskStatuses || []).map((s: any) => (
                    <SelectItem key={s.id} value={s.value}>{s.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
               <Label>Data</Label>
               <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
             </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} required />
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
