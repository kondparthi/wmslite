/**
 * Inbound's Label Generation tab — print/reprint receiving and putaway
 * labels. Real InboundReceipt/PutawayTask data, joined with material and
 * location codes server-side (see app/routers/label_ops.py). The print
 * mutation returns the real barcode payload (symbology/fields come from
 * the active Admin Config Bar Code Config for this label type), which the
 * section component renders with jsbarcode.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ReceivingLabelRow {
  id: number;
  lpn: string | null;
  material_id: number;
  material_code: string;
  material_name: string;
  qty: number;
  uom: string;
  condition: string;
  received_by: string | null;
  created_at: string;
  label_printed: boolean;
  print_count: number;
}

export interface PutawayLabelRow {
  id: number;
  receipt_id: number | null;
  material_id: number;
  material_code: string;
  material_name: string;
  qty: number;
  uom: string;
  destination_location_code: string | null;
  status: string;
  created_at: string;
  label_printed: boolean;
  print_count: number;
}

export interface LabelPrintResult {
  barcode_value: string;
  symbology: string;
  fields_included: string[];
  label_width_mm: number;
  label_height_mm: number;
  print_count: number;
  fields: Record<string, string | null>;
}

const RECEIVING_LABELS = "/operations/receiving-labels";
const PUTAWAY_LABELS = "/operations/putaway-labels";

export function useReceivingLabels() {
  return useQuery<ReceivingLabelRow[]>({
    queryKey: [RECEIVING_LABELS],
    queryFn: () => api.raw<ReceivingLabelRow[]>(`${RECEIVING_LABELS}/`),
  });
}

export function usePrintReceivingLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<LabelPrintResult>(`${RECEIVING_LABELS}/${id}/print`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RECEIVING_LABELS] }),
  });
}

export function usePutawayLabels() {
  return useQuery<PutawayLabelRow[]>({
    queryKey: [PUTAWAY_LABELS],
    queryFn: () => api.raw<PutawayLabelRow[]>(`${PUTAWAY_LABELS}/`),
  });
}

export function usePrintPutawayLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<LabelPrintResult>(`${PUTAWAY_LABELS}/${id}/print`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PUTAWAY_LABELS] }),
  });
}
