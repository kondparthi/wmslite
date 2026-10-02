import React, { useMemo, useState } from "react";
import { AlertTriangle, Clock, PackageX, ChevronRight } from "lucide-react";
import { useMasterDataList } from "@/hooks/useMasterDataApi";

// Real alerts, computed client-side from data already fetched elsewhere in
// the app — no new backend endpoint needed:
//  - "ASN Overdue": ASNs whose expected_date has passed and aren't
//    Received/Closed yet (or are already flagged status="Overdue").
//  - "Low Stock": materials whose total on-hand (summed across locations)
//    is at or below their Master Data reorder point.
// A "Dock Door Blocked" style alert isn't included — that needs Yard
// Management, which isn't built yet.

interface AsnRecord { id: number; asn_number: string; expected_date: string | null; status: string; }
interface MaterialRecord { id: number; sku: string; reorder_point: number | null; status: string; }
interface BalanceRecord { material_id: number; on_hand: number; }

type Alert = {
  key: string;
  icon: typeof Clock;
  severity: "High" | "Medium";
  severityClass: string;
  title: string;
  desc: string;
};

const hoursLate = (expected: string) => {
  const ms = Date.now() - new Date(expected).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
};

const AlertBanner = () => {
  const { data: asns = [] } = useMasterDataList<AsnRecord>("/operations/asns");
  const { data: materials = [] } = useMasterDataList<MaterialRecord>("/master-data/materials");
  const { data: balances = [] } = useMasterDataList<BalanceRecord>("/operations/inventory-balances");
  const [dismissed, setDismissed] = useState<string[]>([]);

  const alerts: Alert[] = useMemo(() => {
    const list: Alert[] = [];

    asns
      .filter(a => a.status !== "Closed" && a.status !== "Received" && a.expected_date && new Date(a.expected_date) < new Date())
      .forEach(a => {
        list.push({
          key: `asn-${a.id}`,
          icon: Clock,
          severity: "High",
          severityClass: "bg-red-100 text-red-700",
          title: "ASN Overdue",
          desc: `${a.asn_number} expected ${new Date(a.expected_date as string).toLocaleString()} — now ${hoursLate(a.expected_date as string)} late`,
        });
      });

    const onHandByMaterial = new Map<number, number>();
    balances.forEach(b => onHandByMaterial.set(b.material_id, (onHandByMaterial.get(b.material_id) || 0) + b.on_hand));
    materials
      .filter(m => m.status === "Active" && m.reorder_point != null && (onHandByMaterial.get(m.id) ?? 0) <= (m.reorder_point as number))
      .forEach(m => {
        list.push({
          key: `stock-${m.id}`,
          icon: PackageX,
          severity: "Medium",
          severityClass: "bg-amber-100 text-amber-700",
          title: "Low Stock Alert",
          desc: `${m.sku} — only ${onHandByMaterial.get(m.id) ?? 0} units remaining, below reorder point (${m.reorder_point})`,
        });
      });

    return list;
  }, [asns, materials, balances]);

  const visible = alerts.filter(a => !dismissed.includes(a.key));
  if (visible.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-red-50 to-amber-50 border border-red-200 rounded-2xl px-5 py-4" id="alert-banner">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <span className="text-sm font-semibold text-red-800">
            {visible.length} Active Alert{visible.length > 1 ? "s" : ""} Require Attention
          </span>
          <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-medium">{visible.length}</span>
        </div>
        <span className="text-xs text-red-600 flex items-center gap-1 font-medium">
          Live <ChevronRight className="w-3 h-3" />
        </span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        {visible.slice(0, 4).map((alert) => {
          const Icon = alert.icon;
          return (
            <div key={alert.key} className="flex-1 bg-white border border-red-100 rounded-xl px-3 py-2.5 flex items-start gap-2.5 group">
              <div className="w-6 h-6 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-xs font-semibold text-neutral-800">{alert.title}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${alert.severityClass}`}>{alert.severity}</span>
                </div>
                <p className="text-xs text-neutral-500 leading-tight">{alert.desc}</p>
              </div>
              <button
                onClick={() => setDismissed((p) => [...p, alert.key])}
                className="text-neutral-300 hover:text-neutral-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertBanner;
