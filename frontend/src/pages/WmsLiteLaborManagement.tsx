import React, { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import LaborTabsNav from "@/WmsLiteLaborManagement/LaborTabsNav";
import {
  LaborTrackingSection,
  EmployeeMasterSection,
  LaborPerformanceSection,
  AttendanceSection,
  LaborAllocationSection,
  LaborProductivitySection,
} from "@/WmsLiteLaborManagement/LaborSections";

const WmsLiteLaborManagement = () => {
  const [activeTab, setActiveTab] = useState("tracking");

  return (
    <div className="flex min-h-screen bg-slate-50 w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-[1600px] mx-auto w-full space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Labor Management</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Track workforce activity, attendance, performance, and allocation in real-time.</p>
            </div>

            <LaborTabsNav activeTab={activeTab} onTabChange={setActiveTab} />

            <div>
              {activeTab === "tracking" && <LaborTrackingSection />}
              {activeTab === "employee" && <EmployeeMasterSection />}
              {activeTab === "performance" && <LaborPerformanceSection />}
              {activeTab === "attendance" && <AttendanceSection />}
              {activeTab === "allocation" && <LaborAllocationSection />}
              {activeTab === "productivity" && <LaborProductivitySection />}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default WmsLiteLaborManagement;