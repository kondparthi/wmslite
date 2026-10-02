/**
 * Cross Docking's 5 tabs. CrossDockPlan/CrossDockTask are the only new
 * entities on the backend (see app/models/crossdock_ops.py) — everything
 * else reuses Inbound's real unconsumed receipts, Outbound's real open
 * order lines, and Yard Management's real door codes.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CrossDockPlan {
  id: number;
  plan_number: string;
  receipt_id: number;
  order_line_id: number;
  material_id: number;
  qty: number;
  match_level: string;
  transfer_type: string;
  priority: string;
  rule_applied: string | null;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  sku: string;
  description: string;
  asn_number: string;
  order_number: string;
}

export interface MatchCandidate {
  receipt_id: number;
  order_line_id: number;
  sku: string;
  description: string;
  asn_number: string;
  order_number: string;
  qty: number;
}

export interface CrossDockTask {
  id: number;
  task_number: string;
  plan_id: number;
  plan_number: string;
  material_id: number;
  sku: string;
  description: string;
  qty: number;
  lpn: string | null;
  from_door_code: string | null;
  to_door_code: string | null;
  current_location_code: string | null;
  assignee: string | null;
  status: string;
  created_at: string;
  staged_at: string | null;
  completed_at: string | null;
}

export interface OpportunisticRule {
  id: number;
  name: string;
  rule_type: string;
  description: string | null;
  status: string;
  created_at: string;
}

export interface StagingZone {
  zone: string;
  zone_name: string;
  capacity: number;
  occupied: number;
  next_priority: string;
}

export interface VolumeTrendPoint {
  day: string;
  cd: number;
  std: number;
}

export interface CrossDockReportSummary {
  total_savings_usd: number;
  avg_cycle_minutes: number;
  storage_avoided_units: number;
  active_tasks: number;
  completed_tasks: number;
  volume_trend: VolumeTrendPoint[];
}

const PLANS = "/operations/crossdock-plans";
const TASKS = "/operations/crossdock-tasks";
const RULES = "/operations/crossdock-opportunistic";
const STAGING = "/operations/crossdock-staging";
const REPORTS = "/operations/crossdock-reports";

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [PLANS] });
  qc.invalidateQueries({ queryKey: [TASKS] });
  qc.invalidateQueries({ queryKey: [RULES] });
  qc.invalidateQueries({ queryKey: [STAGING] });
  qc.invalidateQueries({ queryKey: [REPORTS] });
}

// ---- CD Planning ----
export function useCrossDockPlans() {
  return useQuery<CrossDockPlan[]>({ queryKey: [PLANS], queryFn: () => api.raw<CrossDockPlan[]>(`${PLANS}/`) });
}

export function useMatchCandidates() {
  return useQuery<MatchCandidate[]>({ queryKey: [PLANS, "candidates"], queryFn: () => api.raw<MatchCandidate[]>(`${PLANS}/candidates`) });
}

export interface CreatePlanPayload {
  receipt_id: number;
  order_line_id: number;
  qty: number;
  transfer_type: string;
  match_level: string;
  priority: string;
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePlanPayload) => api.raw<CrossDockPlan>(`${PLANS}/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PLANS] }); },
  });
}

export function useRunMatchEngine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.raw<CrossDockPlan[]>(`${PLANS}/match`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PLANS] }),
  });
}

export function useConfirmPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<CrossDockPlan>(`${PLANS}/${id}/confirm`, { method: "PATCH" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PLANS] }); qc.invalidateQueries({ queryKey: [TASKS] }); },
  });
}

export function useCancelPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<CrossDockPlan>(`${PLANS}/${id}/cancel`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PLANS] }),
  });
}

// ---- CD Execution ----
export function useCrossDockTasks() {
  return useQuery<CrossDockTask[]>({ queryKey: [TASKS], queryFn: () => api.raw<CrossDockTask[]>(`${TASKS}/`) });
}

export function useStageTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<CrossDockTask>(`${TASKS}/${id}/stage`, { method: "PATCH" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TASKS] }); qc.invalidateQueries({ queryKey: [STAGING] }); },
  });
}

export function useStartTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignee }: { id: number; assignee?: string }) =>
      api.raw<CrossDockTask>(`${TASKS}/${id}/start`, { method: "PATCH", body: assignee ? JSON.stringify({ assignee }) : undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TASKS] }),
  });
}

export function useAssignTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignee }: { id: number; assignee: string }) =>
      api.raw<CrossDockTask>(`${TASKS}/${id}/assign`, { method: "PATCH", body: JSON.stringify({ assignee }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TASKS] }),
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<CrossDockTask>(`${TASKS}/${id}/complete`, { method: "PATCH" }),
    onSuccess: () => invalidateAll(qc),
  });
}

// ---- Opportunistic CD ----
export function useOpportunisticRules() {
  return useQuery<OpportunisticRule[]>({ queryKey: [RULES, "rules"], queryFn: () => api.raw<OpportunisticRule[]>(`${RULES}/rules`) });
}

export function useToggleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.raw<OpportunisticRule>(`${RULES}/rules/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RULES] }),
  });
}

export function useDetectedOpportunities() {
  return useQuery<CrossDockPlan[]>({ queryKey: [RULES, "detected"], queryFn: () => api.raw<CrossDockPlan[]>(`${RULES}/detected`) });
}

export function useRunDetection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.raw<CrossDockPlan[]>(`${RULES}/detect`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [RULES] }); qc.invalidateQueries({ queryKey: [PLANS] }); },
  });
}

// ---- Staging & Sorting ----
export function useStagingZones() {
  return useQuery<StagingZone[]>({ queryKey: [STAGING, "zones"], queryFn: () => api.raw<StagingZone[]>(`${STAGING}/zones`) });
}

// ---- CD Analytics ----
export function useCrossDockReportSummary() {
  return useQuery<CrossDockReportSummary>({ queryKey: [REPORTS, "summary"], queryFn: () => api.raw<CrossDockReportSummary>(`${REPORTS}/summary`) });
}
