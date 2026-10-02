import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FilePlus, ScanBarcode, PackagePlus, RefreshCw,
  CalendarPlus, Zap, AlertTriangle, Clock, PackageX,
  Package, CheckCircle, Circle,
} from "lucide-react";
import { useMasterDataList } from "@/hooks/useMasterDataApi";

// Quick Actions are plain navigation shortcuts to real pages/tabs — no data
// to fabricate there. The Active Alerts panel mirrors AlertBanner's real
// overdue-ASN / low-stock logic. "Dock Door Status" (the original mock)
// needed Yard Management, which isn't built, so it's replaced with a real
// Open Purchase Orders snapshot instead.

const quickActions = [
  { label: "New ASN", icon: FilePlus, to: "/wms-lite-inbound", color: "bg-blue-600" },
  { label: "Receive Goods", icon: ScanBarcode, to: "/wms-lite-inbound", color: "bg-blue-500" },
  { label: "Putaway Task", icon: PackagePlus, to: "/wms-lite-inbound", color: "bg-violet-600" },
  { label: "Cycle Count", icon: RefreshCw, to: "/wms-lite-inventory", color: "bg-emerald-500" },
  { label: "Appointment", icon: CalendarPlus, to: "/wms-lite-inbound", color: "bg-amber-500" },
  { label: "Dashboard Refresh", icon: Zap, to: "/wms-lite-dashboard", color: "bg-neutral-700" },
];

interface AsnRecord { id: number; asn_number: string; expected_date: string | null; status: string; }
interface MaterialRecord { id: number; sku: string; reorder_point: number | null; status: string; }
interface BalanceRecord { material_id: number; on_hand: number; }
interface PurchaseOrderRecord { id: number; po_number: string; supplier_id: number; expected_date: string | null; qty_ordered: number; qty_received: number; status: string; }
interface SupplierRecord { id: number; name: string; }

const hoursLate = (expected: string) => {
  const ms = Date.now() - new Date(expected).getTime();
  const h = Math.floor(ms / 3_600_000);
  return `${h}h`;
};

const poStatusClass: Record<string, string> = {
  Open: "bg-blue-100 text-blue-700",
  Partial: "bg-amber-100 text-amber-700",
  Closed: "bg-emerald-100 text-emerald-700",
  Overdue: "bg-red-100 text-red-700",
};

const QuickActionsSection = () => {
  const [resolved, setResolved] = useState<string[]>([]);
  const { data: asns = [] } = useMasterDataList<AsnRecord>("/operations/asns");
  const { data: materials = [] } = useMasterDataList<MaterialRecord>("/master-data/materials");
  const { data: balances = [] } = useMasterDataList<BalanceRecord>("/operations/inventory-balances");
  const { data: purchaseOrders = [] } = useMasterDataList<PurchaseOrderRecord>("/operations/purchase-orders");
  const { data: suppliers = [] } = useMasterDataList<SupplierRecord>("/master-data/suppliers");

  const supplierById = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);

  const alerts = useMemo(() => {
    const list: { key: string; icon: typeof Clock; title: string; desc: string; sub: string; level: string; levelClass: string; iconBg: string; iconColor: string }[] = [];

    asns
      .filter(a => a.status !== "Closed" && a.status !== "Received" && a.expected_date && new Date(a.expected_date) < new Date())
      .forEach(a => list.push({
        key: `asn-${a.id}`, icon: Clock,
        title: "ASN Overdue", desc: `${a.asn_number} · Expected ${new Date(a.expected_date as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        sub: `${hoursLate(a.expected_date as string)} overdue`, level: "High", levelClass: "bg-red-100 text-red-700", iconBg: "bg-red-100", iconColor: "text-red-600",
      }));

    const onHandByMaterial = new Map<number, number>();
    balances.forEach(b => onHandByMaterial.set(b.material_id, (onHandByMaterial.get(b.material_id) || 0) + b.on_hand));
    materials
      .filter(m => m.status === "Active" && m.reorder_point != null && (onHandByMaterial.get(m.id) ?? 0) <= (m.reorder_point as number))
      .forEach(m => list.push({
        key: `stock-${m.id}`, icon: PackageX,
        title: "Low Stock Alert", desc: `${m.sku} · Qty ${onHandByMaterial.get(m.id) ?? 0} remaining`,
        sub: "Below reorder point", level: "Med", levelClass: "bg-amber-100 text-amber-700", iconBg: "bg-amber-100", iconColor: "text-amber-600",
      }));

    return list;
  }, [asns, materials, balances]);

  const openPOs = useMemo(
    () => purchaseOrders.filter(p => p.status === "Open" || p.status === "Partial" || p.status === "Overdue").slice(0, 6),
    [purchaseOrders]
  );

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="quick-actions-section">
      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm" id="quick-actions">
        <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <div className="w-6 h-6 bg-neutral-900 rounded-lg flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.label}
                to={a.to}
                className="flex flex-col items-center gap-2 p-3.5 border border-neutral-100 rounded-xl hover:bg-neutral-50 hover:border-neutral-200 transition-all group"
              >
                <div className={`w-10 h-10 ${a.color} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                  <Icon className="text-white w-4.5 h-4.5" size={18} />
                </div>
                <span className="text-xs font-medium text-neutral-600 text-center leading-tight">{a.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Active Alerts */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm" id="alerts-panel">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            </div>
            Active Alerts
          </h2>
          <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-medium">
            {alerts.filter(a => !resolved.includes(a.key)).length}
          </span>
        </div>
        {alerts.length === 0 ? (
          <p className="text-xs text-neutral-400 text-center py-8">No active alerts right now.</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              const isResolved = resolved.includes(alert.key);
              return (
                <div
                  key={alert.key}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${isResolved ? "opacity-40 border-neutral-100 bg-neutral-50" : "border-neutral-100 bg-neutral-50 hover:bg-white hover:border-neutral-200"}`}
                >
                  <div className={`w-8 h-8 ${alert.iconBg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon className={`${alert.iconColor} w-4 h-4`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-xs font-semibold text-neutral-800">{alert.title}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${alert.levelClass}`}>{alert.level}</span>
                    </div>
                    <p className="text-xs text-neutral-500">{alert.desc}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{alert.sub}</p>
                  </div>
                  <button
                    onClick={() => setResolved((p) => isResolved ? p.filter(x => x !== alert.key) : [...p, alert.key])}
                    className="flex-shrink-0 text-neutral-300 hover:text-emerald-500 transition-colors"
                    title={isResolved ? "Unresolve" : "Mark resolved"}
                  >
                    {isResolved ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Open Purchase Orders */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm" id="open-po-panel">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <div className="w-6 h-6 bg-neutral-100 rounded-lg flex items-center justify-center">
              <Package className="w-3.5 h-3.5 text-neutral-700" />
            </div>
            Open Purchase Orders
          </h2>
          <Link to="/wms-lite-master-data" className="text-xs font-medium text-neutral-500 hover:text-neutral-900 border border-neutral-200 rounded-lg px-2.5 py-1 hover:bg-neutral-50 transition-all">
            Manage
          </Link>
        </div>
        {openPOs.length === 0 ? (
          <p className="text-xs text-neutral-400 text-center py-8">No open purchase orders.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {openPOs.map((po) => (
              <div key={po.id} className="p-3 border border-neutral-100 rounded-xl transition-all hover:shadow-sm hover:border-neutral-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-neutral-800 font-mono">{po.po_number}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${poStatusClass[po.status] || "bg-neutral-100 text-neutral-500"}`}>{po.status}</span>
                </div>
                <p className="text-xs text-neutral-600">{supplierById.get(po.supplier_id) || "Supplier"}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{po.qty_received}/{po.qty_ordered} received</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default QuickActionsSection;
