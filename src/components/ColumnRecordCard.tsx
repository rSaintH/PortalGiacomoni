import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Calendar, DollarSign, User } from "lucide-react";
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

interface ColumnRecordCardProps {
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
  category?: string;
  overdue?: boolean;
  comments: Comment[];
  commentTable: "task_comments" | "occurrence_comments";
  commentForeignKey: "task_id" | "occurrence_id";
  queryKey: any[];
  badges?: React.ReactNode;
  tableName?: "tasks" | "occurrences";
  onStatusChange?: () => void;
}

export default function ColumnRecordCard({
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
  tableName,
  onStatusChange,
}: ColumnRecordCardProps) {
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const { data: taskStatuses } = useParameterOptions("task_status");

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isTask = tableName === "tasks";
  const isClosed = status ? (CLOSED_TASK_STATUSES as readonly string[]).includes(status) : false;

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
    <Card className={`flex flex-col h-full min-w-[220px] w-[220px] shrink-0 ${overdue ? "border-destructive/50" : ""} ${isClosed ? "opacity-60" : ""}`}>
      {/* Fixed header area */}
      <CardContent className="p-3 flex flex-col h-full gap-2">
        {/* Title */}
        <p className={`font-medium text-xs leading-tight ${isClosed ? "line-through" : ""}`}>{title}</p>

        {/* Metadata */}
        <div className="space-y-1">
          {badges && <div className="flex flex-wrap gap-1">{badges}</div>}
          <div className="flex items-center gap-1 flex-wrap">
            {priority && (
              <Badge className={`${getPriorityBadgeClass(priority)} text-[10px] px-1.5 py-0`}>{priority}</Badge>
            )}
            {category && (
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${category === "Atenção" ? "border-destructive text-destructive" : ""}`}
              >
                {category}
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Calendar className="h-2.5 w-2.5" />
            {format(new Date(createdAt), "dd/MM/yy", { locale: ptBR })}
          </span>
          {date && (
            <span className={`text-[10px] flex items-center gap-1 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              <Calendar className="h-2.5 w-2.5" />
              {dateLabel}: {format(new Date(date), "dd/MM/yy")}
            </span>
          )}
          {monetaryValue != null && monetaryValue > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-2.5 w-2.5" />
              {formatCurrency(monetaryValue)}
            </span>
          )}
          {creatorName && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <User className="h-2.5 w-2.5" />
              {creatorName}
            </span>
          )}
        </div>

        {/* Status */}
        {isTask && status && (
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className={`${getStatusBadgeClass(status)} text-[10px] font-semibold h-6 w-full border rounded`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {(taskStatuses || []).map((s: any) => (
                <SelectItem key={s.id} value={s.value}>
                  <span className={`${getStatusBadgeClass(s.value)} px-1.5 py-0.5 rounded text-[10px] font-medium`}>{s.value}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {!isTask && status && (
          <span className={`${getStatusBadgeClass(status)} text-[10px] font-semibold px-2 py-0.5 rounded text-center`}>{status}</span>
        )}

        {/* Description */}
        {description && (
          <div className="border-t pt-1">
            <p className="text-[10px] text-muted-foreground line-clamp-3 whitespace-pre-wrap">{description}</p>
          </div>
        )}

        {/* Comments - takes remaining space */}
        <div className="border-t pt-2 flex-1 flex flex-col min-h-0">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">
            Comentários ({comments.length})
          </p>
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[120px] max-h-[400px]">
            {comments.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">Nenhum comentário.</p>
            ) : (
              comments
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((c) => (
                  <div key={c.id} className="bg-muted/50 rounded p-1.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-medium truncate">
                        {c.profiles?.full_name || c.profiles?.email || "Usuário"}
                      </span>
                      <span className="text-[9px] text-muted-foreground shrink-0 ml-1">
                        {format(new Date(c.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-[10px] whitespace-pre-wrap">{c.comment}</p>
                  </div>
                ))
            )}
          </div>

          {/* New comment */}
          <div className="flex gap-1 mt-2 shrink-0">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Comentar..."
              rows={2}
              className="text-[10px] min-h-[40px] p-1.5"
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
              className="shrink-0 self-end h-7 w-7"
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
