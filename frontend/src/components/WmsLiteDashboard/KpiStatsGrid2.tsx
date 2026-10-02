import React from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Users, DollarSign, ArrowUpRight } from "lucide-react";
import { useDashboardSummary } from "@/hooks/useDashboardApi";
import { useOutboundOrders, useShipments } from "@/hooks/useOutboundOpsApi";

const throughputData = [
  { day: "Mon", inbound: 32, outbound: 28 },
  { day: "Tue", inbound: 45, outbound: 38 },
  { day: "Wed", inbound: 38, outbound: 42 },
  { day: "Thu", inbound: 52, outbound: 47 },
  { day: "Fri", inbound: 48, outbound: 61 },
  { day: "Sat", inbound: 22, outbound: 18 },
  { day: "Sun", inbound: 15, outbound: 12 },
];

const inventoryData = [
  { zone: "A", used: 320, free: 80 },
  { zone: "B", used: 210, free: 140 },
  { zone: "C", used: 180, free: 20 },
  { zone: "D", used: 90, free: 110 },
  { zone: "E", used: 105, free: 45 },
];

// "Active Labor Staff" and "3PL Billing MTD" stay as illustrative
// placeholders until those modules are built. "Total SKUs in Stock" and
// "Outbound Shipments" are both backed by real data below (Master Data +
// Inventory, and Outbound respectively).

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-3 shadow-lg text-xs">
        <p className="font-semibold text-neutral-700 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
        ))}
      </div>
    );
  }
  return null;
};

const KpiStatsGrid2 = () => {
  const { data: summary } = useDashboardSummary();
  const { data: outboundOrders = [] } = useOutboundOrders();
  const { data: shipments = [] } = useShipments();

  const dispatchedShipments = shipments.filter(s => s.status === "Dispatched").length;
  const pendingShipments = shipments.length - dispatchedShipments;
  const shippedOrders = outboundOrders.filter(o => o.status === "Shipped").length;

  const secondKpis = [
    {
      label: "Outbound Shipments",
      value: String(dispatchedShipments),
      sub: `${shippedOrders} orders shipped`,
      trend: pendingShipments > 0 ? `${pendingShipments} pending` : "0 pending",
      up: pendingShipments === 0,
      color: "text-blue-600", bg: "bg-blue-50", Icon: TrendingUp,
    },
    {
      label: "Total SKUs in Stock",
      value: summary ? summary.total_skus.toLocaleString() : "…",
      sub: summary ? `${summary.low_stock_count} low stock alerts` : "loading...",
      trend: summary && summary.low_stock_count > 0 ? `${summary.low_stock_count}` : "0",
      up: !summary || summary.low_stock_count === 0,
      color: "text-amber-600", bg: "bg-amber-50", Icon: TrendingDown,
    },
    { label: "Active Labor Staff", value: "24", sub: "312 hrs logged today (placeholder — Labor not built yet)", trend: "100%", up: true, color: "text-emerald-600", bg: "bg-emerald-50", Icon: Users },
    { label: "3PL Billing MTD", value: "$84K", sub: "+5% vs last month (placeholder — Billing not built yet)", trend: "+5%", up: true, color: "text-violet-600", bg: "bg-violet-50", Icon: DollarSign },
  ];

  return (
  <div className="space-y-4">
    {/* Second KPI Row */}
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" id="kpi-section-2">
      {secondKpis.map(({ label, value, sub, trend, up, color, bg, Icon }) => (
        <div key={label} className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <Icon className={`${color} w-5 h-5`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold text-neutral-900">{value}</p>
            <p className="text-xs text-neutral-500 truncate">{label}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <ArrowUpRight className={`w-3 h-3 ${up ? "text-emerald-500" : "text-red-400 rotate-180"}`} />
              <span className={`text-xs font-medium ${up ? "text-emerald-600" : "text-red-500"}`}>{trend}</span>
              <span className="text-xs text-neutral-400 truncate">&nbsp;{sub}</span>
            </div>
          </div>
        </div>
      ))}
    </section>

    {/* Charts Row */}
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4" id="charts-section">
      {/* Throughput Chart */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Weekly Throughput</h3>
            <p className="text-xs text-neutral-400 mt-0.5">Inbound vs Outbound — this week</p>
          </div>
          <span className="text-xs bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full font-medium">Units / Day</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={throughputData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
            <Area type="monotone" dataKey="inbound" name="Inbound" stroke="#3b82f6" strokeWidth={2} fill="url(#inboundGrad)" dot={{ r: 3, fill: "#3b82f6" }} />
            <Area type="monotone" dataKey="outbound" name="Outbound" stroke="#8b5cf6" strokeWidth={2} fill="url(#outboundGrad)" dot={{ r: 3, fill: "#8b5cf6" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Zone Utilization Chart */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Zone Utilization</h3>
            <p className="text-xs text-neutral-400 mt-0.5">Used vs Free locations by zone</p>
          </div>
          <span className="text-xs bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full font-medium">Locations</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={inventoryData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="zone" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
            <Bar dataKey="used" name="Occupied" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="free" name="Free" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  </div>
  );
};

export default KpiStatsGrid2;