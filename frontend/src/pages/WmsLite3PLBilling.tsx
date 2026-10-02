import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BillingTabsNav from '@/WmsLite3PLBilling/BillingTabsNav';
import {
  CustomerMasterSection,
  RateCardSection,
  ChargeRulesSection,
  InvoicesSection,
  StorageBillingSection,
  TransactionalSection,
  BillingSummarySection,
} from '@/WmsLite3PLBilling/BillingSections';

const WmsLite3PLBilling = () => {
  const [activeTab, setActiveTab] = useState("customers");

  const renderSection = () => {
    switch (activeTab) {
      case "customers":     return <CustomerMasterSection />;
      case "ratecards":     return <RateCardSection />;
      case "rules":         return <ChargeRulesSection />;
      case "invoices":      return <InvoicesSection />;
      case "storage":       return <StorageBillingSection />;
      case "transactional": return <TransactionalSection />;
      case "summary":       return <BillingSummarySection />;
      default:              return <CustomerMasterSection />;
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1600px] mx-auto">
            {/* Page Header */}
            <div className="mb-5">
              <h1 className="text-xl font-bold text-slate-800">3PL Billing</h1>
              <p className="text-xs text-slate-500 mt-0.5">Manage customer billing, rate cards, charge rules, invoices, and revenue analytics</p>
            </div>
            <BillingTabsNav activeTab={activeTab} onTabChange={setActiveTab} />
            {renderSection()}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default WmsLite3PLBilling;