import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Footer from '@/components/layout/Footer';
import SlottingTabsNav from '@/WmsLiteDynamicSlotting/SlottingTabsNav';
import SlottingSections from '@/WmsLiteDynamicSlotting/SlottingSections';

const WmsLiteDynamicSlotting: React.FC = () => {
  const [activeTab, setActiveTab] = useState('strategies');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dynamic Slotting & Optimization</h1>
                <p className="text-gray-500">Manage storage strategies, item velocity, and warehouse space optimization.</p>
              </div>
            </div>

            <SlottingTabsNav activeTab={activeTab} onTabChange={setActiveTab} />
            <SlottingSections activeTab={activeTab} />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default WmsLiteDynamicSlotting;