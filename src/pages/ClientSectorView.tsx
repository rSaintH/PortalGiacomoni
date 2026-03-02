import { useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  useClient,
  useClientParticularities,
  useClientPops,
  useTasksWithComments,
  useOccurrencesWithComments,
  useSectors,
  useClientTags,
  useParameterOptions,
  usePermissionSettings,
} from "@/hooks/useSupabaseQuery";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  FileText,
  Star,
  ClipboardList,
  AlertCircle,
  Plus,
  Trash2,
  Columns,
  List,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { getPriorityBadgeClass } from "@/lib/constants";
import { canManageParticularities as checkCanManageParticularities, getRestrictedSectorId } from "@/services/permissions.logic";
import { isTaskOverdue, filterTasksByStatus } from "@/services/tasks.logic";
import { filterPopsByScope } from "@/services/pops.logic";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TaskFormDialog from "@/components/TaskFormDialog";
import ParticularityFormDialog from "@/components/ParticularityFormDialog";
import OccurrenceFormDialog from "@/components/OccurrenceFormDialog";
import PopViewDialog from "@/components/PopViewDialog";
import PopFormDialog from "@/components/PopFormDialog";
import ExpandableRecordCard from "@/components/ExpandableRecordCard";
import ColumnRecordCard from "@/components/ColumnRecordCard";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { deleteClientParticularity } from "@/services/clients.service";
import { deletePop } from "@/services/pops.service";
import { subscribeToTasksRealtime, unsubscribeChannel } from "@/services/realtime.service";


export default function ClientSectorView() {
  const { userRole, userSectorId } = useAuth();
  const canManageParticularities = checkCanManageParticularities(userRole);
  const queryClient = useQueryClient();
  const { id, sectorId } = useParams<{ id: string; sectorId: string }>();
  const { data: permissionSettings } = usePermissionSettings();
  const { data: client, isLoading } = useClient(id!);
  const { data: clientTags } = useClientTags(id!);
  const { data: particularities } = useClientParticularities(id!);
  const { data: pops } = useClientPops(id!);
  const { data: tasks } = useTasksWithComments({ clientId: id });
  const { data: occurrences } = useOccurrencesWithComments(id);
  const { data: sectors } = useSectors();
  const { data: taskStatuses } = useParameterOptions("task_status");

  // Realtime: atualiza pendências quando outro usuário faz mudanças
  useEffect(() => {
    const channel = subscribeToTasksRealtime("tasks-realtime-client", () => {
      queryClient.invalidateQueries({ queryKey: ["tasks_with_comments"] });
    });
    return () => {
      unsubscribeChannel(channel);
    };
  }, [queryClient]);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showParticularityForm, setShowParticularityForm] = useState(false);
  const [showOccurrenceForm, setShowOccurrenceForm] = useState(false);
  const [viewPop, setViewPop] = useState<any>(null);
  const [showPopForm, setShowPopForm] = useState(false);
  const [deletingPopId, setDeletingPopId] = useState<string | null>(null);
  const [deletingParticularityId, setDeletingParticularityId] = useState<string | null>(null);
  const [taskStatusFilter, setTaskStatusFilter] = useState("open");
  const [taskViewMode, setTaskViewMode] = useState<"list" | "columns">("list");
  const [occViewMode, setOccViewMode] = useState<"list" | "columns">("list");
  const { toast } = useToast();
  const restrictedSectorId = getRestrictedSectorId(permissionSettings as any, userRole, userSectorId);
  const isRestrictedCollaborator = Boolean(restrictedSectorId);

  if (isRestrictedCollaborator && sectorId !== restrictedSectorId) {
    return <Navigate to={`/clients/${id}/sector/${restrictedSectorId}`} replace />;
  }

  const currentSectorId = isRestrictedCollaborator ? restrictedSectorId! : sectorId;
  const backHref = isRestrictedCollaborator ? "/clients" : `/clients/${id}`;

  const handleDeletePop = useCallback(async () => {
    if (!deletingPopId) return;
    try {
      await deletePop(deletingPopId);
      toast({ title: "POP excluido com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["pops", "client", id] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    setDeletingPopId(null);
  }, [deletingPopId, queryClient, toast, id]);

  const handleDeleteParticularity = useCallback(async () => {
    if (!deletingParticularityId) return;
    try {
      await deleteClientParticularity(deletingParticularityId);
      toast({ title: "Particularidade excluida com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["particularities"] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    setDeletingParticularityId(null);
  }, [deletingParticularityId, queryClient, toast]);

  const clientTagIds = useMemo(
    () => clientTags?.map((ct: any) => ct.tag_id) || [],
    [clientTags]
  );

  const sectorTags = useMemo(
    () => clientTags?.filter((ct: any) => ct.sector_id === currentSectorId) || [],
    [clientTags, currentSectorId]
  );

  const sectorParticularities = useMemo(
    () => particularities?.filter((p: any) => p.sector_id === currentSectorId) || [],
    [particularities, currentSectorId]
  );
  const sectorPops = useMemo(
    () => filterPopsByScope(pops || [], currentSectorId!, id!, clientTagIds),
    [pops, currentSectorId, id, clientTagIds]
  );
  const sectorTasks = useMemo(
    () => tasks?.filter((t: any) => t.sector_id === currentSectorId) || [],
    [tasks, currentSectorId]
  );
  const filteredTasks = useMemo(
    () => filterTasksByStatus(sectorTasks, taskStatusFilter),
    [sectorTasks, taskStatusFilter]
  );
  const sectorOccurrences = useMemo(
    () => occurrences?.filter((o: any) => o.sector_id === currentSectorId) || [],
    [occurrences, currentSectorId]
  );

  const openTasks = filterTasksByStatus(sectorTasks, "open");
  const sectorName = sectors?.find((s: any) => s.id === currentSectorId)?.name || "";

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Cliente não encontrado.
        <Link to="/clients" className="block mt-2 text-primary hover:underline">Voltar à lista</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Link to={backHref}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{client.trade_name || client.legal_name}</h1>
          <p className="text-sm text-muted-foreground">{sectorName}</p>
        </div>
        </div>

      {sectorTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sectorTags.map((ct: any) => (
            <Badge
              key={ct.id}
              style={{ backgroundColor: ct.tags?.color || "#3b82f6", color: "white" }}
              className="text-xs"
            >
              {ct.tags?.name}
            </Badge>
          ))}
        </div>
      )}

      <Tabs defaultValue="particularities">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="particularities" className="gap-1">
            <Star className="h-3 w-3" /> Particularidades
            <Badge variant="secondary" className="ml-1 text-xs">{sectorParticularities.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pops" className="gap-1">
            <FileText className="h-3 w-3" /> POPs
            <Badge variant="secondary" className="ml-1 text-xs">{sectorPops.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1">
            <ClipboardList className="h-3 w-3" /> Pendências
            <Badge variant="secondary" className="ml-1 text-xs">{openTasks.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="occurrences" className="gap-1">
            <AlertCircle className="h-3 w-3" /> Ocorrências
            <Badge variant="secondary" className="ml-1 text-xs">{sectorOccurrences.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="particularities" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowParticularityForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nova particularidade
            </Button>
          </div>
          {sectorParticularities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma particularidade registrada.</p>
          ) : (
            sectorParticularities.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{p.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {p.sections?.name && <Badge variant="outline" className="text-xs">{p.sections.name}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge className={`${getPriorityBadgeClass(p.priority)} text-xs`}>{p.priority}</Badge>
                      {canManageParticularities && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingParticularityId(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {p.details && <p className="text-sm text-muted-foreground mt-2">{p.details}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="pops" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowPopForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo POP
            </Button>
          </div>
          {sectorPops.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum POP aplicável.</p>
          ) : (
            sectorPops.map((pop: any) => (
              <Card
                key={pop.id}
                className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
                onClick={() => setViewPop(pop)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{pop.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{pop.scope}</Badge>
                        <Badge variant="outline" className="text-xs">{pop.status}</Badge>
                      </div>
                      {pop.objective && <p className="text-sm text-muted-foreground mt-2">{pop.objective}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={(e) => { e.stopPropagation(); setDeletingPopId(pop.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-3 mt-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Pendentes</SelectItem>
                  <SelectItem value="closed">Concluídos</SelectItem>
                  {(taskStatuses || []).map((s: any) => (
                    <SelectItem key={s.id} value={s.value}>{s.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ToggleGroup type="single" value={taskViewMode} onValueChange={(v) => v && setTaskViewMode(v as "list" | "columns")} size="sm">
                <ToggleGroupItem value="list" aria-label="Lista"><List className="h-4 w-4" /></ToggleGroupItem>
                <ToggleGroupItem value="columns" aria-label="Colunas"><Columns className="h-4 w-4" /></ToggleGroupItem>
              </ToggleGroup>
            </div>
            <Button size="sm" onClick={() => setShowTaskForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nova pendência
            </Button>
          </div>
          {filteredTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma pendência.</p>
          ) : taskViewMode === "columns" ? (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-3 items-stretch" style={{ minHeight: "500px" }}>
                {filteredTasks.map((task: any) => {
                  const overdue = isTaskOverdue(task);
                  return (
                    <ColumnRecordCard
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
                      queryKey={["tasks_with_comments", { clientId: id }]}
                      tableName="tasks"
                      badges={<Badge variant="outline" className="text-[10px] px-1.5 py-0">{task.type}</Badge>}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            filteredTasks.map((task: any) => {
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
                  queryKey={["tasks_with_comments", { clientId: id }]}
                  tableName="tasks"
                  badges={<Badge variant="outline" className="text-xs">{task.type}</Badge>}
                />
              );
            })
          )}
        </TabsContent>

        <TabsContent value="occurrences" className="space-y-3 mt-4">
          <div className="flex items-center justify-between gap-2">
            <ToggleGroup type="single" value={occViewMode} onValueChange={(v) => v && setOccViewMode(v as "list" | "columns")} size="sm">
              <ToggleGroupItem value="list" aria-label="Lista"><List className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="columns" aria-label="Colunas"><Columns className="h-4 w-4" /></ToggleGroupItem>
            </ToggleGroup>
            <Button size="sm" onClick={() => setShowOccurrenceForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nova ocorrência
            </Button>
          </div>
          {sectorOccurrences.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma ocorrência.</p>
          ) : occViewMode === "columns" ? (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-3 items-stretch" style={{ minHeight: "500px" }}>
                {sectorOccurrences.map((occ: any) => (
                  <ColumnRecordCard
                    key={occ.id}
                    id={occ.id}
                    title={occ.title}
                    description={occ.description}
                    createdAt={occ.created_at}
                    creatorName={occ.profiles?.full_name || occ.profiles?.email}
                    date={occ.occurred_at}
                    dateLabel="Ocorreu em"
                    monetaryValue={occ.monetary_value}
                    category={occ.category}
                    comments={occ.comments || []}
                    commentTable="occurrence_comments"
                    commentForeignKey="occurrence_id"
                    queryKey={["occurrences_with_comments", id]}
                  />
                ))}
              </div>
            </div>
          ) : (
            sectorOccurrences.map((occ: any) => (
              <ExpandableRecordCard
                key={occ.id}
                id={occ.id}
                title={occ.title}
                description={occ.description}
                createdAt={occ.created_at}
                creatorName={occ.profiles?.full_name || occ.profiles?.email}
                date={occ.occurred_at}
                dateLabel="Ocorreu em"
                monetaryValue={occ.monetary_value}
                category={occ.category}
                comments={occ.comments || []}
                commentTable="occurrence_comments"
                commentForeignKey="occurrence_id"
                queryKey={["occurrences_with_comments", id]}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {showTaskForm && <TaskFormDialog open={showTaskForm} onClose={() => setShowTaskForm(false)} clientId={id!} sectorId={currentSectorId!} />}
      {showParticularityForm && <ParticularityFormDialog open={showParticularityForm} onClose={() => setShowParticularityForm(false)} clientId={id!} sectorId={currentSectorId!} />}
      {showOccurrenceForm && <OccurrenceFormDialog open={showOccurrenceForm} onClose={() => setShowOccurrenceForm(false)} clientId={id!} sectorId={currentSectorId!} />}
      {viewPop && <PopViewDialog open={!!viewPop} onClose={() => setViewPop(null)} pop={viewPop} clientId={id} />}
      {showPopForm && <PopFormDialog open={showPopForm} onClose={() => setShowPopForm(false)} pop={{ sector_id: currentSectorId, client_id: id, scope: "Cliente" }} />}

      <AlertDialog open={!!deletingPopId} onOpenChange={(open) => !open && setDeletingPopId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir POP?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePop} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingParticularityId} onOpenChange={(open) => !open && setDeletingParticularityId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir particularidade?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteParticularity} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


