import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTasksWithComments, useSectors, useClients, useParameterOptions } from "@/hooks/useSupabaseQuery";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import TaskFormDialog from "@/components/TaskFormDialog";
import ExpandableRecordCard from "@/components/ExpandableRecordCard";
import { isTaskOverdue, filterTasks } from "@/services/tasks.logic";
import { subscribeToTasksRealtime, unsubscribeChannel } from "@/services/realtime.service";

export default function Tasks() {
  const queryClient = useQueryClient();
  const { data: sectors } = useSectors();
  const { data: clients } = useClients();
  const { data: taskStatuses } = useParameterOptions("task_status");

  // Realtime: atualiza pendencias quando outro usuario faz mudancas
  useEffect(() => {
    const channel = subscribeToTasksRealtime("tasks-realtime", () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks_with_comments"] });
      queryClient.invalidateQueries({ queryKey: ["task_stats"] });
    });
    return () => {
      unsubscribeChannel(channel);
    };
  }, [queryClient]);
  const [sectorFilter, setSectorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");

  const filters: { sectorId?: string; status?: string } = {};
  if (sectorFilter !== "all") filters.sectorId = sectorFilter;
  // Don't pass status filter to query - we filter client-side for open/closed grouping
  const { data: tasks, isLoading } = useTasksWithComments(filters);

  const filtered = filterTasks(tasks || [], statusFilter, search);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pendências</h1>
        <Button
          size="sm"
          onClick={() => {
            setSelectedClientId("");
            setShowForm(true);
          }}
          disabled={!clients?.length}
        >
          <Plus className="h-4 w-4 mr-1" /> Nova pendência
        </Button>
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Pendentes</SelectItem>
            <SelectItem value="closed">Concluídos</SelectItem>
            {(taskStatuses || []).map((s: any) => (
              <SelectItem key={s.id} value={s.value}>{s.value}</SelectItem>
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
            Nenhuma pendência encontrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered?.map((task: any) => {
            const overdue = isTaskOverdue(task);
            return (
              <ExpandableRecordCard
                key={task.id}
                id={task.id}
                title={task.title}
                description={task.description}
                createdAt={task.created_at}
                creatorName={task.profiles?.full_name || task.profiles?.email}
                date={task.due_date}
                dateLabel={overdue ? "Vencida" : "Vence"}
                monetaryValue={task.monetary_value}
                status={task.status}
                priority={task.priority}
                overdue={overdue}
                comments={task.comments || []}
                commentTable="task_comments"
                commentForeignKey="task_id"
                queryKey={["tasks_with_comments", filters]}
                tableName="tasks"
                badges={
                  <>
                    <Badge variant="outline" className="text-xs">{task.clients?.trade_name || task.clients?.legal_name}</Badge>
                    <Badge variant="outline" className="text-xs">{task.sectors?.name}</Badge>
                    <Badge variant="outline" className="text-xs">{task.type}</Badge>
                  </>
                }
              />
            );
          })}
        </div>
      )}

      {showForm && (
        <TaskFormClientSelect
          clients={clients || []}
          selectedClientId={selectedClientId}
          onClientSelect={setSelectedClientId}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function TaskFormClientSelect({
  clients,
  selectedClientId,
  onClientSelect,
  onClose,
}: {
  clients: any[];
  selectedClientId: string;
  onClientSelect: (id: string) => void;
  onClose: () => void;
}) {
  if (!selectedClientId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20">
        <Card className="w-full max-w-sm mx-4">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">Selecione o cliente</h3>
            <Select onValueChange={onClientSelect}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.trade_name || c.legal_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="w-full" onClick={onClose}>Cancelar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <TaskFormDialog open={true} onClose={onClose} clientId={selectedClientId} />;
}



