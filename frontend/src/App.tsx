import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import WmsLiteForgotPassword from "./pages/WmsLiteForgotPassword";
import WmsLiteDashboard from "./pages/WmsLiteDashboard";
import WmsLiteMasterData from "./pages/WmsLiteMasterData";
import WmsLiteInbound from "./pages/WmsLiteInbound";
import WmsLiteInventory from "./pages/WmsLiteInventory";
import WmsLiteOutbound from "./pages/WmsLiteOutbound";
import WmsLiteLaborManagement from "./pages/WmsLiteLaborManagement";
import WmsLite3PLBilling from "./pages/WmsLite3PLBilling";
import WmsLiteYardManagement from "./pages/WmsLiteYardManagement";
import WmsLiteDynamicSlotting from "./pages/WmsLiteDynamicSlotting";
import WmsLiteCrossDocking from "./pages/WmsLiteCrossDocking";
import WmsLiteAdminConfig from "./pages/WmsLiteAdminConfig";
import WmsLiteReturnsRMA from "./pages/WmsLiteReturnsRMA";
import WmsLiteReplenishment from "./pages/WmsLiteReplenishment";
import WmsLiteShippingExecution from "./pages/WmsLiteShippingExecution";
import WmsLiteNotificationsConfig from "./pages/WmsLiteNotificationsConfig";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import SupportPage from "./pages/SupportPage";
import ReportIssue from "./pages/ReportIssue";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/wms-lite-forgot-password" element={<WmsLiteForgotPassword />} />
          <Route path="/wms-lite-dashboard" element={<ProtectedRoute><WmsLiteDashboard /></ProtectedRoute>} />
          <Route path="/wms-lite-master-data" element={<ProtectedRoute><WmsLiteMasterData /></ProtectedRoute>} />
          <Route path="/wms-lite-inbound" element={<ProtectedRoute><WmsLiteInbound /></ProtectedRoute>} />
          <Route path="/wms-lite-inventory" element={<ProtectedRoute><WmsLiteInventory /></ProtectedRoute>} />
          <Route path="/wms-lite-outbound" element={<ProtectedRoute><WmsLiteOutbound /></ProtectedRoute>} />
          <Route path="/wms-lite-labor-management" element={<ProtectedRoute><WmsLiteLaborManagement /></ProtectedRoute>} />
          <Route path="/wms-lite-3pl-billing" element={<ProtectedRoute><WmsLite3PLBilling /></ProtectedRoute>} />
          <Route path="/wms-lite-yard-management" element={<ProtectedRoute><WmsLiteYardManagement /></ProtectedRoute>} />
          <Route path="/wms-lite-dynamic-slotting" element={<ProtectedRoute><WmsLiteDynamicSlotting /></ProtectedRoute>} />
          <Route path="/wms-lite-cross-docking" element={<ProtectedRoute><WmsLiteCrossDocking /></ProtectedRoute>} />
          <Route path="/wms-lite-admin-config" element={<ProtectedRoute><WmsLiteAdminConfig /></ProtectedRoute>} />
          <Route path="/wms-lite-returns-rma" element={<ProtectedRoute><WmsLiteReturnsRMA /></ProtectedRoute>} />
          <Route path="/wms-lite-replenishment" element={<ProtectedRoute><WmsLiteReplenishment /></ProtectedRoute>} />
          <Route path="/wms-lite-shipping-execution" element={<ProtectedRoute><WmsLiteShippingExecution /></ProtectedRoute>} />
          <Route path="/wms-lite-notifications-config" element={<ProtectedRoute><WmsLiteNotificationsConfig /></ProtectedRoute>} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/report-issue" element={<ReportIssue />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
