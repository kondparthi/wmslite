import React, { useState } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import OutboundTabsNav from "@/WmsLiteOutbound/OutboundTabsNav";
import {
  ShipmentOrderSection,
  AllocationStrategiesSection,
  AllocationSection,
} from "@/WmsLiteOutbound/CoreOpsSections";
import {
  WavePlanningSection,
  PickingSection,
  UnpickedSection,
  LoadCreationSection,
  PackUnpackSection,
  ShippingSection,
} from "@/WmsLiteOutbound/AdvancedOpsSections";
import {
  TaskManagementSection,
  AppointmentSection,
  ReportSection,
} from "@/WmsLiteOutbound/SupportOpsSections";

const WmsLiteOutbound = () => {
  const [activeTab, setActiveTab] = useState("orders");

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Outbound Management</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Manage shipments, allocation, waves, picking, and dispatch operations.</p>
            </div>

            <OutboundTabsNav activeTab={activeTab} onTabChange={setActiveTab} />

            <div>
              {activeTab === "orders" && <ShipmentOrderSection />}
              {activeTab === "strategies" && <AllocationStrategiesSection />}
              {activeTab === "allocation" && <AllocationSection />}
              {activeTab === "wave" && <WavePlanningSection />}
              {activeTab === "picking" && <PickingSection />}
              {activeTab === "unallocated" && <UnpickedSection />}
              {activeTab === "load" && <LoadCreationSection />}
              {activeTab === "packing" && <PackUnpackSection />}
              {activeTab === "shipping" && <ShippingSection />}
              {activeTab === "tasks" && <TaskManagementSection />}
              {activeTab === "appointments" && <AppointmentSection />}
              {activeTab === "reports" && <ReportSection />}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default WmsLiteOutbound;