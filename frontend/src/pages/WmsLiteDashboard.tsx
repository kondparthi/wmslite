import React, { useState } from "react";
import AlertBanner from "@/components/WmsLiteDashboard/AlertBanner";
import AppointmentSection from "@/components/WmsLiteDashboard/AppointmentSection";
import BottomSection from "@/components/WmsLiteDashboard/BottomSection";
import DigitalTwinPanel from "@/components/WmsLiteDashboard/DigitalTwinPanel";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import KpiStatsGrid from "@/components/WmsLiteDashboard/KpiStatsGrid";
import KpiStatsGrid2 from "@/components/WmsLiteDashboard/KpiStatsGrid2";
import QuickActionsSection from "@/components/WmsLiteDashboard/QuickActionsSection";
import Sidebar from "@/components/layout/Sidebar";
import { RefreshCw, LayoutDashboard, CalendarDays, Wifi, Boxes } from "lucide-react";

const WmsLiteDashboard = () => {
  const [twinOpen, setTwinOpen] = useState(false);
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex w-full max-w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-neutral-50 min-w-0">
          <Header />
          <main className="flex-1 p-6 space-y-5" id="dashboard-main">

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center shadow-sm">
                  <LayoutDashboard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-neutral-900">Operations Dashboard</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-xs text-neutral-400">Live</span>
                    </div>
                    <span className="text-neutral-300">·</span>
                    <CalendarDays className="w-3 h-3 text-neutral-400" />
                    <span className="text-xs text-neutral-400">{dateStr}</span>
                    <span className="text-neutral-300">·</span>
                    <span className="text-xs font-medium text-neutral-600">{timeStr}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="font-medium">All Systems Operational</span>
                </div>
                <button
                  onClick={() => setTwinOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 px-3 py-1.5 rounded-lg transition-all shadow-sm"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  Digital Twin
                </button>
                <button className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 border border-neutral-200 bg-white px-3 py-1.5 rounded-lg hover:bg-neutral-50 transition-all shadow-sm">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Alert Banner */}
            <AlertBanner />

            <DigitalTwinPanel open={twinOpen} onClose={() => setTwinOpen(false)} />

            {/* KPI Row 1 */}
            <KpiStatsGrid />

            {/* KPI Row 2 + Charts */}
            <KpiStatsGrid2 />

            {/* Quick Actions / Alerts / Dock */}
            <QuickActionsSection />

            {/* Transactions + Module Summaries */}
            <BottomSection />

            {/* Appointment Schedule */}
            <AppointmentSection />

          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default WmsLiteDashboard;