import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSectors, useSections, useClients } from "@/hooks/useSupabaseQuery";
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

interface Props {
  open: boolean;
  onClose: () => void;
  clientId?: string;
  sectorId?: string;
}

export default function ParticularityFormDialog({ open, onClose, clientId, sectorId: initialSectorId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sectors } = useSectors();
  const { data: clients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState(clientId || "");
  const [sectorId, setSectorId] = useState(initialSectorId || "");
  const { data: sections } = useSections(sectorId || undefined);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    details: "",
    priority: "Média",
    section_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("client_particularities").insert({
        client_id: selectedClientId || null,
        sector_id: sectorId,
        section_id: form.section_id || null,
        title: form.title,
        details: form.details || null,
        priority: form.priority,
        created_by: user?.id,
        updated_by: user?.id,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["particularities"] });
      queryClient.invalidateQueries({ queryKey: ["all_particularities"] });
      toast({ title: "Particularidade criada!" });
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
          <DialogTitle>Nova particularidade</DialogTitle>
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
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Alta", "Média", "Baixa"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Detalhes</Label>
            <Textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
