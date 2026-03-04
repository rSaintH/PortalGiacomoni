import { useState } from "react";
import { useAllParticularities, useSectors, useClients } from "@/hooks/useSupabaseQuery";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, FileDown, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getPriorityBadgeClass } from "@/lib/constants";
import ParticularityFormDialog from "@/components/ParticularityFormDialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchRelatorioCompleto,
  gerarRelatorioPdf,
  downloadBlob,
} from "@/services/relatorioPendencias";

export default function Particularities() {
  const { isAdmin, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sectors } = useSectors();
  const { data: clients } = useClients();

  const [sectorFilter, setSectorFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const filters: { sectorId?: string } = {};
  if (sectorFilter !== "all") filters.sectorId = sectorFilter;

  const { data: particularities, isLoading } = useAllParticularities(filters);

  const canDelete = isAdmin || userRole === "supervisao" || userRole === "supervisão";

  const filtered = particularities?.filter((p: any) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchPriority = priorityFilter === "all" || p.priority === priorityFilter;
    const matchClient = clientFilter === "all" || p.client_id === clientFilter;
    return matchSearch && matchPriority && matchClient;
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("client_particularities")
        .update({ is_archived: true })
        .eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["all_particularities"] });
      toast({ title: "Particularidade removida." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingPdf(true);
    try {
      const filtro: any = {};
      if (sectorFilter !== "all") filtro.sectorId = sectorFilter;
      if (clientFilter !== "all") filtro.clientId = clientFilter;

      const sectorName = sectorFilter !== "all"
        ? sectors?.find((s) => s.id === sectorFilter)?.name
        : undefined;
      const clientName = clientFilter !== "all"
        ? clients?.find((c: any) => c.id === clientFilter)?.legal_name
        : undefined;

      const relatorio = await fetchRelatorioCompleto(filtro);
      const blob = await gerarRelatorioPdf(relatorio, {
        titulo: "Relatório de Particularidades",
        incluirPendencias: false,
        incluirOcorrencias: false,
        nomeSetor: sectorName,
        nomeCliente: clientName,
      });
      downloadBlob(blob, `relatorio-particularidades.pdf`);
      toast({ title: "Relatório gerado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao gerar relatório", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Particularidades</h1>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateReport}
            disabled={generatingPdf}
          >
            <FileDown className="h-4 w-4 mr-1" />
            {generatingPdf ? "Gerando..." : "Gerar relatório"}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" /> Nova particularidade
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Setor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos setores</SelectItem>
            {sectors?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos clientes</SelectItem>
            {clients?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.trade_name || c.legal_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas prioridades</SelectItem>
            {["Alta", "Média", "Baixa"].map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma particularidade encontrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered?.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{p.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {p.clients && (
                        <Badge variant="outline" className="text-xs">
                          {p.clients?.trade_name || p.clients?.legal_name}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{p.sectors?.name}</Badge>
                      {p.sections?.name && (
                        <Badge variant="outline" className="text-xs">{p.sections.name}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    {p.details && (
                      <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{p.details}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`${getPriorityBadgeClass(p.priority)} text-xs`}>
                      {p.priority}
                    </Badge>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <ParticularityFormDialog
          open={true}
          onClose={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ["all_particularities"] });
          }}
        />
      )}
    </div>
  );
}
