/**
 * Customer Master, Rate Cards, Charge Rules and Storage Billing are plain
 * generic CRUD on the backend (no side effects), so those use the same
 * thin-wrapper pattern as useLaborOpsApi.ts. Transactional Charges and
 * Invoices are bespoke — a charge's total is computed server-side at
 * creation, and "Generate Batch" rolls open charges up into new invoices —
 * so those get their own hooks calling api.raw directly, same pattern as
 * useOutboundOpsApi.ts's useAutoAllocateAll / useConfirmPick.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMasterDataList, useMasterDataCreate, useMasterDataUpdate, useMasterDataDelete } from "@/hooks/useMasterDataApi";

export interface BillingCustomer {
  id: number;
  customer_code: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  billing_cycle: string;
  currency: string;
  payment_terms_days: number;
  tax_id: string | null;
  invoice_delivery: string;
  contract_type: string;
  rate_card_id: number | null;
  contract_start: string | null;
  contract_end: string | null;
  auto_renew: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface RateCard {
  id: number;
  rate_card_code: string;
  name: string;
  category: string;
  rate: number;
  unit_of_measure: string | null;
  min_qty: number;
  applicable_scope: string;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ChargeRule {
  id: number;
  rule_code: string;
  name: string;
  trigger_event: string;
  calc_basis: string;
  rate_amount: number;
  rate_card_id: number | null;
  customer_id: number | null;
  priority: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface StorageBillingRecord {
  id: number;
  customer_id: number;
  zone: string | null;
  pallets: number;
  days: number;
  rate_card_id: number | null;
  rate: number;
  period_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionalCharge {
  id: number;
  txn_code: string;
  customer_id: number;
  category: string;
  activity: string;
  qty: number;
  unit: string | null;
  rate: number;
  total: number;
  linked_reference: string | null;
  charge_rule_id: number | null;
  invoice_id: number | null;
  occurred_at: string;
  created_at: string;
}

export interface InvoiceLine {
  id: number;
  invoice_id: number;
  description: string;
  qty: number;
  amount: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  period_label: string | null;
  issued_date: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  lines: InvoiceLine[];
}

const CUSTOMERS = "/operations/billing-customers";
const RATE_CARDS = "/operations/billing-rate-cards";
const CHARGE_RULES = "/operations/billing-charge-rules";
const STORAGE_RECORDS = "/operations/billing-storage-records";

// ---- Generic CRUD ----
export const useBillingCustomers = () => useMasterDataList<BillingCustomer>(CUSTOMERS);
export const useCreateBillingCustomer = () => useMasterDataCreate<BillingCustomer>(CUSTOMERS);
export const useUpdateBillingCustomer = () => useMasterDataUpdate<BillingCustomer>(CUSTOMERS);
export const useDeleteBillingCustomer = () => useMasterDataDelete(CUSTOMERS);

export const useRateCards = () => useMasterDataList<RateCard>(RATE_CARDS);
export const useCreateRateCard = () => useMasterDataCreate<RateCard>(RATE_CARDS);
export const useUpdateRateCard = () => useMasterDataUpdate<RateCard>(RATE_CARDS);
export const useDeleteRateCard = () => useMasterDataDelete(RATE_CARDS);

export const useChargeRules = () => useMasterDataList<ChargeRule>(CHARGE_RULES);
export const useCreateChargeRule = () => useMasterDataCreate<ChargeRule>(CHARGE_RULES);
export const useUpdateChargeRule = () => useMasterDataUpdate<ChargeRule>(CHARGE_RULES);
export const useDeleteChargeRule = () => useMasterDataDelete(CHARGE_RULES);

export const useStorageRecords = () => useMasterDataList<StorageBillingRecord>(STORAGE_RECORDS);
export const useCreateStorageRecord = () => useMasterDataCreate<StorageBillingRecord>(STORAGE_RECORDS);
export const useUpdateStorageRecord = () => useMasterDataUpdate<StorageBillingRecord>(STORAGE_RECORDS);
export const useDeleteStorageRecord = () => useMasterDataDelete(STORAGE_RECORDS);

// ---- Transactional Charges (bespoke: server computes total, tracks invoiced state) ----
export function useTransactionalCharges(params?: { customer_id?: number; invoiced?: boolean }) {
  const qs = params
    ? "?" + new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
      ).toString()
    : "";
  return useQuery<TransactionalCharge[]>({
    queryKey: ["/operations/billing-charges", params],
    queryFn: () => api.raw<TransactionalCharge[]>(`/operations/billing-charges/${qs}`),
  });
}

export function useCreateTransactionalCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      api.raw<TransactionalCharge>("/operations/billing-charges/", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/operations/billing-charges"] }),
  });
}

export function useDeleteTransactionalCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<void>(`/operations/billing-charges/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/operations/billing-charges"] }),
  });
}

// ---- Invoices (bespoke: Generate Batch rolls up open charges) ----
export function useInvoices(params?: { customer_id?: number; status?: string }) {
  const qs = params
    ? "?" + new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
      ).toString()
    : "";
  return useQuery<Invoice[]>({
    queryKey: ["/operations/billing-invoices", params],
    queryFn: () => api.raw<Invoice[]>(`/operations/billing-invoices/${qs}`),
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      api.raw<Invoice>(`/operations/billing-invoices/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/operations/billing-invoices"] });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<void>(`/operations/billing-invoices/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/operations/billing-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/operations/billing-charges"] });
    },
  });
}

export function useGenerateInvoiceBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { customer_ids?: number[]; period_label: string; issued_date?: string; due_date?: string }) =>
      api.raw<Invoice[]>("/operations/billing-invoices/generate-batch", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/operations/billing-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/operations/billing-charges"] });
    },
  });
}
