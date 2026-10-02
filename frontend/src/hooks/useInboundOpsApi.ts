/**
 * Hooks for Inbound's bespoke receipt/putaway workflow — creating a receipt
 * auto-creates a putaway task, and confirming that task applies quantity to
 * Inventory's balances/ledger (see app/routers/inbound_ops.py). Putaway
 * Strategy, Inbound Appointment and Inbound Task are plain CRUD and use the
 * generic Master Data hooks instead (see their section components).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface InboundReceipt {
  id: number;
  asn_id: number | null;
  material_id: number;
  lpn: string | null;
  qty: number;
  condition: string;
  received_by: string | null;
  created_at: string;
}

export interface PutawayTask {
  id: number;
  receipt_id: number | null;
  material_id: number;
  qty: number;
  suggested_location_id: number | null;
  confirmed_location_id: number | null;
  priority: string;
  assignee: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

const invalidateInbound = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["/operations/inbound-receipts"] });
  qc.invalidateQueries({ queryKey: ["/operations/putaway-tasks"] });
  qc.invalidateQueries({ queryKey: ["/operations/inventory-transactions"] });
  qc.invalidateQueries({ queryKey: ["/operations/inventory-balances"] });
};

export function useInboundReceipts(asnId?: number) {
  const qs = asnId ? `?asn_id=${asnId}` : "";
  return useQuery<InboundReceipt[]>({
    queryKey: ["/operations/inbound-receipts", asnId ?? "all"],
    queryFn: () => api.raw<InboundReceipt[]>(`/operations/inbound-receipts/${qs}`),
  });
}

export function useCreateReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { asn_id?: number | null; material_id: number; lpn?: string; qty: number; condition?: string; received_by?: string }) =>
      api.raw<InboundReceipt>("/operations/inbound-receipts/", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => invalidateInbound(qc),
  });
}

export function useDeleteReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<void>(`/operations/inbound-receipts/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateInbound(qc),
  });
}

export function usePutawayTasks(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return useQuery<PutawayTask[]>({
    queryKey: ["/operations/putaway-tasks", status ?? "all"],
    queryFn: () => api.raw<PutawayTask[]>(`/operations/putaway-tasks/${qs}`),
  });
}

export function useStartPutawayTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<PutawayTask>(`/operations/putaway-tasks/${id}/start`, { method: "PATCH" }),
    onSuccess: () => invalidateInbound(qc),
  });
}

export function useConfirmPutawayTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, location_id }: { id: number; location_id: number }) =>
      api.raw<PutawayTask>(`/operations/putaway-tasks/${id}/confirm`, { method: "PATCH", body: JSON.stringify({ location_id }) }),
    onSuccess: () => invalidateInbound(qc),
  });
}
