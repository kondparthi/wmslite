/**
 * Hooks for the Inventory tabs that have side effects beyond plain CRUD —
 * an adjustment changes on_hand, a transfer moves qty between two
 * locations, a hold reserves qty out of what's available. These call the
 * backend's bespoke /inventory-transactions and /inventory-holds action
 * routes (see api.raw) rather than the generic Master Data list/create
 * hooks used elsewhere.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface InventoryTransaction {
  id: number;
  txn_type: string;
  material_id: number;
  location_id: number;
  to_location_id: number | null;
  qty: number;
  reason: string | null;
  reference: string | null;
  status: string;
  created_at: string;
}

export interface InventoryHold {
  id: number;
  material_id: number;
  location_id: number;
  qty: number;
  reason: string | null;
  status: string;
  created_at: string;
  released_at: string | null;
}

const invalidateInventory = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["/operations/inventory-transactions"] });
  qc.invalidateQueries({ queryKey: ["/operations/inventory-holds"] });
  qc.invalidateQueries({ queryKey: ["/operations/inventory-balances"] });
};

export function useInventoryTransactions(txnType?: string) {
  const qs = txnType ? `?txn_type=${encodeURIComponent(txnType)}` : "";
  return useQuery<InventoryTransaction[]>({
    queryKey: ["/operations/inventory-transactions", txnType ?? "all"],
    queryFn: () => api.raw<InventoryTransaction[]>(`/operations/inventory-transactions/${qs}`),
  });
}

export function useAdjustInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { material_id: number; location_id: number; qty: number; reason?: string; reference?: string }) =>
      api.raw<InventoryTransaction>("/operations/inventory-transactions/adjust", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => invalidateInventory(qc),
  });
}

export function useTransferInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { material_id: number; from_location_id: number; to_location_id: number; qty: number; reference?: string; immediate?: boolean }) =>
      api.raw<InventoryTransaction>("/operations/inventory-transactions/transfer", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => invalidateInventory(qc),
  });
}

export function useCompleteTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<InventoryTransaction>(`/operations/inventory-transactions/${id}/complete`, { method: "PATCH" }),
    onSuccess: () => invalidateInventory(qc),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<void>(`/operations/inventory-transactions/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateInventory(qc),
  });
}

export function useInventoryHolds() {
  return useQuery<InventoryHold[]>({
    queryKey: ["/operations/inventory-holds"],
    queryFn: () => api.raw<InventoryHold[]>("/operations/inventory-holds/"),
  });
}

export function usePlaceHold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { material_id: number; location_id: number; qty: number; reason?: string }) =>
      api.raw<InventoryHold>("/operations/inventory-holds/", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => invalidateInventory(qc),
  });
}

export function useReleaseHold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<InventoryHold>(`/operations/inventory-holds/${id}/release`, { method: "PATCH" }),
    onSuccess: () => invalidateInventory(qc),
  });
}
