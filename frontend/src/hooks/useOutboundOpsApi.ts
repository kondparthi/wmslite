/**
 * Bespoke hooks for Outbound's stock-moving / lifecycle-advancing actions —
 * generic CRUD (Allocation Strategies, Waves' plain field edits, Outbound
 * Tasks, Outbound Appointments) goes through useMasterDataList/Create/
 * Update/Delete instead. See app/routers/outbound_ops.py for the backend
 * side of each of these.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ShipmentOrder {
  id: number;
  order_number: string;
  ship_to_id: number | null;
  carrier_id: number | null;
  priority: string;
  required_date: string | null;
  notes: string | null;
  wave_id: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface ShipmentOrderLine {
  id: number;
  order_id: number;
  material_id: number;
  qty_ordered: number;
  qty_allocated: number;
  qty_picked: number;
}
export interface OutboundAllocation {
  id: number;
  order_line_id: number;
  material_id: number;
  location_id: number;
  qty: number;
  status: string;
  created_at: string;
}
export interface PickTask {
  id: number;
  allocation_id: number;
  wave_id: number | null;
  assignee: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}
export interface LoadTask {
  id: number;
  load_number: string;
  carrier_id: number | null;
  dock_door: string | null;
  eta: string | null;
  status: string;
  created_at: string;
}
export interface PackTask {
  id: number;
  pack_number: string;
  order_id: number;
  station: string | null;
  packer: string | null;
  qty_items: number;
  qty_packed: number;
  status: string;
  created_at: string;
}
export interface Shipment {
  id: number;
  ship_number: string;
  order_id: number;
  carrier_id: number | null;
  manifest_number: string | null;
  manifest_id: number | null;
  weight: number | null;
  status: string;
  dispatched_at: string | null;
  created_at: string;
  // Shipping Execution fields (app/routers/shipping_ops.py) on this same row.
  tracking_no: string | null;
  label_printed: boolean;
  service: string | null;
  pkgs: number;
  eta: string | null;
}

const invalidateOutbound = (qc: ReturnType<typeof useQueryClient>) => {
  ["outbound-orders", "outbound-order-lines", "outbound-allocations", "outbound-waves", "pick-tasks",
    "load-tasks", "pack-tasks", "shipments", "inventory-balances", "inventory-transactions"]
    .forEach((k) => qc.invalidateQueries({ queryKey: [`/operations/${k}`] }));
};

// ---- Orders + lines ----
export function useOutboundOrders(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return useQuery<ShipmentOrder[]>({
    queryKey: ["/operations/outbound-orders", status ?? "all"],
    queryFn: () => api.raw<ShipmentOrder[]>(`/operations/outbound-orders/${qs}`),
  });
}
export function useOutboundOrderLines(orderId?: number) {
  const qs = orderId ? `?order_id=${orderId}` : "";
  return useQuery<ShipmentOrderLine[]>({
    queryKey: ["/operations/outbound-order-lines", orderId ?? "all"],
    queryFn: () => api.raw<ShipmentOrderLine[]>(`/operations/outbound-order-lines/${qs}`),
  });
}
export function useCreateOutboundOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => api.raw<ShipmentOrder>("/operations/outbound-orders/", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => invalidateOutbound(qc),
  });
}
export function useUpdateOutboundOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      api.raw<ShipmentOrder>(`/operations/outbound-orders/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => invalidateOutbound(qc),
  });
}
export function useDeleteOutboundOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<void>(`/operations/outbound-orders/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateOutbound(qc),
  });
}

// ---- Allocation ----
export function useOutboundAllocations(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return useQuery<OutboundAllocation[]>({
    queryKey: ["/operations/outbound-allocations", status ?? "all"],
    queryFn: () => api.raw<OutboundAllocation[]>(`/operations/outbound-allocations/${qs}`),
  });
}
export function useAllocateLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { order_line_id: number; qty?: number }) =>
      api.raw<OutboundAllocation[]>("/operations/outbound-allocations/allocate", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => invalidateOutbound(qc),
  });
}
export function useAutoAllocateAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.raw<{ allocations_created: number }>("/operations/outbound-allocations/auto-allocate-all", { method: "POST" }),
    onSuccess: () => invalidateOutbound(qc),
  });
}
export function useUnallocate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<void>(`/operations/outbound-allocations/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateOutbound(qc),
  });
}

// ---- Waves ----
export function useCreateWave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => api.raw<any>("/operations/outbound-waves/", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => invalidateOutbound(qc),
  });
}

// ---- Pick Tasks ----
export function usePickTasks(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return useQuery<PickTask[]>({
    queryKey: ["/operations/pick-tasks", status ?? "all"],
    queryFn: () => api.raw<PickTask[]>(`/operations/pick-tasks/${qs}`),
  });
}
export function useAssignPicker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignee }: { id: number; assignee: string }) =>
      api.raw<PickTask>(`/operations/pick-tasks/${id}/assign`, { method: "PATCH", body: JSON.stringify({ assignee }) }),
    onSuccess: () => invalidateOutbound(qc),
  });
}
export function useConfirmPick() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<PickTask>(`/operations/pick-tasks/${id}/confirm`, { method: "PATCH" }),
    onSuccess: () => invalidateOutbound(qc),
  });
}

// ---- Load Tasks ----
export function useLoadTasks() {
  return useQuery<LoadTask[]>({ queryKey: ["/operations/load-tasks"], queryFn: () => api.raw<LoadTask[]>("/operations/load-tasks/") });
}
export function useCreateLoadTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => api.raw<LoadTask>("/operations/load-tasks/", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => invalidateOutbound(qc),
  });
}
export function useUpdateLoadTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      api.raw<LoadTask>(`/operations/load-tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => invalidateOutbound(qc),
  });
}
export function useDeleteLoadTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<void>(`/operations/load-tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateOutbound(qc),
  });
}

// ---- Pack Tasks ----
export function usePackTasks() {
  return useQuery<PackTask[]>({ queryKey: ["/operations/pack-tasks"], queryFn: () => api.raw<PackTask[]>("/operations/pack-tasks/") });
}
export function useCreatePackTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { order_id: number; station?: string; packer?: string }) =>
      api.raw<PackTask>("/operations/pack-tasks/", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => invalidateOutbound(qc),
  });
}
export function useStartPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<PackTask>(`/operations/pack-tasks/${id}/start`, { method: "PATCH" }),
    onSuccess: () => invalidateOutbound(qc),
  });
}
export function useCompletePack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<PackTask>(`/operations/pack-tasks/${id}/complete`, { method: "PATCH" }),
    onSuccess: () => invalidateOutbound(qc),
  });
}

// ---- Shipments ----
export function useShipments() {
  return useQuery<Shipment[]>({ queryKey: ["/operations/shipments"], queryFn: () => api.raw<Shipment[]>("/operations/shipments/") });
}
export function useCreateShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { order_id: number; carrier_id?: number; manifest_number?: string; weight?: number }) =>
      api.raw<Shipment>("/operations/shipments/", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => invalidateOutbound(qc),
  });
}
export function useDispatchShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<Shipment>(`/operations/shipments/${id}/dispatch`, { method: "PATCH" }),
    onSuccess: () => invalidateOutbound(qc),
  });
}
export function useDispatchByCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.raw<Shipment>("/operations/shipments/dispatch-by-code", { method: "POST", body: JSON.stringify({ code }) }),
    onSuccess: () => invalidateOutbound(qc),
  });
}
