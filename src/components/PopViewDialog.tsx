import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Save, ExternalLink } from "lucide-react";
import PopVersionHistory from "@/components/PopVersionHistory";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import PopFormDialog from "@/components/PopFormDialog";
import RichTextEditor from "@/components/RichTextEditor";
import { useClientPopNote } from "@/hooks/useSupabaseQuery";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getPopStatusBadgeClass } from "@/lib/constants";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { saveClientPopNote } from "@/services/pops.service";

interface Props {
  open: boolean;
  onClose: () => void;
  pop: any;
  clientId?: string;
}

export default function PopViewDialog({ open, onClose, pop, clientId }: Props) {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const { data: popNote } = useClientPopNote(clientId || "", pop?.id || "");

  useEffect(() => {
    if (popNote) setNoteContent(popNote.content);
    else setNoteContent("");
  }, [popNote]);

  if (!pop) return null;

  const saveNote = async () => {
    if (!clientId) return;
    setSavingNote(true);
    try {
      await saveClientPopNote({
        noteId: popNote?.id,
        clientId,
        popId: pop.id,
        content: noteContent,
        userId: user?.id,
      });
      queryClient.invalidateQueries({ queryKey: ["client_pop_notes", clientId, pop.id] });
      toast({ title: "Observacao salva!" });
      setEditingNote(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <>
      <Dialog open={open && !showEdit} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl">{pop.title}</DialogTitle>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge className={getPopStatusBadgeClass(pop.status)}>{pop.status}</Badge>
                  <Badge variant="outline">{pop.scope}</Badge>
                  <Badge variant="outline">{pop.sectors?.name}</Badge>
                  {pop.sections?.name && <Badge variant="outline">{pop.sections.name}</Badge>}
                  <Badge variant="secondary">v{pop.version}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Atualizado em {format(new Date(pop.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <PopVersionHistory popId={pop.id} isAdmin={isAdmin} />
                <Button variant="outline" size="sm" asChild>
                  <a href={`/pops/${pop.id}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir / PDF
                  </a>
                </Button>
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
                    <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#ffffff", color: "#000000" }}>
            <div className="max-w-3xl mx-auto py-8 px-8">
              {pop.objective && (
                <div className="mb-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "#666666" }}>
                    Objetivo
                  </h2>
                  <p className="text-sm leading-relaxed">{pop.objective}</p>
                </div>
              )}

              {pop.steps && (
                <div className="mb-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "#666666" }}>
                    Procedimento
                  </h2>
                  <div
                    className="ProseMirror prose prose-sm max-w-none text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: pop.steps }}
                  />
                </div>
              )}

              {pop.links && pop.links.length > 0 && pop.links.some((link: string) => link.trim()) && (
                <div className="mt-8 pt-4 border-t">
                  <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "#666666" }}>
                    Links
                  </h2>
                  <ul className="space-y-1">
                    {pop.links
                      .filter((link: string) => link.trim())
                      .map((link: string, index: number) => (
                        <li key={index}>
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline break-all"
                          >
                            {link}
                          </a>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {clientId && (
                <div className="border-t pt-6 mt-8">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Observacoes especificas deste cliente
                    </h2>
                    {!editingNote ? (
                      <Button variant="outline" size="sm" onClick={() => setEditingNote(true)}>
                        <Edit className="h-3.5 w-3.5 mr-1" /> {popNote ? "Editar" : "Adicionar"}
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingNote(false);
                            setNoteContent(popNote?.content || "");
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={saveNote} disabled={savingNote}>
                          <Save className="h-3.5 w-3.5 mr-1" /> {savingNote ? "Salvando..." : "Salvar"}
                        </Button>
                      </div>
                    )}
                  </div>
                  {editingNote ? (
                    <RichTextEditor
                      content={noteContent}
                      onChange={setNoteContent}
                      placeholder="Adicione observacoes especificas deste cliente para este POP..."
                    />
                  ) : popNote?.content ? (
                    <div
                      className="ProseMirror prose prose-sm max-w-none text-sm border rounded-md p-4 bg-accent/10 border-accent/30"
                      dangerouslySetInnerHTML={{ __html: popNote.content }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma observacao especifica.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showEdit && (
        <PopFormDialog
          open={showEdit}
          onClose={() => {
            setShowEdit(false);
            onClose();
          }}
          pop={pop}
        />
      )}
    </>
  );
}
