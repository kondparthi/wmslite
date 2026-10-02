import React, { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MasterDataTabsNav from "@/components/WmsLiteMasterData/MasterDataTabsNav";
import MasterDataSummarySection from "@/components/WmsLiteMasterData/MasterDataSummarySection";
import LocationMasterSection from "@/components/WmsLiteMasterData/LocationMasterSection";
import MaterialMasterSection from "@/components/WmsLiteMasterData/MaterialMasterSection";
import SupplierSection from "@/components/WmsLiteMasterData/SupplierSection";
import ZoneAreaSection from "@/components/WmsLiteMasterData/ZoneAreaSection";
import MaterialCarrierSection from "@/components/WmsLiteMasterData/MaterialCarrierSection";
import SubMasterSection from "@/components/WmsLiteMasterData/SubMasterSection";
import ShipToFromSection from "@/components/WmsLiteMasterData/ShipToFromSection";
import ReplenishmentSection from "@/components/WmsLiteMasterData/ReplenishmentSection";
import OutboundLotSection from "@/components/WmsLiteMasterData/OutboundLotSection";

const WmsLiteMasterData = () => {
  const [activeTab, setActiveTab] = useState("location");

  const renderSection = () => {
    switch (activeTab) {
      case "location":  return <LocationMasterSection />;
      case "material":  return <MaterialMasterSection />;
      case "supplier":  return <SupplierSection />;
      case "zone":      return <ZoneAreaSection />;
      case "carrier":   return <MaterialCarrierSection />;
      case "shipto":    return <ShipToFromSection />;
      case "replen":    return <ReplenishmentSection />;
      case "lot":       return <OutboundLotSection />;
      case "owner":
      case "packkey":
      case "assigned":  return <SubMasterSection />;
      default:          return <LocationMasterSection />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex w-full max-w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-neutral-100 min-w-0">
          <Header />
          <main className="flex-1 p-6 space-y-6" id="master-data-main">
            <MasterDataTabsNav activeTab={activeTab} onTabChange={setActiveTab} />
            <MasterDataSummarySection />
            {renderSection()}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default WmsLiteMasterData;