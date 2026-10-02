/**
 * Returns / RMA's 6 tabs. RMARequest, InspectionRecord and Disposition are
 * new entities (see app/models/returns_ops.py); the Inventory Adjustment
 * tab reuses Inventory's existing InventoryTransaction ledger directly —
 * "posting" a disposition is a real InventoryBalance-moving transaction,
 * not a separate mocked-up row.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface RMARequest {
  id: number;
  rma_number: string;
  order_reference: string | null;
  customer: string;
  material_id: number;
  sku: string;
  description: string;
  qty: number;
  reason: string;
  return_type: string;
  priority: string;
  assignee: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  received_at: string | null;
  closed_at: string | null;
}

export interface InspectionRecord {
  id: number;
  inspection_number: string;
  rma_id: number;
  rma_number: string;
  sku: string;
  description: string;
  qty_received: number;
  qty_inspected: number;
  grade: string | null;
  inspector: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  inspected_at: string | null;
}

export interface Disposition {
  id: number;
  disposition_number: string;
  rma_id: number;
  rma_number: string;
  inspection_id: number | null;
  material_id: number;
  sku: string;
  description: string;
  qty: number;
  action: string;
  target_location_code: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  posted_txn_id: number | null;
}

export interface ReturnsReasonBucket {
  reason: string;
  count: number;
}

export interface ReturnsMonthlyTrend {
  month: string;
  returns: number;
  processed: number;
}

export interface ReturnsReportSummary {
  returns_rate_pct: number;
  avg_processing_hours: number;
  recovery_rate_pct: number;
  open_rmas: number;
  closed_rmas: number;
  reason_breakdown: ReturnsReasonBucket[];
  monthly_trend: ReturnsMonthlyTrend[];
}

const RMA = "/operations/returns-rma";
const INSPECTIONS = "/operations/returns-inspections";
const DISPOSITIONS = "/operations/returns-dispositions";
const ADJUSTMENTS = "/operations/returns-adjustments";
const REPORTS = "/operations/returns-reports";

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [RMA] });
  qc.invalidateQueries({ queryKey: [INSPECTIONS] });
  qc.invalidateQueries({ queryKey: [DISPOSITIONS] });
  qc.invalidateQueries({ queryKey: [ADJUSTMENTS] });
  qc.invalidateQueries({ queryKey: [REPORTS] });
}

// ---- RMA Requests ----
export function useRMARequests() {
  return useQuery<RMARequest[]>({
    queryKey: [RMA],
    queryFn: () => api.raw<RMARequest[]>(`${RMA}/`),
  });
}

export interface CreateRMAPayload {
  order_reference?: string | null;
  customer: string;
  material_id: number;
  qty: number;
  reason: string;
  return_type: string;
  priority: string;
  assignee?: string | null;
}

export function useCreateRMA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRMAPayload) => api.raw<RMARequest>(`${RMA}/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RMA] }),
  });
}

export function useUpdateRMA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateRMAPayload> }) =>
      api.raw<RMARequest>(`${RMA}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RMA] }),
  });
}

export function useTransitionRMA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "ship" | "receive" }) =>
      api.raw<RMARequest>(`${RMA}/${id}/${action}`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RMA] }),
  });
}

// ---- Inspection & Grading ----
export function useInspections() {
  return useQuery<InspectionRecord[]>({
    queryKey: [INSPECTIONS],
    queryFn: () => api.raw<InspectionRecord[]>(`${INSPECTIONS}/`),
  });
}

export function useCreateInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { rma_id: number; qty_received: number; inspector?: string }) =>
      api.raw<InspectionRecord>(`${INSPECTIONS}/`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INSPECTIONS] });
      qc.invalidateQueries({ queryKey: [RMA] });
    },
  });
}

export function useGradeInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { qty_inspected: number; grade: string; notes?: string; inspector?: string } }) =>
      api.raw<InspectionRecord>(`${INSPECTIONS}/${id}/grade`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [INSPECTIONS] }),
  });
}

export function useApproveInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<InspectionRecord>(`${INSPECTIONS}/${id}/approve`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INSPECTIONS] });
      qc.invalidateQueries({ queryKey: [DISPOSITIONS] });
    },
  });
}

// ---- Disposition ----
export function useDispositions() {
  return useQuery<Disposition[]>({
    queryKey: [DISPOSITIONS],
    queryFn: () => api.raw<Disposition[]>(`${DISPOSITIONS}/`),
  });
}

export function useSetDispositionAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      api.raw<Disposition>(`${DISPOSITIONS}/${id}/action`, { method: "PATCH", body: JSON.stringify({ action }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [DISPOSITIONS] }),
  });
}

export function useCompleteDisposition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<Disposition>(`${DISPOSITIONS}/${id}/complete`, { method: "PATCH" }),
    onSuccess: () => invalidateAll(qc),
  });
}

// ---- Inventory Adjustment (real InventoryTransaction ledger) ----
export function usePendingAdjustments() {
  return useQuery<Disposition[]>({
    queryKey: [ADJUSTMENTS],
    queryFn: () => api.raw<Disposition[]>(`${ADJUSTMENTS}/`),
  });
}

export function usePostAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<Disposition>(`${ADJUSTMENTS}/${id}/post`, { method: "PATCH" }),
    onSuccess: () => invalidateAll(qc),
  });
}

// ---- Reports & Analytics ----
export function useReturnsReportSummary() {
  return useQuery<ReturnsReportSummary>({
    queryKey: [REPORTS, "summary"],
    queryFn: () => api.raw<ReturnsReportSummary>(`${REPORTS}/summary`),
  });
}
