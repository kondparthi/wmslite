import React from "react";
import { TrendingUp, Package, Truck, Warehouse, AlertTriangle, Loader2 } from "lucide-react";
import { useDashboardSummary } from "@/hooks/useDashboardApi";

const KpiStatsGrid = () => {
  // Real aggregate counts from the backend (Master Data + Inventory + Inbound)
  // — replaces this card row's original hardcoded mock numbers.
  const { data: s, isLoading } = useDashboardSummary();

  const kpis = [
    {
      label: "Total Receipts (ASN)",
      value: isLoading ? "…" : String(s?.total_receipts ?? 0),
      badge: "Received",
      trend: `${s?.pending_putaway ?? 0} pending putaway`,
      trendUp: true,
      sub: "advance shipment notices",
      icon: Truck,
      color: "bg-blue-600",
      lightColor: "bg-blue-50",
      textColor: "text-blue-600",
      borderColor: "border-blue-100",
    },
    {
      label: "Pending Putaway",
      value: isLoading ? "…" : String(s?.pending_putaway ?? 0),
      badge: "Pending",
      trend: `${s?.low_stock_count ?? 0} low-stock SKUs`,
      trendUp: false,
      sub: "ASNs received, not yet put away",
      icon: AlertTriangle,
      color: "bg-amber-500",
      lightColor: "bg-amber-50",
      textColor: "text-amber-600",
      borderColor: "border-amber-100",
    },
    {
      label: "Open Purchase Orders",
      value: isLoading ? "…" : String(s?.open_purchase_orders ?? 0),
      badge: "Open",
      trend: `${s?.total_skus ?? 0} SKUs in catalog`,
      trendUp: true,
      sub: "awaiting receipt",
      icon: Package,
      color: "bg-violet-600",
      lightColor: "bg-violet-50",
      textColor: "text-violet-600",
      borderColor: "border-violet-100",
    },
    {
      label: "Warehouse Utilization",
      value: isLoading ? "…" : String(s?.warehouse_utilization_pct ?? 0),
      unit: "%",
      badge: "Capacity",
      trend: `${s?.occupied_locations ?? 0} / ${s?.total_locations ?? 0}`,
      trendUp: true,
      sub: "locations occupied",
      icon: Warehouse,
      color: "bg-emerald-600",
      lightColor: "bg-emerald-50",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-100",
      progress: s?.warehouse_utilization_pct ?? 0,
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" id="kpi-section">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.label}
            className={`bg-white rounded-2xl border ${kpi.borderColor} p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow duration-200`}
          >
            <div className="flex items-start justify-between">
              <div className={`w-11 h-11 ${kpi.lightColor} rounded-xl flex items-center justify-center`}>
                {isLoading ? <Loader2 className={`${kpi.textColor} w-5 h-5 animate-spin`} /> : <Icon className={`${kpi.textColor} w-5 h-5`} />}
              </div>
              <span className={`text-xs font-medium ${kpi.textColor} ${kpi.lightColor} px-2.5 py-1 rounded-full`}>
                {kpi.badge}
              </span>
            </div>

            <div>
              <p className="text-3xl font-bold text-neutral-900 tracking-tight">
                {kpi.value}{kpi.unit && <span className="text-xl text-neutral-500">{kpi.unit}</span>}
              </p>
              <p className="text-sm text-neutral-500 mt-0.5">{kpi.label}</p>
            </div>

            {kpi.progress !== undefined ? (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`${kpi.textColor} font-medium`}>{kpi.trend}</span>
                  <span className="text-neutral-400">{kpi.sub}</span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2">
                  <div
                    className={`${kpi.color} h-2 rounded-full transition-all duration-700`}
                    style={{ width: `${kpi.progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {kpi.trendUp ? (
                  <TrendingUp className={`${kpi.textColor} w-3.5 h-3.5`} />
                ) : (
                  <AlertTriangle className="text-amber-500 w-3.5 h-3.5" />
                )}
                <span className={`text-xs font-medium ${kpi.trendUp ? kpi.textColor : "text-amber-600"}`}>
                  {kpi.trend}
                </span>
                <span className="text-xs text-neutral-400">{kpi.sub}</span>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
};

export default KpiStatsGrid;
