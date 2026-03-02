import { useState, useCallback, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, MessageSquare, Send, Calendar, DollarSign, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getStatusBadgeClass, getPriorityBadgeClass, CLOSED_TASK_STATUSES } from "@/lib/constants";
import { useParameterOptions } from "@/hooks/useSupabaseQuery";
import { insertRecordComment, updateTaskStatus } from "@/services/tasks.service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  created_by: string;
  profiles?: { full_name: string; email: string } | null;
}

interface ExpandableRecordCardProps {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
  creatorName?: string;
  date?: string | null;
  dateLabel?: string;
  monetaryValue?: number | null;
  status?: string;
  priority?: string;
  type?: string;
  category?: string;
  sectorName?: string;
  overdue?: boolean;
  comments: Comment[];
  commentTable: "task_comments" | "occurrence_comments";
  commentForeignKey: "task_id" | "occurrence_id";
  queryKey: any[];
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  tableName?: "tasks" | "occurrences";
  onStatusChange?: () => void;
}

function ExpandableRecordCard({
  id,
  title,
  description,
  createdAt,
  creatorName,
  date,
  dateLabel = "Data",
  monetaryValue,
  status,
  priority,
  category,
  overdue,
  comments,
  commentTable,
  commentForeignKey,
  queryKey,
  badges,
  actions,
  tableName,
  onStatusChange,
}: ExpandableRecordCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const { data: taskStatuses } = useParameterOptions("task_status");
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSendComment = useCallback(async () => {
    if (!newComment.trim() || !user) return;
    setSending(true);
    try {
      await insertRecordComment({
        table: commentTable,
        foreignKey: commentForeignKey,
        recordId: id,
        comment: newComment.trim(),
        userId: user.id,
      });
      setNewComment("");
      queryClient.invalidateQueries({ queryKey });
    } catch (err: any) {
      toast({ title: "Erro ao comentar", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }, [newComment, user, id, commentTable, commentForeignKey, queryClient, queryKey, toast]);

  const isTask = tableName === "tasks";
  const isClosed = status ? (CLOSED_TASK_STATUSES as readonly string[]).includes(status) : false;


  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!user || tableName !== "tasks") return;
    try {
      await updateTaskStatus(id, newStatus, user.id);
      queryClient.invalidateQueries({ queryKey });
      onStatusChange?.();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  }, [id, user, tableName, queryClient, queryKey, toast, onStatusChange]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <Card className={`transition-all ${overdue ? "border-destructive/50" : ""} ${expanded ? "ring-1 ring-primary/20" : ""} ${isClosed ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        {/* Header - always visible */}
        <div
          className="flex items-start justify-between gap-2 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-sm ${isClosed ? "line-through" : ""}`}>{title}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {badges}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
              {date && (
                <span className={`text-xs flex items-center gap-1 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  <Calendar className="h-3 w-3" />
                  {dateLabel}: {format(new Date(date), "dd/MM/yyyy")}
                </span>
              )}
              {monetaryValue != null && monetaryValue > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(monetaryValue)}
                </span>
              )}
              {creatorName && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {creatorName}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-1">
              {priority && (
                <Badge className={`${getPriorityBadgeClass(priority)} text-xs`}>{priority}</Badge>
              )}
              {category && (
                <Badge
                  variant="outline"
                  className={`text-xs ${category === "Atenção" ? "border-destructive text-destructive" : ""}`}
                >
                  {category}
                </Badge>
              )}
              {actions}
            </div>
            {isTask && status && (
              <Select
                value={status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger
                  className={`${getStatusBadgeClass(status)} text-sm font-semibold h-8 w-auto min-w-[160px] border rounded-md`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {(taskStatuses || []).map((s: any) => (
                    <SelectItem key={s.id} value={s.value}>
                      <span className={`${getStatusBadgeClass(s.value)} px-2 py-0.5 rounded text-xs font-medium`}>{s.value}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!isTask && status && (
              <span className={`${getStatusBadgeClass(status)} text-sm font-semibold px-3 py-1 rounded-md`}>{status}</span>
            )}
            <div className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span className="text-xs">{comments.length}</span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {/* Description */}
            {description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Detalhes</p>
                <p className="text-sm whitespace-pre-wrap">{description}</p>
              </div>
            )}

            {/* Comments */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Comentários ({comments.length})
              </p>
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum comentário ainda.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {comments
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((c) => (
                    <div key={c.id} className="bg-muted/50 rounded-md p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">
                          {c.profiles?.full_name || c.profiles?.email || "Usuário"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(c.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{c.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* New comment input */}
              <div className="flex gap-2 mt-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escreva um comentário..."
                  rows={2}
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSendComment}
                  disabled={sending || !newComment.trim()}
                  className="shrink-0 self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(ExpandableRecordCard);
