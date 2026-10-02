/**
 * Replenishment's 5 tabs. Replenishment Rules is NOT a separate resource
 * here — it's Master Data's existing /master-data/replenishment-rules
 * (see useMasterDataApi), reused as-is. These hooks cover the one new
 * table (ReplenishmentTask) plus the live Trigger Monitor and Reports
 * computations.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ReplenishmentTask {
  id: number;
  task_number: string;
  rule_id: number | null;
  material_id: number;
  from_location_id: number;
  to_location_id: number;
  qty_required: number;
  qty_assigned: number;
  priority: string;
  assignee: string | null;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  sku: string;
  description: string;
  from_location_code: string;
  to_location_code: string;
}

export interface TriggerRow {
  rule_id: number;
  sku: string;
  description: string;
  location_id: number;
  location_code: string;
  current_qty: number;
  min_qty: number;
  max_qty: number;
  reorder_point: number | null;
  deficit: number;
  severity: string;
  open_task_id: number | null;
  open_task_number: string | null;
  status: string;
  checked_at: string;
}

export interface MonthlyVolumePoint { month: string; tasks: number; }
export interface TopSkuPoint { sku: string; qty: number; }

export interface ReplenishmentReportSummary {
  tasks_completed_mtd: number;
  avg_task_duration_minutes: number;
  auto_triggered_pct: number;
  rule_accuracy_pct: number;
  monthly_volume: MonthlyVolumePoint[];
  top_skus: TopSkuPoint[];
}

export interface CreateTaskPayload {
  material_id: number;
  from_location_id: number;
  to_location_id: number;
  qty_required: number;
  priority: string;
  assignee?: string;
}

const TASKS = "/operations/replenishment-tasks";
const TRIGGERS = "/operations/replenishment-triggers";
const REPORTS = "/operations/replenishment-reports";

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [TASKS] });
  qc.invalidateQueries({ queryKey: [TRIGGERS] });
  qc.invalidateQueries({ queryKey: [REPORTS] });
}

// ---- Replenishment Tasks ----
export function useReplenishmentTasks() {
  return useQuery<ReplenishmentTask[]>({ queryKey: [TASKS], queryFn: () => api.raw<ReplenishmentTask[]>(`${TASKS}/`) });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => api.raw<ReplenishmentTask>(`${TASKS}/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TASKS] }),
  });
}

export function useAutoGenerateTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.raw<ReplenishmentTask[]>(`${TASKS}/auto-generate`, { method: "POST" }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useStartTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignee }: { id: number; assignee?: string }) =>
      api.raw<ReplenishmentTask>(`${TASKS}/${id}/start`, { method: "PATCH", body: assignee ? JSON.stringify({ assignee }) : undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TASKS] }),
  });
}

export function useHoldTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<ReplenishmentTask>(`${TASKS}/${id}/hold`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TASKS] }),
  });
}

export function useResumeTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<ReplenishmentTask>(`${TASKS}/${id}/resume`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TASKS] }),
  });
}

export function useReassignTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignee }: { id: number; assignee: string }) =>
      api.raw<ReplenishmentTask>(`${TASKS}/${id}/reassign`, { method: "PATCH", body: JSON.stringify({ assignee }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TASKS] }),
  });
}

export function useCancelTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<ReplenishmentTask>(`${TASKS}/${id}/cancel`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TASKS] }),
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<ReplenishmentTask>(`${TASKS}/${id}/complete`, { method: "PATCH" }),
    onSuccess: () => invalidateAll(qc),
  });
}

// ---- Trigger Monitor ----
export function useReplenishmentTriggers() {
  return useQuery<TriggerRow[]>({ queryKey: [TRIGGERS], queryFn: () => api.raw<TriggerRow[]>(`${TRIGGERS}/`) });
}

export function useCreateTaskFromTrigger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: number) => api.raw<ReplenishmentTask>(`${TRIGGERS}/${ruleId}/create-task`, { method: "POST" }),
    onSuccess: () => invalidateAll(qc),
  });
}

// ---- Reports ----
export function useReplenishmentReportSummary() {
  return useQuery<ReplenishmentReportSummary>({ queryKey: [REPORTS], queryFn: () => api.raw<ReplenishmentReportSummary>(`${REPORTS}/summary`) });
}
