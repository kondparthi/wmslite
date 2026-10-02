import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  History, ChevronRight, ArrowDownToLine, ArrowUpFromLine, Layers,
  TrendingUp, AlertCircle,
} from "lucide-react";
import { useMasterDataList } from "@/hooks/useMasterDataApi";
import { useInventoryTransactions } from "@/hooks/useInventoryOpsApi";
import { useInboundReceipts, usePutawayTasks } from "@/hooks/useInboundOpsApi";
import { useOutboundOrders, usePickTasks, useShipments } from "@/hooks/useOutboundOpsApi";
import { useDashboardSummary } from "@/hooks/useDashboardApi";

interface MaterialRecord { id: number; sku: string; }
interface LocationRecord { id: number; code: string; }
interface AsnRecord { id: number; status: string; }
interface CycleCountPlanRecord { id: number; status: string; }
interface InventoryHoldRecord { id: number; status: string; }
interface AppointmentRecord { id: number; status: string; }
interface OutboundApptRecord { id: number; status: string; }

const typeClass: Record<string, string> = {
  Receipt: "bg-blue-600 text-white",
  Adjustment: "bg-neutral-500 text-white",
  Transfer: "bg-neutral-500 text-white",
  Shipment: "bg-violet-600 text-white",
};
const statusClass: Record<string, string> = {
  Completed: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  "In Transit": "bg-blue-100 text-blue-700",
};

const BottomSection = () => {
  const [filter, setFilter] = useState("All");
  const { data: txns = [], isLoading: loadingTxns } = useInventoryTransactions();
  const { data: materials = [] } = useMasterDataList<MaterialRecord>("/master-data/materials");
  const { data: locations = [] } = useMasterDataList<LocationRecord>("/master-data/locations");

  const { data: asns = [] } = useMasterDataList<AsnRecord>("/operations/asns");
  const { data: receipts = [] } = useInboundReceipts();
  const { data: pendingPutaway = [] } = usePutawayTasks("Pending");
  const { data: appointments = [] } = useMasterDataList<AppointmentRecord>("/operations/inbound-appointments");
  const { data: summary } = useDashboardSummary();
  const { data: holds = [] } = useMasterDataList<InventoryHoldRecord>("/operations/inventory-holds");
  const { data: cyclePlans = [] } = useMasterDataList<CycleCountPlanRecord>("/operations/cycle-count-plans");

  const { data: outboundOrders = [] } = useOutboundOrders();
  const { data: openPickTasks = [] } = usePickTasks();
  const { data: shipments = [] } = useShipments();
  const { data: outboundAppts = [] } = useMasterDataList<OutboundApptRecord>("/operations/outbound-appointments");

  const materialSkuById = useMemo(() => new Map(materials.map(m => [m.id, m.sku])), [materials]);
  const locationCodeById = useMemo(() => new Map(locations.map(l => [l.id, l.code])), [locations]);

  const types = useMemo(() => ["All", ...Array.from(new Set(txns.map(t => t.txn_type)))], [txns]);
  const visibleTxns = (filter === "All" ? txns : txns.filter(t => t.txn_type === filter)).slice(0, 8);

  const isToday = (iso: string) => {
    const d = new Date(iso), n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  };

  const moduleSummaries = [
    {
      label: "Inbound",
      icon: ArrowDownToLine,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      to: "/wms-lite-inbound",
      rows: [
        { label: "Open ASNs", value: String(asns.filter(a => a.status === "Open" || a.status === "In Progress").length) },
        { label: "Receipts Logged", value: `${receipts.length} lines` },
        { label: "Pending Putaway", value: `${pendingPutaway.length} tasks`, warn: pendingPutaway.length > 0 },
        { label: "Appointments", value: `${appointments.length} scheduled` },
      ],
    },
    {
      label: "Outbound",
      icon: ArrowUpFromLine,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      to: "/wms-lite-outbound",
      rows: [
        { label: "Open Orders", value: String(outboundOrders.filter(o => o.status !== "Shipped" && o.status !== "Cancelled").length) },
        { label: "Open Pick Tasks", value: `${openPickTasks.filter(t => t.status !== "Completed").length} tasks`, warn: openPickTasks.filter(t => t.status !== "Completed").length > 0 },
        { label: "Appointments", value: `${outboundAppts.filter(a => a.status !== "Completed" && a.status !== "Cancelled" && a.status !== "No Show").length} scheduled` },
        { label: "Dispatched", value: `${shipments.filter(s => s.status === "Dispatched").length} shipments` },
      ],
    },
    {
      label: "Inventory Health",
      icon: Layers,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      to: "/wms-lite-inventory",
      rows: [
        { label: "Total Locations", value: String(summary?.total_locations ?? 0) },
        { label: "Occupied", value: `${summary?.occupied_locations ?? 0} (${summary?.warehouse_utilization_pct ?? 0}%)` },
        { label: "On Hold", value: `${holds.filter(h => h.status === "Active").length} lots`, warn: holds.filter(h => h.status === "Active").length > 0 },
        { label: "Cycle Counts", value: `${cyclePlans.filter(c => c.status === "Pending").length} pending`, warn: cyclePlans.filter(c => c.status === "Pending").length > 0 },
      ],
    },
  ];

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="bottom-section">
      {/* Recent Transactions */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm" id="recent-transactions">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <div className="w-6 h-6 bg-neutral-100 rounded-lg flex items-center justify-center">
              <History className="w-3.5 h-3.5 text-neutral-700" />
            </div>
            Recent Transactions
          </h2>
          <div className="flex bg-neutral-100 rounded-lg p-0.5 gap-0.5 overflow-x-auto">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all whitespace-nowrap ${filter === t ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="text-left py-2.5 px-2 text-neutral-400 font-medium">Txn ID</th>
                <th className="text-left py-2.5 px-2 text-neutral-400 font-medium">Type</th>
                <th className="text-left py-2.5 px-2 text-neutral-400 font-medium">Reference</th>
                <th className="text-left py-2.5 px-2 text-neutral-400 font-medium">SKU</th>
                <th className="text-left py-2.5 px-2 text-neutral-400 font-medium">Location</th>
                <th className="text-left py-2.5 px-2 text-neutral-400 font-medium">Qty</th>
                <th className="text-left py-2.5 px-2 text-neutral-400 font-medium">Time</th>
                <th className="text-left py-2.5 px-2 text-neutral-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {loadingTxns ? (
                <tr><td colSpan={8} className="text-center py-8 text-neutral-400">Loading…</td></tr>
              ) : visibleTxns.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-neutral-400">No transactions yet.</td></tr>
              ) : visibleTxns.map((tx) => (
                <tr key={tx.id} className="hover:bg-neutral-50 transition-colors group">
                  <td className="py-2.5 px-2 font-mono font-medium text-neutral-800 text-xs">TXN-{tx.id}</td>
                  <td className="py-2.5 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeClass[tx.txn_type] || "bg-neutral-500 text-white"}`}>{tx.txn_type}</span>
                  </td>
                  <td className="py-2.5 px-2 text-neutral-600">{tx.reference || "—"}</td>
                  <td className="py-2.5 px-2 text-neutral-700 font-medium">{materialSkuById.get(tx.material_id) || `#${tx.material_id}`}</td>
                  <td className="py-2.5 px-2 text-neutral-600">{locationCodeById.get(tx.location_id) || `#${tx.location_id}`}</td>
                  <td className={`py-2.5 px-2 font-semibold ${tx.qty < 0 ? "text-red-600" : "text-neutral-900"}`}>{tx.qty > 0 ? `+${tx.qty}` : tx.qty}</td>
                  <td className="py-2.5 px-2 text-neutral-400">{new Date(tx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="py-2.5 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass[tx.status] || "bg-neutral-100 text-neutral-600"}`}>{tx.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
          <p className="text-xs text-neutral-400">Showing {visibleTxns.length} of {txns.length} transactions</p>
          <Link to="/wms-lite-inventory" className="text-xs font-medium text-neutral-700 hover:text-neutral-900 flex items-center gap-1">
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Module Summaries */}
      <div className="space-y-3" id="module-summary">
        {moduleSummaries.map((mod) => {
          const Icon = mod.icon;
          return (
            <div key={mod.label} className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 ${mod.iconBg} rounded-lg flex items-center justify-center`}>
                    <Icon className={`${mod.iconColor} w-3.5 h-3.5`} />
                  </div>
                  <h3 className="text-xs font-semibold text-neutral-900">{mod.label}</h3>
                </div>
                <Link to={mod.to} className="text-xs font-medium text-neutral-400 hover:text-neutral-700 flex items-center gap-0.5">
                  Details <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-1.5">
                {mod.rows.map((row: any) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {(mod as any).placeholder ? <AlertCircle className="w-3 h-3 text-neutral-300" /> : row.warn ? <AlertCircle className="w-3 h-3 text-amber-500" /> : <TrendingUp className="w-3 h-3 text-emerald-500" />}
                      <span className="text-xs text-neutral-500">{row.label}</span>
                    </div>
                    <span className={`text-xs font-semibold ${(mod as any).placeholder ? "text-neutral-400 italic" : "text-neutral-800"}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default BottomSection;
