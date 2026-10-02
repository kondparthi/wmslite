/**
 * Yard Management's 5 tabs. Unlike Shipping Execution, nothing upstream
 * already models a trailer at the gate or a dock door, so these are new
 * entities end to end (see app/models/yard_ops.py). Carriers on a check-in
 * are the same Master Data Carrier row every other module uses.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface YardCheckIn {
  id: number;
  pass_id: string;
  trailer_number: string;
  carrier_id: number | null;
  transaction_type: string;
  seal_number: string | null;
  status: string;
  zone: string | null;
  checked_in_at: string;
  checked_out_at: string | null;
  dwell_minutes: number;
}

export interface GateSummary {
  pending_entry: number;
  inside_yard: number;
  avg_turnaround_minutes: number;
  overdue_dwell: number;
}

export interface ZoneSummary {
  zone: string;
  count: number;
  capacity: number;
  utilization_pct: number;
}

export interface YardDoor {
  id: number;
  door_code: string;
  status: string;
  checkin_id: number | null;
  trailer_number: string | null;
  task_type: string | null;
  progress: number;
  updated_at: string;
}

export interface YardMove {
  id: number;
  move_number: string;
  checkin_id: number;
  trailer_number: string | null;
  from_location: string;
  to_location: string;
  priority: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
}

export interface AgingBucket {
  range: string;
  count: number;
}

export interface CarrierPerformance {
  carrier_id: number;
  carrier_name: string;
  on_time_pct: number;
  trailer_count: number;
}

const CHECKINS = "/operations/yard-checkins";
const ZONES = "/operations/yard-zones";
const DOORS = "/operations/yard-doors";
const MOVES = "/operations/yard-moves";
const REPORTS = "/operations/yard-reports";

// ---- Gate Management ----
export function useYardCheckIns(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return useQuery<YardCheckIn[]>({
    queryKey: [CHECKINS, status ?? "all"],
    queryFn: () => api.raw<YardCheckIn[]>(`${CHECKINS}/${qs}`),
  });
}

export function useGateSummary() {
  return useQuery<GateSummary>({
    queryKey: [CHECKINS, "summary"],
    queryFn: () => api.raw<GateSummary>(`${CHECKINS}/summary`),
  });
}

function invalidateYard(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [CHECKINS] });
  qc.invalidateQueries({ queryKey: [ZONES] });
  qc.invalidateQueries({ queryKey: [DOORS] });
  qc.invalidateQueries({ queryKey: [REPORTS] });
}

export function useCheckInTrailer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { trailer_number: string; carrier_id?: number; transaction_type: string; seal_number?: string }) =>
      api.raw<YardCheckIn>(`${CHECKINS}/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => invalidateYard(qc),
  });
}

export function useEnterYard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, zone }: { id: number; zone: string }) =>
      api.raw<YardCheckIn>(`${CHECKINS}/${id}/enter-yard`, { method: "PATCH", body: JSON.stringify({ zone }) }),
    onSuccess: () => invalidateYard(qc),
  });
}

export function useInspectCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<YardCheckIn>(`${CHECKINS}/${id}/inspect`, { method: "PATCH" }),
    onSuccess: () => invalidateYard(qc),
  });
}

export function useCheckOutTrailer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<YardCheckIn>(`${CHECKINS}/${id}/check-out`, { method: "PATCH" }),
    onSuccess: () => invalidateYard(qc),
  });
}

// ---- Yard Inventory (zones) ----
export function useZoneSummary() {
  return useQuery<ZoneSummary[]>({
    queryKey: [ZONES, "summary"],
    queryFn: () => api.raw<ZoneSummary[]>(`${ZONES}/summary`),
  });
}

// ---- Dock & Doors ----
export function useYardDoors() {
  return useQuery<YardDoor[]>({
    queryKey: [DOORS],
    queryFn: () => api.raw<YardDoor[]>(`${DOORS}/`),
  });
}

export function useAssignDoor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, checkin_id, task_type }: { id: number; checkin_id: number; task_type: string }) =>
      api.raw<YardDoor>(`${DOORS}/${id}/assign`, { method: "POST", body: JSON.stringify({ checkin_id, task_type }) }),
    onSuccess: () => invalidateYard(qc),
  });
}

export function useUpdateDoorProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, progress }: { id: number; progress: number }) =>
      api.raw<YardDoor>(`${DOORS}/${id}/progress`, { method: "PATCH", body: JSON.stringify({ progress }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [DOORS] }),
  });
}

export function useReleaseDoor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<YardDoor>(`${DOORS}/${id}/release`, { method: "PATCH" }),
    onSuccess: () => invalidateYard(qc),
  });
}

// ---- Shunter Workflows (moves) ----
export function useYardMoves(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return useQuery<YardMove[]>({
    queryKey: [MOVES, status ?? "all"],
    queryFn: () => api.raw<YardMove[]>(`${MOVES}/${qs}`),
  });
}

export function useCreateMove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { checkin_id: number; from_location: string; to_location: string; priority: string }) =>
      api.raw<YardMove>(`${MOVES}/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [MOVES] }),
  });
}

export function useDispatchMove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<YardMove>(`${MOVES}/${id}/dispatch`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [MOVES] }),
  });
}

export function useCompleteMove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<YardMove>(`${MOVES}/${id}/complete`, { method: "PATCH" }),
    onSuccess: () => invalidateYard(qc),
  });
}

// ---- Yard Analytics ----
export function useAgingReport() {
  return useQuery<AgingBucket[]>({
    queryKey: [REPORTS, "aging"],
    queryFn: () => api.raw<AgingBucket[]>(`${REPORTS}/aging`),
  });
}

export function useCarrierPerformanceReport() {
  return useQuery<CarrierPerformance[]>({
    queryKey: [REPORTS, "carrier-performance"],
    queryFn: () => api.raw<CarrierPerformance[]>(`${REPORTS}/carrier-performance`),
  });
}
