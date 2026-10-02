/**
 * Dynamic Slotting's 5 tabs. Velocity Analysis, Storage Utilization and the
 * misplaced-SKU detection behind Re-slotting Tasks are all computed by the
 * backend from Master Data/Inventory rows other modules already own (see
 * app/models/slotting_ops.py) — only Strategies, Simulations and
 * ReslottingTasks themselves are new entities.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMasterDataList, useMasterDataCreate, useMasterDataUpdate } from "@/hooks/useMasterDataApi";

export interface SlottingStrategy {
  id: number;
  name: string;
  base_logic: string;
  lookback_days: number;
  target_zones: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Simulation {
  id: number;
  sim_number: string;
  strategy_id: number;
  strategy_name: string;
  misplaced_count: number;
  efficiency_gain_pct: number;
  labor_saving_hours: number;
  status: string;
  created_at: string;
  applied_at: string | null;
}

export interface VelocityBucket {
  classification: string;
  count: number;
  pick_count: number;
}

export interface MaterialVelocity {
  material_id: number;
  sku: string;
  description: string;
  pick_count: number;
  classification: string;
  location_code: string | null;
  location_type: string | null;
}

export interface ZoneUtilization {
  zone: string;
  zone_type: string;
  on_hand_units: number;
  capacity_units: number;
  utilization_pct: number;
}

export interface HoneycombSummary {
  honeycombing_pct: number;
  partial_pallets: number;
  consolidatable: number;
  total_assigned: number;
}

export interface ReslottingTask {
  id: number;
  task_number: string;
  material_id: number;
  sku: string;
  description: string;
  from_location_code: string;
  to_location_code: string;
  reason: string;
  priority: string;
  assignee: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface OptimizationImpact {
  travel_time_reduction_pct: number;
  space_recovered_units: number;
  labor_efficiency_pct: number;
  applied_simulations: number;
  completed_tasks: number;
}

const STRATEGIES = "/operations/slotting-strategies";
const SIMULATIONS = "/operations/slotting-simulations";
const VELOCITY = "/operations/slotting-velocity";
const UTILIZATION = "/operations/slotting-utilization";
const RESLOTTING = "/operations/slotting-reslotting-tasks";
const REPORTS = "/operations/slotting-reports";

// ---- Slotting Strategies (generic CRUD) ----
export const useSlottingStrategies = () => useMasterDataList<SlottingStrategy>(STRATEGIES);
export const useCreateSlottingStrategy = () => useMasterDataCreate<SlottingStrategy>(STRATEGIES);
export const useUpdateSlottingStrategy = () => useMasterDataUpdate<SlottingStrategy>(STRATEGIES);

// ---- Simulations ----
export function useSimulations() {
  return useQuery<Simulation[]>({
    queryKey: [SIMULATIONS],
    queryFn: () => api.raw<Simulation[]>(`${SIMULATIONS}/`),
  });
}

export function useRunSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (strategy_id: number) => api.raw<Simulation>(`${SIMULATIONS}/run`, { method: "POST", body: JSON.stringify({ strategy_id }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SIMULATIONS] }),
  });
}

export function useApplySimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<Simulation>(`${SIMULATIONS}/${id}/apply`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SIMULATIONS] });
      qc.invalidateQueries({ queryKey: [RESLOTTING] });
    },
  });
}

// ---- Velocity Analysis ----
export function useVelocitySummary() {
  return useQuery<VelocityBucket[]>({
    queryKey: [VELOCITY, "summary"],
    queryFn: () => api.raw<VelocityBucket[]>(`${VELOCITY}/summary`),
  });
}

export function useVelocityMaterials() {
  return useQuery<MaterialVelocity[]>({
    queryKey: [VELOCITY, "materials"],
    queryFn: () => api.raw<MaterialVelocity[]>(`${VELOCITY}/materials`),
  });
}

// ---- Storage Utilization ----
export function useZoneUtilization() {
  return useQuery<ZoneUtilization[]>({
    queryKey: [UTILIZATION, "zones"],
    queryFn: () => api.raw<ZoneUtilization[]>(`${UTILIZATION}/zones`),
  });
}

export function useHoneycombing() {
  return useQuery<HoneycombSummary>({
    queryKey: [UTILIZATION, "honeycombing"],
    queryFn: () => api.raw<HoneycombSummary>(`${UTILIZATION}/honeycombing`),
  });
}

// ---- Re-slotting Tasks ----
export function useReslottingTasks() {
  return useQuery<ReslottingTask[]>({
    queryKey: [RESLOTTING],
    queryFn: () => api.raw<ReslottingTask[]>(`${RESLOTTING}/`),
  });
}

function invalidateSlotting(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [RESLOTTING] });
  qc.invalidateQueries({ queryKey: [VELOCITY] });
  qc.invalidateQueries({ queryKey: [UTILIZATION] });
  qc.invalidateQueries({ queryKey: [REPORTS] });
}

export function useAssignReslottingTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignee }: { id: number; assignee: string }) =>
      api.raw<ReslottingTask>(`${RESLOTTING}/${id}/assign`, { method: "PATCH", body: JSON.stringify({ assignee }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RESLOTTING] }),
  });
}

export function useReleaseBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.raw<{ released: number }>(`${RESLOTTING}/release-batch`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RESLOTTING] }),
  });
}

export function useCompleteReslottingTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<ReslottingTask>(`${RESLOTTING}/${id}/complete`, { method: "PATCH" }),
    onSuccess: () => invalidateSlotting(qc),
  });
}

// ---- Optimization Reports ----
export function useOptimizationImpact() {
  return useQuery<OptimizationImpact>({
    queryKey: [REPORTS, "impact"],
    queryFn: () => api.raw<OptimizationImpact>(`${REPORTS}/impact`),
  });
}
