import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AdminConfigTabsNav from '@/components/WmsLiteAdminConfig/AdminConfigTabsNav';
import SystemSettingsSection from '@/components/WmsLiteAdminConfig/SystemSettingsSection';
import WarehouseConfigSection from '@/components/WmsLiteAdminConfig/WarehouseConfigSection';
import MasterDataConfigSection from '@/components/WmsLiteAdminConfig/MasterDataConfigSection';
import LocalizationSection from '@/components/WmsLiteAdminConfig/LocalizationSection';
import UsersRolesSection from '@/components/WmsLiteAdminConfig/UsersRolesSection';
import IntegrationsSection from '@/components/WmsLiteAdminConfig/IntegrationsSection';
import NotificationsSection from '@/components/WmsLiteAdminConfig/NotificationsSection';
import BarcodeConfigsSection from '@/components/WmsLiteAdminConfig/BarcodeConfigsSection';
import AuditSecuritySection from '@/components/WmsLiteAdminConfig/AuditSecuritySection';

const WmsLiteAdminConfig = () => {
  const [activeTab, setActiveTab] = useState('system');

  const renderSection = () => {
    switch (activeTab) {
      case 'system': return <SystemSettingsSection />;
      case 'warehouse': return <WarehouseConfigSection />;
      case 'masterdata': return <MasterDataConfigSection />;
      case 'localization': return <LocalizationSection />;
      case 'users': return <UsersRolesSection />;
      case 'integrations': return <IntegrationsSection />;
      case 'notifications': return <NotificationsSection />;
      case 'barcodes': return <BarcodeConfigsSection />;
      case 'audit': return <AuditSecuritySection />;
      default: return <SystemSettingsSection />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex w-full max-w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-neutral-100 min-w-0">
          <Header />
          <AdminConfigTabsNav activeTab={activeTab} onTabChange={setActiveTab} />
          <main className="flex-1 overflow-auto">
            {renderSection()}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default WmsLiteAdminConfig;