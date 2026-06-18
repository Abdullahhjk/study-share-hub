import Cookies from "js-cookie";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ColorblindFilters } from "@/components/ColorblindFilters";
import { CurrencyProvider } from "@/components/providers/CurrencyProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
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
import { AlertTriangle } from "lucide-react";

const queryClient = new QueryClient();
const env = import.meta.env.MODE;

function AppContent() {
  const client = useQueryClient();
  const NOTICE_COOKIE = "app_notice_accepted";

  const [noticeOpen, setNoticeOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    client.prefetchQuery({
      queryKey: ["notes"],
      queryFn: fetchNotesQuery,
    });

    const alreadyAccepted = Cookies.get(NOTICE_COOKIE);

    if (!alreadyAccepted) {
      setNoticeOpen(true);
    }

    const timer = setTimeout(() => setInitialLoading(false), 5720);
    return () => clearTimeout(timer);
  }, [client]);

  const handleAccept = () => {
    Cookies.set(NOTICE_COOKIE, "true", {
      expires: 3650,
      sameSite: "Lax",
    });

    setNoticeOpen(false);

    setTimeout(() => {
      toast.success("Welcome to Scholar Share", {
        description: "Thanks for joining us while the platform continues to improve. Please report any issues you encounter.",
        duration: 5000,
      });
    }, 250);
  };

  useEffect(() => {
    client.prefetchQuery({
      queryKey: ["notes"],
      queryFn: fetchNotesQuery,
    });
    const timer = setTimeout(() => setInitialLoading(false), 5720);
    return () => clearTimeout(timer);
  }, [client]);

  if (initialLoading) return <NotesLoading />;

  return (
    <>
      <BrowserRouter>
        <Dialog open={noticeOpen}>
          <DialogContent
            className="max-w-md"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>

              <DialogTitle className="text-center">
                Important Notice
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Scholar Share is currently being rebuilt. Some features may be incomplete and occasional bugs are expected.
              </p>

              <button
                type="button"
                onClick={() => setShowDetails((prev) => !prev)}
                className="mx-auto block text-sm font-medium text-primary hover:underline"
              >
                {showDetails ? "Show less" : "Learn more"}
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${showDetails
                  ? "max-h-40 opacity-100"
                  : "max-h-0 opacity-0"
                  }`}
              >
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <ul className="space-y-0">
                    <li>• Approximately 70% of the rebuild is complete.</li>
                    <li>• Some functionality may be temporarily unavailable.</li>
                    <li>• UI inconsistencies and bugs may occur.</li>
                    <li>• Report issues via Footer → Stay Connected → Feedback.</li>
                    <li>• Please report any issues you encounter.</li>
                  </ul>
                  <small className="text-muted-foreground">
                    This app doesn't use cookies, but for this notice to work, we need to store a cookie to remember your preference.
                  </small>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-md border p-3">
                <Checkbox
                  id="accept-notice"
                  className="mt-[2px]"
                  checked={accepted}
                  onCheckedChange={(value) => setAccepted(Boolean(value))}
                />

                <label
                  htmlFor="accept-notice"
                  className="cursor-pointer text-sm"
                >
                  I understand and wish to continue.
                </label>
              </div>
            </div>

            <DialogFooter>
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full"
                  disabled={!accepted}
                  onClick={handleAccept}
                >
                  Continue to Scholar Share
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  By continuing, you'll agree to our{" "}
                  <Link
                    to="/terms"
                    className="underline hover:text-foreground"
                  >
                    Terms & Conditions
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy"
                    className="underline hover:text-foreground"
                  >
                    Privacy Policy
                  </Link>.
                </p>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Toaster />
        <Sonner />

        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/database-data" element={<ProtectedRoute><YourData /></ProtectedRoute>} />
          <Route path="/my-orders" element={<StudentDashboard />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/help" element={<UserManual />} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
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
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SettingsBootstrap />
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ColorblindFilters />
      <CurrencyProvider>
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </CurrencyProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
