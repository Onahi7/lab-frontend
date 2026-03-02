import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { RoleGuard } from "./components/auth/RoleGuard";
import { Loader2 } from "lucide-react";

// Pages
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Reception Pages
import ReceptionDashboard from "./pages/reception/ReceptionDashboard";
import PatientDetails from "./pages/reception/PatientDetails";
import RegisterPatient from "./pages/reception/RegisterPatient";
import NewOrder from "./pages/reception/NewOrder";
import PatientsPage from "./pages/reception/PatientsPage";
import OrdersPage from "./pages/reception/OrdersPage";
import PaymentsPage from "./pages/reception/PaymentsPage";
import DailyReconciliation from "./pages/reception/DailyReconciliation";
import PaymentReceipt from "./pages/reception/PaymentReceipt";
import PaymentDemo from "./pages/reception/PaymentDemo";
import QuickResultEntry from "./pages/reception/QuickResultEntry";

// Lab Pages
import LabDashboardPage from "./pages/lab/LabDashboardPage";
import EnterManualResults from "./pages/lab/EnterManualResults";
import ResultVerification from "./pages/lab/ResultVerification";
import QCDataEntry from "./pages/lab/QCDataEntry";
import CollectSamplesPage from "./pages/lab/CollectSamplesPage";
import EnterResultsPage from "./pages/lab/EnterResultsPage";
import ResultsPage from "./pages/lab/ResultsPage";
import EditableResultReport from "./pages/lab/EditableResultReport";
import LabReportPage from "./pages/lab/LabReportPage";
import PublicLabReportPage from "./pages/lab/PublicLabReportPage";
import MatchResults from "./pages/lab/MatchResults";

// Admin Pages
import CommunicationLogs from "./pages/admin/CommunicationLogs";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagementPage from "./pages/admin/UserManagementPage";
import Reports from "./pages/admin/Reports";
import TestCatalogManagement from "./pages/admin/TestCatalogManagement";
import ReconciliationReview from "./pages/admin/ReconciliationReview";
import AuditLogViewer from "./pages/admin/AuditLogViewer";
import ReportTemplateEditor from "./pages/admin/ReportTemplateEditor";

// Shared Pages
import Machines from "./pages/Machines";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, isLoading, primaryRole } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getDefaultRoute = () => {
    if (!isAuthenticated || !primaryRole) return '/login';
    switch (primaryRole) {
      case 'admin': return '/admin';
      case 'lab_tech': return '/lab';
      case 'receptionist': return '/reception';
      default: return '/login';
    }
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        isAuthenticated && primaryRole ? (
          <Navigate to={getDefaultRoute()} replace />
        ) : <Login />
      } />

      {/* Reception Routes */}
      <Route path="/reception" element={
        <RoleGuard allowedRoles={['receptionist', 'admin']}><ReceptionDashboard /></RoleGuard>
      } />
      <Route path="/reception/register" element={
        <RoleGuard allowedRoles={['receptionist', 'admin']}><RegisterPatient /></RoleGuard>
      } />
      <Route path="/reception/patients" element={
        <RoleGuard allowedRoles={['receptionist', 'admin']}><PatientsPage /></RoleGuard>
      } />
      <Route path="/reception/patients/:id" element={
        <RoleGuard allowedRoles={['receptionist', 'admin']}><PatientDetails /></RoleGuard>
      } />
      <Route path="/reception/new-order" element={
        <RoleGuard allowedRoles={['receptionist', 'admin']}><NewOrder /></RoleGuard>
      } />
      <Route path="/reception/orders" element={
        <RoleGuard allowedRoles={['receptionist', 'admin']}><OrdersPage /></RoleGuard>
      } />
      <Route path="/reception/payments" element={
        <RoleGuard allowedRoles={['receptionist', 'admin']}><PaymentsPage /></RoleGuard>
      } />
      <Route path="/reception/reconciliation" element={
        <RoleGuard allowedRoles={['receptionist', 'admin']}><DailyReconciliation /></RoleGuard>
      } />
      <Route path="/reception/results" element={
        <RoleGuard allowedRoles={['receptionist', 'admin']}><ResultsPage /></RoleGuard>
      } />
      <Route path="/reception/enter-results" element={
        <RoleGuard allowedRoles={['receptionist', 'admin']}><QuickResultEntry /></RoleGuard>
      } />
      <Route path="/reception/receipt/:orderId" element={
        <RoleGuard allowedRoles={['receptionist', 'admin']}><PaymentReceipt /></RoleGuard>
      } />
      <Route path="/reception/payment-demo" element={
        <RoleGuard allowedRoles={['receptionist', 'admin']}><PaymentDemo /></RoleGuard>
      } />

      {/* Lab Routes */}
      <Route path="/lab" element={
        <RoleGuard allowedRoles={['lab_tech', 'admin']}><LabDashboardPage /></RoleGuard>
      } />
      <Route path="/lab/match-results" element={
        <RoleGuard allowedRoles={['lab_tech', 'admin']}><MatchResults /></RoleGuard>
      } />
      <Route path="/lab/pending" element={
        <RoleGuard allowedRoles={['lab_tech', 'admin']}><CollectSamplesPage /></RoleGuard>
      } />
      <Route path="/lab/collect" element={
        <RoleGuard allowedRoles={['lab_tech', 'admin']}><CollectSamplesPage /></RoleGuard>
      } />
      <Route path="/lab/processing" element={
        <RoleGuard allowedRoles={['lab_tech', 'admin']}><EnterResultsPage /></RoleGuard>
      } />
      <Route path="/lab/enter-results" element={
        <RoleGuard allowedRoles={['lab_tech', 'admin', 'receptionist']}><EnterManualResults /></RoleGuard>
      } />
      <Route path="/lab/results" element={
        <RoleGuard allowedRoles={['lab_tech', 'admin', 'receptionist']}><ResultsPage /></RoleGuard>
      } />
      <Route path="/lab/patients" element={
        <RoleGuard allowedRoles={['lab_tech', 'admin']}><PatientsPage /></RoleGuard>
      } />
      <Route path="/lab/verify-results" element={
        <RoleGuard allowedRoles={['lab_tech', 'admin']}><ResultVerification /></RoleGuard>
      } />
      <Route path="/lab/qc" element={
        <RoleGuard allowedRoles={['lab_tech', 'admin']}><QCDataEntry /></RoleGuard>
      } />
      <Route path="/lab/machines" element={
        <RoleGuard allowedRoles={['lab_tech', 'admin']}><Machines /></RoleGuard>
      } />
      <Route path="/lab/result-report/:id?" element={
        <RoleGuard allowedRoles={['lab_tech', 'admin', 'receptionist']}><EditableResultReport /></RoleGuard>
      } />
      <Route path="/lab/reports/:orderId" element={
        <RoleGuard allowedRoles={['lab_tech', 'admin', 'receptionist']}><LabReportPage /></RoleGuard>
      } />
      <Route path="/public/lab/reports/:orderId" element={<PublicLabReportPage />} />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <RoleGuard allowedRoles={['admin']}><AdminDashboard /></RoleGuard>
      } />
      <Route path="/admin/users" element={
        <RoleGuard allowedRoles={['admin']}><UserManagementPage /></RoleGuard>
      } />
      <Route path="/admin/reports" element={
        <RoleGuard allowedRoles={['admin']}><Reports /></RoleGuard>
      } />
      <Route path="/admin/test-catalog" element={
        <RoleGuard allowedRoles={['admin']}><TestCatalogManagement /></RoleGuard>
      } />
      <Route path="/admin/communication-logs" element={
        <RoleGuard allowedRoles={['admin']}><CommunicationLogs /></RoleGuard>
      } />
      <Route path="/admin/audit-logs" element={
        <RoleGuard allowedRoles={['admin']}><AuditLogViewer /></RoleGuard>
      } />
      <Route path="/admin/reconciliation" element={
        <RoleGuard allowedRoles={['admin']}><ReconciliationReview /></RoleGuard>
      } />
      <Route path="/admin/report-template" element={
        <RoleGuard allowedRoles={['admin']}><ReportTemplateEditor /></RoleGuard>
      } />
      <Route path="/admin/patients" element={
        <RoleGuard allowedRoles={['admin']}><PatientsPage /></RoleGuard>
      } />
      <Route path="/admin/orders" element={
        <RoleGuard allowedRoles={['admin']}><OrdersPage /></RoleGuard>
      } />
      <Route path="/admin/results" element={
        <RoleGuard allowedRoles={['admin']}><ResultsPage /></RoleGuard>
      } />
      <Route path="/admin/machines" element={
        <RoleGuard allowedRoles={['admin']}><Machines /></RoleGuard>
      } />
      <Route path="/admin/payments" element={
        <RoleGuard allowedRoles={['admin']}><PaymentsPage /></RoleGuard>
      } />
      <Route path="/admin/settings" element={
        <RoleGuard allowedRoles={['admin']}><Settings /></RoleGuard>
      } />
      <Route path="/admin/logs" element={
        <RoleGuard allowedRoles={['admin']}><CommunicationLogs /></RoleGuard>
      } />

      {/* Default Route - Redirect based on auth state */}
      <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <WebSocketProvider>
            <ConnectionStatus />
            <AppRoutes />
          </WebSocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
