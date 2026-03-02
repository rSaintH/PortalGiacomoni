import { useState } from "react";
import { usePopVersions } from "@/hooks/useSupabaseQuery";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Eye, RotateCcw } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { restorePopVersion } from "@/services/pops.service";

interface Props {
  popId: string;
  isAdmin: boolean;
}

export default function PopVersionHistory({ popId, isAdmin }: Props) {
  const { data: versions, isLoading } = usePopVersions(popId);
  const [previewVersion, setPreviewVersion] = useState<any>(null);
  const [restoring, setRestoring] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRestore = async (version: any) => {
    if (!isAdmin) return;
    setRestoring(true);
    try {
      await restorePopVersion(popId, version, user?.id);
      queryClient.invalidateQueries({ queryKey: ["pops"] });
      queryClient.invalidateQueries({ queryKey: ["pop", popId] });
      queryClient.invalidateQueries({ queryKey: ["pop_versions", popId] });
      toast({ title: "Versão restaurada!" });
      setPreviewVersion(null);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <History className="h-3.5 w-3.5 mr-1" /> Histórico
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[450px]">
          <SheetHeader>
            <SheetTitle>Histórico de versões</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : !versions?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma versão anterior salva.</p>
            ) : (
              versions.map((v: any) => (
                <div
                  key={v.id}
                  className="border rounded-lg p-3 space-y-1.5 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">v{v.version_number}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(v.saved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate">{v.title}</p>
                  <p className="text-xs text-muted-foreground">Por: {v.saved_by_name}</p>
                  <div className="flex gap-1 pt-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPreviewVersion(v)}>
                      <Eye className="h-3 w-3 mr-1" /> Ver
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-orange-600 hover:text-orange-700" onClick={() => handleRestore(v)} disabled={restoring}>
                        <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {previewVersion && (
        <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
          <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Badge variant="secondary">v{previewVersion.version_number}</Badge>
                {previewVersion.title}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Salvo em {format(new Date(previewVersion.saved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                {" por "}{previewVersion.saved_by_name}
              </p>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {previewVersion.objective && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Objetivo</h3>
                  <p className="text-sm">{previewVersion.objective}</p>
                </div>
              )}
              {previewVersion.steps && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Procedimento</h3>
                  <div className="ProseMirror prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: previewVersion.steps }} />
                </div>
              )}
              {isAdmin && (
                <div className="flex justify-end pt-2 border-t">
                  <Button size="sm" variant="outline" onClick={() => handleRestore(previewVersion)} disabled={restoring}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> {restoring ? "Restaurando..." : "Restaurar esta versão"}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
