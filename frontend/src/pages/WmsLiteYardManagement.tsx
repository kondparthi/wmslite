import React, { useState } from 'react';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import {
  GateManagement,
  TrailerTracking,
  DockManagement,
  ShunterTasks,
  YardReports
} from '@/WmsLiteYardManagement/YardSections';
import YardTabsNav from '@/WmsLiteYardManagement/YardTabsNav';

const WmsLiteYardManagement = () => {
  const [activeTab, setActiveTab] = useState("gate");

  const renderSection = () => {
    switch (activeTab) {
      case "gate":     return <GateManagement />;
      case "tracking": return <TrailerTracking />;
      case "docks":    return <DockManagement />;
      case "shunter":  return <ShunterTasks />;
      case "reports":  return <YardReports />;
      default:         return <GateManagement />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <YardTabsNav activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderSection()}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default WmsLiteYardManagement;