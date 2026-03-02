// ── Task Logic ──
// Centralized task filtering and overdue checks extracted from UI components.

import { isPast, isToday } from "date-fns";
import { CLOSED_TASK_STATUSES } from "@/lib/constants";

export interface TaskLike {
  status: string;
  due_date?: string | null;
  title?: string;
  [key: string]: unknown;
}

/** Check if a task is overdue (past due date, not today, not closed). */
export function isTaskOverdue(task: TaskLike): boolean {
  if (!task.due_date) return false;
  const dueDate = new Date(task.due_date);
  return isPast(dueDate) && !isToday(dueDate) && !CLOSED_TASK_STATUSES.includes(task.status as typeof CLOSED_TASK_STATUSES[number]);
}

/**
 * Filter tasks by status group.
 * - "open": only non-closed tasks
 * - "closed": only closed tasks
 * - "all": no status filtering
 * - any other value: exact status match
 */
export function filterTasksByStatus(tasks: TaskLike[], statusFilter: string): TaskLike[] {
  if (statusFilter === "open") return tasks.filter((t) => !CLOSED_TASK_STATUSES.includes(t.status as typeof CLOSED_TASK_STATUSES[number]));
  if (statusFilter === "closed") return tasks.filter((t) => CLOSED_TASK_STATUSES.includes(t.status as typeof CLOSED_TASK_STATUSES[number]));
  if (statusFilter === "all") return tasks;
  return tasks.filter((t) => t.status === statusFilter);
}

/** Filter tasks by search text (matches on title, case-insensitive). */
export function filterTasksBySearch(tasks: TaskLike[], search: string): TaskLike[] {
  if (!search.trim()) return tasks;
  const lower = search.toLowerCase();
  return tasks.filter((t) => t.title?.toLowerCase().includes(lower));
}

/** Combined filter: status + search. */
export function filterTasks(tasks: TaskLike[], statusFilter: string, search: string): TaskLike[] {
  const byStatus = filterTasksByStatus(tasks, statusFilter);
  return filterTasksBySearch(byStatus, search);
}
