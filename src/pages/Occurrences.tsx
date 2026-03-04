import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOccurrencesWithComments, useSectors, useClients, useParameterOptions } from "@/hooks/useSupabaseQuery";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, FileDown } from "lucide-react";
import OccurrenceFormDialog from "@/components/OccurrenceFormDialog";
import ExpandableRecordCard from "@/components/ExpandableRecordCard";
import { useToast } from "@/hooks/use-toast";
import {
  fetchRelatorioCompleto,
  gerarRelatorioPdf,
  downloadBlob,
} from "@/services/relatorioPendencias";

export default function Occurrences() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: sectors } = useSectors();
  const { data: clients } = useClients();
  const { data: occCategories } = useParameterOptions("occurrence_category");

  useEffect(() => {
    const channel = supabase
      .channel("occurrences-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "occurrences" }, () => {
        queryClient.invalidateQueries({ queryKey: ["occurrences"] });
        queryClient.invalidateQueries({ queryKey: ["occurrences_with_comments"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const [sectorFilter, setSectorFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const { data: occurrences, isLoading } = useOccurrencesWithComments();

  const filtered = occurrences?.filter((o: any) => {
    const matchSearch = o.title.toLowerCase().includes(search.toLowerCase());
    const matchSector = sectorFilter === "all" || o.sector_id === sectorFilter;
    const matchClient = clientFilter === "all" || o.client_id === clientFilter;
    const matchCategory = categoryFilter === "all" || o.category === categoryFilter;
    return matchSearch && matchSector && matchClient && matchCategory;
  });

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
        titulo: "Relatório de Ocorrências",
        incluirPendencias: false,
        incluirParticularidades: false,
        nomeSetor: sectorName,
        nomeCliente: clientName,
      });
      downloadBlob(blob, `relatorio-ocorrencias.pdf`);
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
        <h1 className="text-2xl font-bold">Ocorrências</h1>
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
            <Plus className="h-4 w-4 mr-1" /> Nova ocorrência
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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {(occCategories || []).map((c: any) => (
              <SelectItem key={c.id} value={c.value}>{c.value}</SelectItem>
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
            Nenhuma ocorrência encontrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered?.map((occ: any) => (
            <ExpandableRecordCard
              key={occ.id}
              id={occ.id}
              title={occ.title}
              description={occ.description}
              createdAt={occ.created_at}
              creatorName={occ.profiles?.full_name || occ.profiles?.email}
              date={occ.occurred_at}
              dateLabel="Ocorrência"
              monetaryValue={occ.monetary_value}
              category={occ.category}
              comments={occ.comments || []}
              commentTable="occurrence_comments"
              commentForeignKey="occurrence_id"
              queryKey={["occurrences_with_comments"]}
              tableName="occurrences"
              badges={
                <>
                  {occ.clients && <Badge variant="outline" className="text-xs">{occ.clients?.legal_name}</Badge>}
                  <Badge variant="outline" className="text-xs">{occ.sectors?.name}</Badge>
                </>
              }
            />
          ))}
        </div>
      )}

      {showForm && (
        <OccurrenceFormDialog open={true} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
