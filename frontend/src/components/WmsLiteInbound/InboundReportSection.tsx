import React, { useMemo } from "react";
import {
  BarChart2, Package, Clock, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useMasterDataList } from "@/hooks/useMasterDataApi";
import { useInboundReceipts } from "@/hooks/useInboundOpsApi";

const BRAND = "#009FE3";

interface AsnRecord { id: number; asn_number: string; supplier_id: number; qty_expected: number; qty_received: number; status: string; expected_date: string | null; lines: number; }
interface LookupRecord { id: number; name: string; }

const statusColor: Record<string, string> = {
  Open: "bg-sky-50 text-sky-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Received: "bg-emerald-50 text-emerald-700",
  Closed: "bg-neutral-100 text-neutral-500",
  Overdue: "bg-red-50 text-red-700",
};
const pieColors: Record<string, string> = { Open: "#F59E0B", "In Progress": "#009FE3", Received: "#10B981", Closed: "#9CA3AF", Overdue: "#EF4444" };

const dayLabel = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short" });

const InboundReportSection = () => {
  const { data: asns = [], isLoading: loadingAsns } = useMasterDataList<AsnRecord>("/operations/asns");
  const { data: suppliers = [] } = useMasterDataList<LookupRecord>("/master-data/suppliers");
  const { data: receipts = [], isLoading: loadingReceipts } = useInboundReceipts();

  const supplierById = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);
  const asnById = useMemo(() => new Map(asns.map(a => [a.id, a])), [asns]);

  const receiptsByDay = useMemo(() => {
    const buckets = new Map<string, number>();
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      buckets.set(dayLabel(d), 0);
    }
    receipts.forEach(r => {
      const label = dayLabel(new Date(r.created_at));
      if (buckets.has(label)) buckets.set(label, (buckets.get(label) || 0) + r.qty);
    });
    return Array.from(buckets.entries()).map(([day, qty]) => ({ day, qty }));
  }, [receipts]);

  const statusPie = useMemo(() => {
    const counts = new Map<string, number>();
    asns.forEach(a => counts.set(a.status, (counts.get(a.status) || 0) + 1));
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [asns]);

  const supplierVolume = useMemo(() => {
    const byQty = new Map<string, number>();
    receipts.forEach(r => {
      const asn = r.asn_id ? asnById.get(r.asn_id) : null;
      const name = asn ? (supplierById.get(asn.supplier_id) || `#${asn.supplier_id}`) : "Direct Receipt";
      byQty.set(name, (byQty.get(name) || 0) + r.qty);
    });
    return Array.from(byQty.entries()).map(([supplier, qty]) => ({ supplier, qty }));
  }, [receipts, asnById, supplierById]);

  const totalLinesReceived = asns.reduce((s, a) => s + (a.qty_received > 0 ? a.lines : 0), 0);
  const overdueCount = asns.filter(a => a.status === "Overdue").length;
  const isLoading = loadingAsns || loadingReceipts;

  return (
    <section className="space-y-4" id="inbound-report-section">
      <div className="bg-white rounded-xl border border-neutral-200 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
          <BarChart2 size={14} className="text-[#009FE3]" /> Inbound Operations Report
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total ASNs", value: asns.length, icon: Package, color: "#009FE3" },
          { label: "Lines Received", value: totalLinesReceived, icon: CheckCircle2, color: "#10B981" },
          { label: "Total Receipts", value: receipts.length, icon: Clock, color: "#8B5CF6" },
          { label: "Overdue ASNs", value: overdueCount, icon: AlertCircle, color: "#EF4444" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-neutral-200 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold text-neutral-900">{isLoading ? <Loader2 size={16} className="animate-spin text-neutral-300" /> : value}</p>
              <p className="text-xs text-neutral-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="text-xs font-semibold text-neutral-700 mb-4">Receipts by Day (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={receiptsByDay} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E2EAF4" }} />
              <Bar dataKey="qty" fill="#009FE3" name="Qty Received" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="text-xs font-semibold text-neutral-700 mb-4">ASN Status Breakdown</h3>
          {statusPie.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-8">No ASNs yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {statusPie.map((entry, i) => <Cell key={i} fill={pieColors[entry.name] || "#94A3B8"} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {statusPie.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pieColors[s.name] || "#94A3B8" }}></div>
                    <span className="text-xs text-neutral-600">{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-xs font-semibold text-neutral-700 mb-4">Receipt Volume by Supplier</h3>
        {supplierVolume.length === 0 ? (
          <p className="text-xs text-neutral-400 text-center py-8">No receipts recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={supplierVolume} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="supplier" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="qty" fill="#10B981" name="Qty Received" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl border border-neutral-200">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h3 className="text-xs font-semibold text-neutral-700">ASN Detailed Report</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="text-left py-2.5 px-4 text-neutral-500">ASN #</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Supplier</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Expected</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Lines</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Qty Expected</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Qty Received</th>
                <th className="text-left py-2.5 px-3 text-neutral-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {asns.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-neutral-400">No ASNs yet.</td></tr>
              ) : asns.map(a => (
                <tr key={a.id} className="hover:bg-blue-50/20">
                  <td className="py-2.5 px-4 font-medium text-neutral-900">{a.asn_number}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{supplierById.get(a.supplier_id) || `#${a.supplier_id}`}</td>
                  <td className="py-2.5 px-3 text-neutral-600">{a.expected_date ? new Date(a.expected_date).toLocaleDateString() : "—"}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{a.lines}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{a.qty_expected.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{a.qty_received.toLocaleString()}</td>
                  <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[a.status] || "bg-neutral-100 text-neutral-600"}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default InboundReportSection;
