import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useSectors, useSectorStyles, useClientSectorStyles, useTags, useClientTags } from "@/hooks/useSupabaseQuery";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { fetchClientPartners, saveClientWithRelations } from "@/services/clients.service";

interface Props {
  open: boolean;
  onClose: () => void;
  client?: any;
}

export default function ClientFormDialog({ open, onClose, client }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sectors } = useSectors();
  const { data: allStyles } = useSectorStyles();
  const { data: clientStyles } = useClientSectorStyles(client?.id || "");
  const { data: allTags } = useTags();
  const { data: clientTags } = useClientTags(client?.id || "");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    legal_name: client?.legal_name || "",
    trade_name: client?.trade_name || "",
    cnpj: client?.cnpj || "",
    status: client?.status || "Ativo",
    group_name: client?.group_name || "",
    notes_quick: client?.notes_quick || "",
    exclude_from_doc_report: client?.exclude_from_doc_report || false,
  });

  const [styleSelections, setStyleSelections] = useState<Record<string, string>>({});
  const [selectedTags, setSelectedTags] = useState<{ tagId: string; sectorId: string | null }[]>([]);

  // Partners (sócios)
  const [hasPartners, setHasPartners] = useState(false);
  const [partners, setPartners] = useState<{ id?: string; name: string }[]>([]);

  useEffect(() => {
    if (clientStyles) {
      const map: Record<string, string> = {};
      clientStyles.forEach((cs: any) => { map[cs.sector_id] = cs.style_id; });
      setStyleSelections(map);
    }
    if (clientTags) {
      setSelectedTags(clientTags.map((ct: any) => ({ tagId: ct.tag_id, sectorId: ct.sector_id || null })));
    }
  }, [clientStyles, clientTags]);

  // Fetch existing partners
  useEffect(() => {
    let isMounted = true;

    const loadPartners = async () => {
      if (!client?.id) {
        if (isMounted) {
          setHasPartners(false);
          setPartners([]);
        }
        return;
      }

      const data = await fetchClientPartners(client.id);
      if (!isMounted) return;

      if (data.length > 0) {
        setHasPartners(true);
        setPartners(data.map((partner: any) => ({ id: partner.id, name: partner.name })));
      } else {
        setHasPartners(false);
        setPartners([]);
      }
    };

    loadPartners();
    return () => {
      isMounted = false;
    };
  }, [client?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const savedClientId = await saveClientWithRelations({
        clientId: client?.id,
        form,
        userId: user?.id,
        styleSelections,
        existingClientStyles: clientStyles || [],
        selectedTags,
        existingClientTags: clientTags || [],
        hasPartners,
        partners,
      });

      queryClient.invalidateQueries({ queryKey: ["client_sector_styles", savedClientId] });
      queryClient.invalidateQueries({ queryKey: ["client_tags", savedClientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: client ? "Cliente atualizado!" : "Cliente criado!" });
      onClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sectorsWithStyles = sectors?.filter((s) => {
    return allStyles?.some((st: any) => st.sector_id === s.id);
  }) || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Razão Social *</Label>
              <Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                  <SelectItem value="Prospecção">Prospecção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grupo</Label>
              <Input value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} />
            </div>
          </div>

          {/* Sector styles */}
          {sectorsWithStyles.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-medium">Estilo por Setor</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sectorsWithStyles.map((sector) => {
                  const sectorStyles = allStyles?.filter((st: any) => st.sector_id === sector.id) || [];
                  return (
                    <div key={sector.id} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{sector.name}</Label>
                      <Select
                        value={styleSelections[sector.id] || "none"}
                        onValueChange={(v) => setStyleSelections({ ...styleSelections, [sector.id]: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {sectorStyles.map((st: any) => (
                            <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {allTags && allTags.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-medium">Tags</Label>
              <div className="space-y-2">
                {allTags.map((tag: any) => {
                  const isSelected = selectedTags.some((t) => t.tagId === tag.id);
                  const selectedEntry = selectedTags.find((t) => t.tagId === tag.id);
                  return (
                    <div key={tag.id} className="flex items-center gap-2">
                      <div
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags(selectedTags.filter((t) => t.tagId !== tag.id));
                          } else {
                            setSelectedTags([...selectedTags, { tagId: tag.id, sectorId: null }]);
                          }
                        }}
                        className={`px-3 py-1 rounded-full cursor-pointer text-xs font-medium transition-all shrink-0 ${
                          isSelected ? "ring-2 ring-offset-1" : "opacity-60 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: tag.color || "#3b82f6", color: "white" }}
                      >
                        {tag.name}
                      </div>
                      {isSelected && (
                        <Select
                          value={selectedEntry?.sectorId || "geral"}
                          onValueChange={(v) => {
                            setSelectedTags(
                              selectedTags.map((t) =>
                                t.tagId === tag.id ? { ...t, sectorId: v === "geral" ? null : v } : t
                              )
                            );
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="geral">Empresa (geral)</SelectItem>
                            {sectors?.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Partners (Sócios) */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="has-partners"
                checked={hasPartners}
                onCheckedChange={(checked) => {
                  setHasPartners(!!checked);
                  if (checked && partners.length === 0) {
                    setPartners([{ name: "" }]);
                  }
                }}
              />
              <Label htmlFor="has-partners" className="text-sm font-medium cursor-pointer">
                Informar sócios
              </Label>
            </div>

            {hasPartners && (
              <div className="space-y-2 pl-6">
                {partners.map((partner, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder={`Nome do sócio ${idx + 1}`}
                      value={partner.name}
                      onChange={(e) => {
                        const updated = [...partners];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        setPartners(updated);
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => setPartners(partners.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPartners([...partners, { name: "" }])}
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar sócio
                </Button>
              </div>
            )}
          </div>

          {/* Exclude from document report */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="exclude-doc-report"
                checked={form.exclude_from_doc_report}
                onCheckedChange={(checked) => setForm({ ...form, exclude_from_doc_report: !!checked })}
              />
              <Label htmlFor="exclude-doc-report" className="text-sm cursor-pointer">
                Excluir da geração de relatórios de documentos em massa
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações rápidas</Label>
            <Textarea
              value={form.notes_quick}
              onChange={(e) => setForm({ ...form, notes_quick: e.target.value })}
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

