import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  fetchClientById,
  fetchClientParticularities,
  fetchClientPopNote,
  fetchClientPops,
  fetchClientSectorStyles,
  fetchClients,
  fetchClientTags,
  fetchDocTags,
  fetchDocumentMonthlyStatus,
  fetchDocumentReportLogs,
  fetchDocumentTypeDocTags,
  fetchDocumentTypes,
  fetchManagementConfig,
  fetchManagementReviews,
  fetchOccurrenceComments,
  fetchOccurrences,
  fetchOccurrencesWithComments,
  fetchParameterOptions,
  fetchPermissionSettings,
  fetchPopVersions,
  fetchPops,
  fetchProfilesWithRoles,
  fetchSections,
  fetchSectors,
  fetchSectorStyles,
  fetchTags,
  fetchTaskComments,
  fetchTasks,
  fetchTasksWithComments,
  fetchTaskStats,
  type TaskFilters,
} from "@/services/query.service";

const STALE_5MIN = 5 * 60 * 1000;

export function useSectors() {
  return useQuery({
    queryKey: ["sectors"],
    staleTime: STALE_5MIN,
    queryFn: fetchSectors,
  });
}

export function useSections(sectorId?: string) {
  return useQuery({
    queryKey: ["sections", sectorId],
    staleTime: STALE_5MIN,
    queryFn: () => fetchSections(sectorId),
  });
}

export function useClients() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["clients", user?.id ?? "anon"],
    staleTime: STALE_5MIN,
    queryFn: () => fetchClients(user?.id),
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ["clients", id],
    staleTime: STALE_5MIN,
    queryFn: () => fetchClientById(id),
    enabled: !!id,
  });
}

export function useClientParticularities(clientId: string) {
  return useQuery({
    queryKey: ["particularities", clientId],
    staleTime: STALE_5MIN,
    queryFn: () => fetchClientParticularities(clientId),
    enabled: !!clientId,
  });
}

export function useClientPops(clientId: string) {
  return useQuery({
    queryKey: ["pops", "client", clientId],
    staleTime: STALE_5MIN,
    queryFn: () => fetchClientPops(clientId),
    enabled: !!clientId,
  });
}

export function usePops() {
  return useQuery({
    queryKey: ["pops"],
    staleTime: STALE_5MIN,
    queryFn: fetchPops,
  });
}

export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: ["tasks", filters],
    staleTime: STALE_5MIN,
    queryFn: () => fetchTasks(filters),
  });
}

export function useTaskComments(taskId?: string) {
  return useQuery({
    queryKey: ["task_comments", taskId],
    queryFn: () => fetchTaskComments(taskId!),
    enabled: !!taskId,
  });
}

export function useOccurrenceComments(occurrenceId?: string) {
  return useQuery({
    queryKey: ["occurrence_comments", occurrenceId],
    queryFn: () => fetchOccurrenceComments(occurrenceId!),
    enabled: !!occurrenceId,
  });
}

export function useTasksWithComments(filters?: TaskFilters) {
  return useQuery({
    queryKey: ["tasks_with_comments", filters],
    staleTime: STALE_5MIN,
    queryFn: () => fetchTasksWithComments(filters),
  });
}

export function useOccurrencesWithComments(clientId?: string) {
  return useQuery({
    queryKey: ["occurrences_with_comments", clientId],
    staleTime: STALE_5MIN,
    queryFn: () => fetchOccurrencesWithComments(clientId),
  });
}

export function useOccurrences(clientId?: string) {
  return useQuery({
    queryKey: ["occurrences", clientId],
    staleTime: STALE_5MIN,
    queryFn: () => fetchOccurrences(clientId),
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    staleTime: STALE_5MIN,
    queryFn: fetchProfilesWithRoles,
  });
}

export function useClientPopNote(clientId: string, popId: string) {
  return useQuery({
    queryKey: ["client_pop_notes", clientId, popId],
    staleTime: STALE_5MIN,
    queryFn: () => fetchClientPopNote(clientId, popId),
    enabled: !!clientId && !!popId,
  });
}

export function usePermissionSettings() {
  return useQuery({
    queryKey: ["permission_settings"],
    staleTime: STALE_5MIN,
    queryFn: fetchPermissionSettings,
  });
}

export function useSectorStyles(sectorId?: string) {
  return useQuery({
    queryKey: ["sector_styles", sectorId],
    staleTime: STALE_5MIN,
    queryFn: () => fetchSectorStyles(sectorId),
  });
}

export function useClientSectorStyles(clientId: string) {
  return useQuery({
    queryKey: ["client_sector_styles", clientId],
    staleTime: STALE_5MIN,
    queryFn: () => fetchClientSectorStyles(clientId),
    enabled: !!clientId,
  });
}

export function useTaskStats() {
  return useQuery({
    queryKey: ["task_stats"],
    staleTime: STALE_5MIN,
    queryFn: fetchTaskStats,
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    staleTime: STALE_5MIN,
    queryFn: fetchTags,
  });
}

export function useParameterOptions(type?: string) {
  return useQuery({
    queryKey: ["parameter_options", type],
    staleTime: STALE_5MIN,
    queryFn: () => fetchParameterOptions(type),
  });
}

export function usePopVersions(popId: string) {
  return useQuery({
    queryKey: ["pop_versions", popId],
    staleTime: STALE_5MIN,
    queryFn: () => fetchPopVersions(popId),
    enabled: !!popId,
  });
}

export function useDocumentTypes(clientId?: string) {
  return useQuery({
    queryKey: ["document_types", clientId],
    staleTime: STALE_5MIN,
    queryFn: () => fetchDocumentTypes(clientId),
  });
}

export function useDocumentMonthlyStatus(clientId: string, yearMonth: string) {
  return useQuery({
    queryKey: ["document_monthly_status", clientId, yearMonth],
    staleTime: STALE_5MIN,
    queryFn: () => fetchDocumentMonthlyStatus(clientId, yearMonth),
    enabled: !!clientId && !!yearMonth,
  });
}

export function useDocumentReportLogs(yearMonth: string) {
  return useQuery({
    queryKey: ["document_report_logs", yearMonth],
    staleTime: STALE_5MIN,
    queryFn: () => fetchDocumentReportLogs(yearMonth),
    enabled: !!yearMonth,
  });
}

export function useDocTags() {
  return useQuery({
    queryKey: ["doc_tags"],
    staleTime: STALE_5MIN,
    queryFn: fetchDocTags,
  });
}

export function useDocumentTypeDocTags(documentTypeIds: string[]) {
  return useQuery({
    queryKey: ["document_type_doc_tags", documentTypeIds],
    staleTime: STALE_5MIN,
    queryFn: () => fetchDocumentTypeDocTags(documentTypeIds),
    enabled: documentTypeIds.length > 0,
  });
}

export function useManagementConfig() {
  return useQuery({
    queryKey: ["management_config"],
    staleTime: STALE_5MIN,
    queryFn: fetchManagementConfig,
  });
}

export function useManagementReviews(yearMonths: string[]) {
  return useQuery({
    queryKey: ["management_reviews", yearMonths],
    staleTime: STALE_5MIN,
    queryFn: () => fetchManagementReviews(yearMonths),
    enabled: yearMonths.length > 0,
  });
}

export function useClientTags(clientId: string) {
  return useQuery({
    queryKey: ["client_tags", clientId],
    staleTime: STALE_5MIN,
    queryFn: () => fetchClientTags(clientId),
    enabled: !!clientId,
  });
}
