/**
 * Dashboard summary — a single aggregated object (counts across Master
 * Data, Inventory and Inbound), not a list, so it uses api.raw() instead of
 * the generic Master Data list/create/update/delete hooks.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface DashboardSummary {
  total_receipts: number;
  pending_putaway: number;
  open_purchase_orders: number;
  warehouse_utilization_pct: number;
  occupied_locations: number;
  total_locations: number;
  total_skus: number;
  total_units_on_hand: number;
  low_stock_count: number;
}

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ["/dashboard/summary"],
    queryFn: () => api.raw<DashboardSummary>("/dashboard/summary"),
  });
}

// ── Digital Twin (2D heatmap floor plan) ────────────────────────────────
export interface FloorPlanLocation {
  location_id: number;
  code: string;
  zone_code: string | null;
  zone_type: string | null;
  x: number;
  y: number;
  on_hand_qty: number;
  pending_picks: number;
  occupancy_ratio: number;
}

export function useDigitalTwinFloorPlan() {
  return useQuery<FloorPlanLocation[]>({
    queryKey: ["/operations/digital-twin/floor-plan"],
    queryFn: () => api.raw<FloorPlanLocation[]>("/operations/digital-twin/floor-plan"),
  });
}
