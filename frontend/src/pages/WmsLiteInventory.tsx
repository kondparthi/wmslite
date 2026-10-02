import React, { useState } from 'react';
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import InventoryTabsNav from "@/WmsLiteInventory/InventoryTabsNav";
import BalanceSection from "@/WmsLiteInventory/BalanceSection";
import TransactionsSection from "@/WmsLiteInventory/TransactionsSection";
import MovementSection from "@/WmsLiteInventory/MovementSection";
import HoldSection from "@/WmsLiteInventory/HoldSection";
import AdjustmentSection from "@/WmsLiteInventory/AdjustmentSection";
import UpdateSection from "@/WmsLiteInventory/UpdateSection";
import CycleCountSection from "@/WmsLiteInventory/CycleCountSection";
import KittingSection from "@/WmsLiteInventory/KittingSection";
import InventoryReportSection from "@/WmsLiteInventory/InventoryReportSection";

const WmsLiteInventory = () => {
  const [activeTab, setActiveTab] = useState('balance');

  const renderContent = () => {
    switch (activeTab) {
      case 'balance':
        return <BalanceSection />;
      case 'transactions':
        return <TransactionsSection />;
      case 'movement':
        return <MovementSection />;
      case 'hold':
        return <HoldSection />;
      case 'adjustment':
        return <AdjustmentSection />;
      case 'update':
        return <UpdateSection />;
      case 'cycle-count':
        return <CycleCountSection />;
      case 'kitting':
        return <KittingSection />;
      case 'report':
        return <InventoryReportSection />;
      default:
        return <BalanceSection />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex w-full max-w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-neutral-100 min-w-0">
          <Header />
          <main className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Inventory Management</h1>
              <p className="text-neutral-500 text-sm">Monitor and control your warehouse inventory levels and movements.</p>
            </div>

            <InventoryTabsNav activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className="transition-all duration-300">
              {renderContent()}
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default WmsLiteInventory;