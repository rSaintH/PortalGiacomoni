import { useState } from "react";
import { usePops, useSectors } from "@/hooks/useSupabaseQuery";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, FileText, MoreVertical, Trash2 } from "lucide-react";
import PopFormDialog from "@/components/PopFormDialog";
import { getPopStatusBadgeClass, POP_STATUSES } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deletePop } from "@/services/pops.service";

export default function Pops() {
  const { data: pops, isLoading } = usePops();
  const { data: sectors } = useSectors();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editPop, setEditPop] = useState<any>(null);

  const filtered = pops?.filter((pop: any) => {
    if (pop.client_id) return false;
    const matchSearch = pop.title.toLowerCase().includes(search.toLowerCase());
    const matchSector = sectorFilter === "all" || pop.sector_id === sectorFilter;
    const matchStatus = statusFilter === "all" || pop.status === statusFilter;
    return matchSearch && matchSector && matchStatus;
  });

  const handleDeletePop = async (popId: string, popTitle: string) => {
    if (!confirm(`Tem certeza que deseja excluir o POP "${popTitle}"?`)) return;
    try {
      await deletePop(popId);
      toast.success("POP excluido com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["pops"] });
    } catch (error: any) {
      toast.error("Erro ao excluir POP: " + error.message);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Biblioteca de POPs</h1>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Novo POP
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar POP..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos setores</SelectItem>
            {sectors?.map((sector) => (
              <SelectItem key={sector.id} value={sector.id}>
                {sector.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {POP_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
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
            {search || sectorFilter !== "all" || statusFilter !== "all"
              ? "Nenhum POP encontrado com esses filtros."
              : "Nenhum POP cadastrado."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered?.map((pop: any) => (
            <Card
              key={pop.id}
              className={isAdmin ? "cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" : ""}
              onClick={() => {
                if (isAdmin) {
                  setEditPop(pop);
                  setShowForm(true);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{pop.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {pop.scope}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {pop.sectors?.name}
                        </Badge>
                        {pop.clients?.legal_name && (
                          <Badge variant="outline" className="text-xs">
                            {pop.clients.legal_name}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">v{pop.version}</span>
                      </div>
                      {pop.objective && <p className="text-sm text-muted-foreground mt-2">{pop.objective}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Badge className={`${getPopStatusBadgeClass(pop.status)} text-xs`} variant="outline">
                      {pop.status}
                    </Badge>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeletePop(pop.id, pop.title)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <PopFormDialog
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setEditPop(null);
          }}
          pop={editPop}
        />
      )}
    </div>
  );
}
