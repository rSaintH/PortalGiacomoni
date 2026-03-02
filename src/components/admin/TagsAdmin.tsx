import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useTags } from "@/hooks/useSupabaseQuery";
import { createTag as createCompanyTag, deleteTag as deleteCompanyTag } from "@/services/admin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

export default function TagsAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tags } = useTags();
  const [newTag, setNewTag] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");

  const addTag = async () => {
    if (!newTag.trim()) return;
    try {
      await createCompanyTag({ name: newTag.trim(), color: newTagColor, userId: user?.id });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setNewTag("");
      toast({ title: "Tag criada!" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  const deleteTag = async (tagId: string) => {
    try {
      await deleteCompanyTag(tagId);
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast({ title: "Tag excluida!" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tags de Empresas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nome da tag"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
          />
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="h-10 w-12 rounded border"
            />
            <Button onClick={addTag} size="sm"><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="space-y-2">
          {tags?.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded bg-muted/50">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: t.color || "#3b82f6" }} />
                <span className="text-sm font-medium">{t.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={t.is_active ? "default" : "secondary"} className="text-xs">
                  {t.is_active ? "Ativa" : "Inativa"}
                </Badge>
                <Button variant="destructive" size="sm" onClick={() => deleteTag(t.id)}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
          {!tags?.length && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tag.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
