/**
 * Shipping Execution reuses two entities other modules already own rather
 * than forking copies: Master Data's Carrier row (extended here with
 * integration fields) and Outbound's Shipment row (see useOutboundOpsApi.ts
 * for the base Shipment type/hooks — this file only adds label/manifest
 * actions on top of it). Manifests and Carrier Rates are genuinely new
 * entities and get their own hooks. See app/routers/shipping_ops.py.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMasterDataList, useMasterDataCreate, useMasterDataUpdate } from "@/hooks/useMasterDataApi";

export interface ShippingCarrier {
  id: number;
  code: string;
  scac: string | null;
  name: string;
  mode: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  status: string;
  api_status: string;
  account_no: string | null;
  label_format: string | null;
  tracking_url_template: string | null;
  services: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Manifest {
  id: number;
  manifest_number: string;
  carrier_id: number;
  status: string;
  created_at: string;
  closed_at: string | null;
  shipment_count: number;
  total_packages: number;
  total_weight: number;
}

export interface CarrierRate {
  id: number;
  carrier_id: number;
  service: string;
  base_rate: number;
  per_kg_rate: number;
  transit_days: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RateQuote {
  carrier_id: number;
  carrier_name: string;
  service: string;
  transit_days: string | null;
  rate: number;
  recommended: boolean;
}

const CARRIERS = "/master-data/carriers";
const CARRIER_RATES = "/operations/shipping-carrier-rates";

// ---- Carriers (Master Data entity, extended with integration fields) ----
export const useShippingCarriers = () => useMasterDataList<ShippingCarrier>(CARRIERS);
export const useCreateShippingCarrier = () => useMasterDataCreate<ShippingCarrier>(CARRIERS);
export const useUpdateShippingCarrier = () => useMasterDataUpdate<ShippingCarrier>(CARRIERS);

// ---- Carrier Rates (generic CRUD) ----
export const useCarrierRates = () => useMasterDataList<CarrierRate>(CARRIER_RATES);
export const useCreateCarrierRate = () => useMasterDataCreate<CarrierRate>(CARRIER_RATES);
export const useUpdateCarrierRate = () => useMasterDataUpdate<CarrierRate>(CARRIER_RATES);

// ---- Manifests (bespoke: totals computed server-side, assign/close workflow) ----
export function useManifests() {
  return useQuery<Manifest[]>({
    queryKey: ["/operations/shipping-manifests"],
    queryFn: () => api.raw<Manifest[]>("/operations/shipping-manifests/"),
  });
}

export function useCreateManifest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { carrier_id: number }) =>
      api.raw<Manifest>("/operations/shipping-manifests/", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/operations/shipping-manifests"] }),
  });
}

export function useAssignToManifest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ manifestId, shipmentIds }: { manifestId: number; shipmentIds: number[] }) =>
      api.raw<Manifest>(`/operations/shipping-manifests/${manifestId}/assign`, { method: "POST", body: JSON.stringify({ shipment_ids: shipmentIds }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/operations/shipping-manifests"] });
      qc.invalidateQueries({ queryKey: ["/operations/shipments"] });
    },
  });
}

export function useCloseManifest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<Manifest>(`/operations/shipping-manifests/${id}/close`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/operations/shipping-manifests"] }),
  });
}

export function useDeleteManifest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.raw<void>(`/operations/shipping-manifests/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/operations/shipping-manifests"] }),
  });
}

// ---- Label printing & manifest assignment on the existing Shipment row ----
export function usePrintLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, service, pkgs }: { id: number; service?: string; pkgs?: number }) =>
      api.raw<any>(`/operations/shipment-execution/${id}/print-label`, { method: "PATCH", body: JSON.stringify({ service, pkgs }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/operations/shipments"] }),
  });
}

// ---- Rate Shopping (real quotes computed server-side from CarrierRate rows) ----
export function useRateShop() {
  return useMutation({
    mutationFn: (payload: { weight: number; service?: string; carrier_id?: number }) =>
      api.raw<RateQuote[]>("/operations/shipment-execution/rate-shop", { method: "POST", body: JSON.stringify(payload) }),
  });
}
