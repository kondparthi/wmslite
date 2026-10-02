import React, { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import InboundTabsNav from "@/components/WmsLiteInbound/InboundTabsNav";
import InboundKpiGrid from "@/components/WmsLiteInbound/InboundKpiGrid";
import AsnSection from "@/components/WmsLiteInbound/AsnSection";
import ReceivePutawaySection from "@/components/WmsLiteInbound/ReceivePutawaySection";
import PutawayStrategySection from "@/components/WmsLiteInbound/PutawayStrategySection";
import PutawayByWebUISection from "@/components/WmsLiteInbound/PutawayByWebUISection";
import PurchaseOrderSection from "@/components/WmsLiteInbound/PurchaseOrderSection";
import InboundAppointmentSection from "@/components/WmsLiteInbound/InboundAppointmentSection";
import TaskManagementSection from "@/components/WmsLiteInbound/TaskManagementSection";
import LabelGenerationSection from "@/components/WmsLiteInbound/LabelGenerationSection";
import InboundReportSection from "@/components/WmsLiteInbound/InboundReportSection";
import InboundSummaryReportSection from "@/components/WmsLiteInbound/InboundSummaryReportSection";

const WmsLiteInbound = () => {
  const [activeTab, setActiveTab] = useState("asn");

  const renderSection = () => {
    switch (activeTab) {
      case "asn":           return <AsnSection />;
      case "receive":       return <ReceivePutawaySection />;
      case "putaway-strat": return <PutawayStrategySection />;
      case "putaway-web":   return <PutawayByWebUISection />;
      case "po":            return <PurchaseOrderSection />;
      case "appointment":   return <InboundAppointmentSection />;
      case "tasks":         return <TaskManagementSection />;
      case "labels":        return <LabelGenerationSection />;
      case "report":        return <InboundReportSection />;
      case "summary":       return <InboundSummaryReportSection />;
      default:              return <AsnSection />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex w-full max-w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-neutral-100 min-w-0">
          <Header />
          <main className="flex-1 p-6 space-y-6" id="inbound-main">
            <InboundTabsNav activeTab={activeTab} onTabChange={setActiveTab} />
            <InboundKpiGrid />
            {renderSection()}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default WmsLiteInbound;