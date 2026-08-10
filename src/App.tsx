import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { SystemEventReporter } from "@/components/SystemEventReporter";
import { ColorblindFilters } from "@/components/ColorblindFilters";
import { CurrencyProvider } from "@/components/providers/CurrencyProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import MfaVerify from "@/pages/MfaVerify";
import MfaRecover from "@/pages/MfaRecover";
import DevNotice from "@/components/DevNotice";
import AIAssistantPanel from "@/components/admin/AIAssistantPanel";
import SQLExecPanel from "@/components/admin/SQLExecPanel";
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
import ArchonKeysPage from "./pages/ArchonKeysPage";
import NotesLoading from "@/components/NotesLoading";
import { fetchNotesQuery } from "@/hooks/useNotes";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();
const env = import.meta.env.MODE;

function AppContent() {
  const client = useQueryClient();
  const [initialLoading, setInitialLoading] = useState(true);
  const { open: panelOpen, panelWidth } = useAIPanel();
  const { mfaRequired } = useAuth();

  useEffect(() => {
    client.prefetchQuery({
      queryKey: ["notes"],
      queryFn: fetchNotesQuery,
    });

    const timer = setTimeout(() => setInitialLoading(false), 6720);
    return () => clearTimeout(timer);
  }, [client]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const checkBlocked = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (roleRow && ["blocked", "deleted", "rejected"].includes(roleRow.role)) {
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
        return;
      }

      channel = supabase
        .channel("user-role-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_roles",
            filter: `user_id=eq.${session.user.id}`,
          },
          async (payload: any) => {
            const newRole = payload.new?.role;
            if (["teacher", "admin", "coadmin"].includes(newRole)) {
              window.location.reload();
              return;
            }
            await supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
          },
        )
        .subscribe();
    };

    checkBlocked();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  if (initialLoading) return <NotesLoading />;

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster />
      <Sonner />
      <SystemEventReporter />

      <div style={{
        maxWidth: panelOpen ? `${100 - panelWidth}vw` : "100%",
        transition: "max-width 200ms ease-in-out",
      }}>
        <DevNotice />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/mfa/verify" element={<MfaVerify />} />
          <Route path="/mfa/recover" element={<MfaRecover />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/database-data" element={<ProtectedRoute><YourData /></ProtectedRoute>} />
          <Route path="/my-orders" element={<StudentDashboard />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/help" element={<UserManual />} />
          <Route path="/coadmin" element={<ProtectedRoute requiredRole="coadmin"><CoadminDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          {env === "development" &&
            <Route path="/test" element={<QATesting />} />
          }
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/download" element={<Download />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/upcoming" element={<UpcomingFeatures />} />
          <Route path="/archon-keys" element={<ProtectedRoute><ArchonKeysPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {!mfaRequired && <AIAssistantPanel />}
      {!mfaRequired && <SQLExecPanel />}
    </BrowserRouter>
  );
}

const App = () => (
  <AuthProvider>
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
  </AuthProvider>
);

export default App;
