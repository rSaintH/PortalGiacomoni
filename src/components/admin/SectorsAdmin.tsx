import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useSectors, useSections } from "@/hooks/useSupabaseQuery";
import { createSector, createSection } from "@/services/admin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

export default function SectorsAdmin({ canManageSectors }: { canManageSectors: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sectors } = useSectors();
  const { data: sections } = useSections();
  const [newSector, setNewSector] = useState("");
  const [newSection, setNewSection] = useState("");
  const [sectionSectorId, setSectionSectorId] = useState("");

  const addSector = async () => {
    if (!newSector.trim()) return;
    try {
      await createSector(newSector.trim(), user?.id);
      queryClient.invalidateQueries({ queryKey: ["sectors"] });
      setNewSector("");
      toast({ title: "Setor criado!" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  const addSection = async () => {
    if (!newSection.trim() || !sectionSectorId) return;
    try {
      await createSection(newSection.trim(), sectionSectorId, user?.id);
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      setNewSection("");
      toast({ title: "Secao criada!" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  return (
    <div className={canManageSectors ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "grid grid-cols-1 gap-6"}>
      {canManageSectors && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Setores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Nome do setor"
                value={newSector}
                onChange={(e) => setNewSector(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSector()}
              />
              <Button onClick={addSector} size="sm"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-1">
              {sectors?.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm font-medium">{s.name}</span>
                  <Badge variant={s.is_active ? "default" : "secondary"} className="text-xs">
                    {s.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              ))}
              {!sectors?.length && <p className="text-sm text-muted-foreground text-center py-4">Nenhum setor.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seções</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select value={sectionSectorId} onValueChange={setSectionSectorId}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Setor" /></SelectTrigger>
              <SelectContent>
                {sectors?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="Nome da seção"
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSection()}
              className="flex-1"
            />
            <Button onClick={addSection} size="sm"><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-1">
            {sections?.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                <div>
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">({s.sectors?.name})</span>
                </div>
              </div>
            ))}
            {!sections?.length && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma seção.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
