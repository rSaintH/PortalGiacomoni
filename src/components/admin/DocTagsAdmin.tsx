import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useDocTags } from "@/hooks/useSupabaseQuery";
import { createDocTag, deleteDocTag } from "@/services/admin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

export default function DocTagsAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: docTags } = useDocTags();
  const [newTag, setNewTag] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [newTagTextColor, setNewTagTextColor] = useState("#ffffff");

  const addTag = async () => {
    if (!newTag.trim()) return;
    try {
      await createDocTag({
        name: newTag.trim(),
        color: newTagColor,
        textColor: newTagTextColor,
        userId: user?.id,
      });
      queryClient.invalidateQueries({ queryKey: ["doc_tags"] });
      setNewTag("");
      toast({ title: "Tag de documento criada!" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await deleteDocTag(tagId);
      queryClient.invalidateQueries({ queryKey: ["doc_tags"] });
      toast({ title: "Tag excluida!" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tags de Documentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <Input
            placeholder="Nome da tag"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
          />
          <div className="flex items-center gap-1.5">
            <div className="text-center">
              <Label className="text-[10px] text-muted-foreground">Fundo</Label>
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="h-9 w-10 rounded border cursor-pointer"
              />
            </div>
            <div className="text-center">
              <Label className="text-[10px] text-muted-foreground">Texto</Label>
              <input
                type="color"
                value={newTagTextColor}
                onChange={(e) => setNewTagTextColor(e.target.value)}
                className="h-9 w-10 rounded border cursor-pointer"
              />
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap" style={{ backgroundColor: newTagColor, color: newTagTextColor }}>
              {newTag || "Preview"}
            </span>
            <Button onClick={addTag} size="sm"><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="space-y-2">
          {docTags?.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: t.color || "#3b82f6", color: t.text_color || "#ffffff" }}>
                  {t.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={t.is_active ? "default" : "secondary"} className="text-xs">
                  {t.is_active ? "Ativa" : "Inativa"}
                </Badge>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteTag(t.id)}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
          {!docTags?.length && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tag de documento.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
