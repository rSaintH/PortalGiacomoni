import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useSectors, useSectorStyles } from "@/hooks/useSupabaseQuery";
import { createSectorStyle } from "@/services/admin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

export default function StylesAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sectors } = useSectors();
  const { data: styles } = useSectorStyles();
  const [sectorId, setSectorId] = useState("");
  const [newStyle, setNewStyle] = useState("");

  const addStyle = async () => {
    if (!newStyle.trim() || !sectorId) return;
    try {
      await createSectorStyle(newStyle.trim(), sectorId, user?.id);
      queryClient.invalidateQueries({ queryKey: ["sector_styles"] });
      setNewStyle("");
      toast({ title: "Estilo criado!" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  const grouped = sectors?.map((s) => ({
    ...s,
    styles: styles?.filter((st: any) => st.sector_id === s.id) || [],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estilos por Setor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={sectorId} onValueChange={setSectorId}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Setor" /></SelectTrigger>
            <SelectContent>
              {sectors?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Nome do estilo (ex: A, B, C)"
            value={newStyle}
            onChange={(e) => setNewStyle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addStyle()}
            className="flex-1"
          />
          <Button onClick={addStyle} size="sm"><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-3">
          {grouped?.map((sector) => (
            <div key={sector.id}>
              <p className="text-sm font-medium mb-1">{sector.name}</p>
              {sector.styles.length === 0 ? (
                <p className="text-xs text-muted-foreground ml-2">Nenhum estilo cadastrado</p>
              ) : (
                <div className="flex flex-wrap gap-1 ml-2">
                  {sector.styles.map((st: any) => (
                    <Badge key={st.id} variant="outline">{st.name}</Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
