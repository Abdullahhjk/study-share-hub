import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ColorblindFilters } from "@/components/ColorblindFilters";
import { CurrencyProvider } from "@/components/providers/CurrencyProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import DevNotice from "@/components/DevNotice";
import AIAssistantPanel from "@/components/admin/AIAssistantPanel";
import { AIPanelProvider, useAIPanel } from "@/components/admin/AIPanelContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CoadminDashboard from "./pages/CoadminDashboard";
import ResetPassword from "./pages/ResetPassword";
import StudentDashboard from "./pages/StudentDashboard";
import SettingsBootstrap from "@/components/SettingsBootstrap";
import UserManual from "./pages/UserManual";
import NotFound from "./pages/NotFound";
import QATesting from "./pages/QATesting";
import AdminDashboard from "./pages/AdminDashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import YourData from "./pages/YourData";
import Download from "./pages/Download";
import Unsubscribe from "./pages/Unsubscribe";
import UpcomingFeatures from "./pages/UpcomingFeatures";
import NotesLoading from "@/components/NotesLoading";
import { fetchNotesQuery } from "@/hooks/useNotes";

const queryClient = new QueryClient();
const env = import.meta.env.MODE;

function AppContent() {
  const client = useQueryClient();
  const [initialLoading, setInitialLoading] = useState(true);
  const { open: panelOpen, panelWidth } = useAIPanel();

  useEffect(() => {
    client.prefetchQuery({
      queryKey: ["notes"],
      queryFn: fetchNotesQuery,
    });

    const timer = setTimeout(() => setInitialLoading(false), 6720);
    return () => clearTimeout(timer);
  }, [client]);

  if (initialLoading) return <NotesLoading />;

  return (
    <BrowserRouter>
      <Toaster />
      <Sonner />

      <div style={{
        maxWidth: panelOpen ? `${100 - panelWidth}vw` : "100%",
        transition: "max-width 200ms ease-in-out",
      }}>
        <DevNotice />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/database-data" element={<ProtectedRoute><YourData /></ProtectedRoute>} />
          <Route path="/my-orders" element={<StudentDashboard />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/help" element={<UserManual />} />
          <Route path="/coadmin" element={<ProtectedRoute requiredRole="coadmin"><CoadminDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="coadmin"><AdminDashboard /></ProtectedRoute>} />
          {env === "development" &&
            <Route path="/test" element={<QATesting />} />
          }
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/download" element={<Download />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/upcoming" element={<UpcomingFeatures />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <AIAssistantPanel />
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SettingsBootstrap />
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ColorblindFilters />
      <CurrencyProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <AIPanelProvider>
              <AppContent />
            </AIPanelProvider>
          </ErrorBoundary>
        </TooltipProvider>
      </CurrencyProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
