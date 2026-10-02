import React, { useMemo } from "react";
import {
  BarChart2, Package, CheckCircle2, AlertCircle, Truck, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useMasterDataList } from "@/hooks/useMasterDataApi";
import { usePutawayTasks } from "@/hooks/useInboundOpsApi";

const BRAND = "#009FE3";

interface AsnRecord { id: number; qty_expected: number; qty_received: number; status: string; }
interface PurchaseOrderRecord { id: number; status: string; }
interface AppointmentRecord { id: number; status: string; }
interface MaterialRecord { id: number; sku: string; }

const taskStatusColor: Record<string, string> = { Pending: "#F59E0B", "In Progress": "#009FE3", Completed: "#10B981" };
const apptStatusColor: Record<string, string> = { Scheduled: "#38BDF8", Confirmed: "#003A78", Arrived: "#009FE3", Completed: "#10B981", "No Show": "#EF4444", Cancelled: "#9CA3AF" };

const InboundSummaryReportSection = () => {
  const { data: asns = [], isLoading: loadingAsns } = useMasterDataList<AsnRecord>("/operations/asns");
  const { data: pos = [] } = useMasterDataList<PurchaseOrderRecord>("/operations/purchase-orders");
  const { data: appointments = [], isLoading: loadingAppts } = useMasterDataList<AppointmentRecord>("/operations/inbound-appointments");
  const { data: putawayTasks = [], isLoading: loadingTasks } = usePutawayTasks();
  const { data: materials = [] } = useMasterDataList<MaterialRecord>("/master-data/materials");

  const materialById = useMemo(() => new Map(materials.map(m => [m.id, m.sku])), [materials]);

  const qtyReceived = asns.reduce((s, a) => s + a.qty_received, 0);
  const openPOs = pos.filter(p => p.status === "Open" || p.status === "Partial").length;
  const overdueAsns = asns.filter(a => a.status === "Overdue").length;

  const putawayCompletionRate = putawayTasks.length > 0
    ? Math.round((putawayTasks.filter(t => t.status === "Completed").length / putawayTasks.length) * 100)
    : 0;

  const onTimeApptRate = appointments.length > 0
    ? Math.round((appointments.filter(a => a.status === "Arrived" || a.status === "Completed").length / appointments.length) * 100)
    : 0;

  const kpis = [
    { label: "Total ASNs", value: asns.length, icon: Package, color: "#009FE3" },
    { label: "Qty Received", value: qtyReceived.toLocaleString(), icon: CheckCircle2, color: "#0EA5E9" },
    { label: "Open POs", value: openPOs, icon: Package, color: "#6366F1" },
    { label: "Appointment Arrival Rate", value: `${onTimeApptRate}%`, icon: Truck, color: "#10B981" },
    { label: "Putaway Completion", value: `${putawayCompletionRate}%`, icon: CheckCircle2, color: "#009FE3" },
    { label: "Overdue ASNs", value: overdueAsns, icon: AlertCircle, color: "#EF4444" },
  ];

  const taskStatusPie = useMemo(() => {
    const counts = new Map<string, number>();
    putawayTasks.forEach(t => counts.set(t.status, (counts.get(t.status) || 0) + 1));
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [putawayTasks]);

  const apptStatusBar = useMemo(() => {
    const counts = new Map<string, number>();
    appointments.forEach(a => counts.set(a.status, (counts.get(a.status) || 0) + 1));
    return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
  }, [appointments]);

  const isLoading = loadingAsns || loadingAppts || loadingTasks;

  return (
    <section className="space-y-5" id="inbound-summary-report">
      <div className="bg-white rounded-xl border border-neutral-200 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
          <BarChart2 size={15} style={{ color: BRAND }} /> Inbound Summary Report
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-neutral-200 px-4 py-4 hover:shadow-sm transition-shadow">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: `${color}18` }}>
              <Icon size={13} style={{ color }} />
            </div>
            <p className="text-xl font-bold text-neutral-900 mt-1">{isLoading ? <Loader2 size={14} className="animate-spin text-neutral-300" /> : value}</p>
            <p className="text-xs text-neutral-500 mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4">Putaway Task Status</h3>
          {taskStatusPie.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-8">No putaway tasks yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={taskStatusPie} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="value" paddingAngle={3}>
                    {taskStatusPie.map((entry, i) => <Cell key={i} fill={taskStatusColor[entry.name] || "#94A3B8"} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {taskStatusPie.map(({ name, value }) => (
                  <div key={name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: taskStatusColor[name] || "#94A3B8" }} />
                      <span className="text-neutral-600">{name}</span>
                    </span>
                    <span className="font-semibold text-neutral-900">{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="text-sm font-semibold text-neutral-900 mb-1">Appointment Status</h3>
          <p className="text-xs text-neutral-400 mb-4">Count of appointments by current status</p>
          {apptStatusBar.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-8">No appointments yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={apptStatusBar} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {apptStatusBar.map((entry, i) => <Cell key={i} fill={apptStatusColor[entry.status] || "#94A3B8"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <BarChart2 size={13} style={{ color: BRAND }} /> Putaway Task Detail Report
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-neutral-100" style={{ background: `${BRAND}08` }}>
                <th className="text-left py-2.5 px-4 font-medium" style={{ color: BRAND }}>Task</th>
                <th className="text-left py-2.5 px-4 font-medium text-neutral-500">SKU</th>
                <th className="text-left py-2.5 px-4 font-medium text-neutral-500">Qty</th>
                <th className="text-left py-2.5 px-4 font-medium text-neutral-500">Status</th>
                <th className="text-left py-2.5 px-4 font-medium text-neutral-500">Created</th>
                <th className="text-left py-2.5 px-4 font-medium text-neutral-500">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {putawayTasks.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-neutral-400">No putaway tasks yet.</td></tr>
              ) : putawayTasks.map(t => (
                <tr key={t.id} className="hover:bg-sky-50/30 transition-colors">
                  <td className="py-2.5 px-4 font-semibold" style={{ color: BRAND }}>PUT-{t.id}</td>
                  <td className="py-2.5 px-4 text-neutral-700">{materialById.get(t.material_id) || `#${t.material_id}`}</td>
                  <td className="py-2.5 px-4 font-medium text-neutral-900">{t.qty}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${taskStatusColor[t.status]}18`, color: taskStatusColor[t.status] }}>{t.status}</span>
                  </td>
                  <td className="py-2.5 px-4 text-neutral-600">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="py-2.5 px-4 text-neutral-600">{t.completed_at ? new Date(t.completed_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default InboundSummaryReportSection;
