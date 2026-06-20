import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import { cn } from "@/lib/utils";
import {
  Users,
  Bell,
  DollarSign,
  Shield,
  BarChart3,
  Activity,
  Flag,
  Hammer,
  MessageSquare,
  Rocket,
  Loader2,
  Plus,
  Send,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { ActivityLogs } from "@/components/dashboard/ActivityLogs";
import OverviewTab from "@/components/admin/OverviewTab";
import UsersTab from "@/components/admin/UsersTab";
import NotificationsTab from "@/components/admin/NotificationsTab";
import PaymentsTab from "@/components/admin/PaymentsTab";
import ReportsTab from "@/components/admin/ReportsTab";
import BuildReportTab from "@/components/admin/BuildReportTab";
import FeedbackTab from "@/components/admin/FeedbackTab";
import UpcomingFeaturesTab from "@/components/admin/UpcomingFeaturesTab";

interface TabItem {
  value: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const restrictedTabs = new Set(["buildReport", "upcomingFeatures"]);

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const rawTab = searchParams.get("tab");

  const validTabs = new Set([
    "overview",
    "users",
    "notifications",
    "payments",
    "reports",
    "feedback",
    "activity",
    "buildReport",
    "upcomingFeatures",
  ]);

  const safeTab = rawTab && validTabs.has(rawTab) ? rawTab : "overview";

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(safeTab);

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      return data?.role;
    },
    enabled: !!user?.id,
  });

  const isAdmin = userRole === "admin";
  const isCoadmin = userRole === "coadmin";
  const allowedTab = isAdmin || isCoadmin;




  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login");
        return;
      }

      setUser(session.user);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (userRole && !allowedTab) navigate("/dashboard");
  }, [userRole, navigate, allowedTab]);

  useEffect(() => {
    if (!rawTab || !validTabs.has(rawTab)) {
      setActiveTab("overview");
      return;
    }
    if (!isAdmin && restrictedTabs.has(rawTab)) {
      setActiveTab("overview");
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("tab", "overview");
        return params;
      });
      return;
    }
    setActiveTab(rawTab);
  }, [rawTab, isAdmin]);

  const handleTabChange = (value: string) => {
    if (!validTabs.has(value)) return;
    if (!isAdmin && restrictedTabs.has(value)) return;
    setActiveTab(value);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("tab", value);
      return params;
    });
  };

  const allTabs: TabItem[] = [
    { value: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
    { value: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { value: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { value: "payments", label: "Payments", icon: <DollarSign className="h-4 w-4" /> },
    { value: "reports", label: "Reports", icon: <Flag className="h-4 w-4" /> },
    { value: "feedback", label: "Feedback", icon: <MessageSquare className="h-4 w-4" /> },
    { value: "activity", label: "Activity", icon: <Activity className="h-4 w-4" /> },
    { value: "buildReport", label: "Build ChangeLog", icon: <Hammer className="h-4 w-4" />, adminOnly: true },
    { value: "upcomingFeatures", label: "Upcoming", icon: <Rocket className="h-4 w-4" />, adminOnly: true },

  ];

  const tabs = allTabs.filter(t => isAdmin || !t.adminOnly);

  const sidebarDescriptions: Record<string, string> = {
    overview: "Platform metrics & insights",
    users: "Manage accounts & roles",
    notifications: "Send & manage alerts",
    payments: "Transaction history",
    reports: "Flagged content & users",
    feedback: "User-submitted feedback",
    activity: "Recent platform activity",
    buildReport: "Track changes & releases",
    upcomingFeatures: "Plan upcoming features",

  };

  const quickActions = [
    { label: "Create User", icon: <Plus className="h-4 w-4" />, tab: "users", adminOnly: true },
    { label: "Send Notification", icon: <Send className="h-4 w-4" />, tab: "notifications", adminOnly: false },
    { label: "View Payments", icon: <Wallet className="h-4 w-4" />, tab: "payments", adminOnly: false },
    { label: "View Reports", icon: <AlertTriangle className="h-4 w-4" />, tab: "reports", adminOnly: false },
  ];

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "overview": return <OverviewTab />;
      case "users": return <UsersTab userRole={userRole} />;
      case "notifications": return <NotificationsTab />;
      case "payments": return <PaymentsTab userRole={userRole} />;
      case "reports": return <ReportsTab />;
      case "feedback": return <FeedbackTab />;
      case "activity": return <ActivityLogs isAdmin />;
      case "buildReport": return isAdmin ? <BuildReportTab /> : null;
      case "upcomingFeatures": return isAdmin ? <UpcomingFeaturesTab /> : null;

      default: return null;
    }
  };

  if (loading || !user || !allowedTab) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-4 sm:py-8">
        <div className="relative mb-6 overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-background to-accent/5 p-4 sm:p-6">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-primary/5 blur-3xl" />
          <div className="relative">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />

              {greeting},{" "}

              <span className="bg-gradient-to-r from-primary to-[hsl(195_100%_65%)] bg-clip-text text-transparent">
                {userProfile?.full_name || (isAdmin ? "Admin" : "Co-Admin")}
              </span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin ? "Full platform management and financial overview" : "Platform oversight with limited management access"}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickActions.filter(a => isAdmin || !a.adminOnly).map(action => (
              <Button
                key={action.tab}
                variant="secondary"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => handleTabChange(action.tab)}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[clamp(3rem,22vw,16rem)_1fr] gap-4 items-start transition-all duration-300">
          <aside className="@container w-full space-y-1 bg-muted-background rounded-lg border p-2 md:sticky md:top-[110px] md:self-start overflow-hidden transition-all duration-300">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Navigation
            </div>

            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className={cn(
                    "w-full flex flex-col items-start gap-0 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    activeTab === tab.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                  <span className={cn(
                    "text-[10px] leading-tight mt-0.5 ml-7",
                    activeTab === tab.value ? "text-primary-foreground/70" : "text-muted-foreground/60"
                  )}>
                    {sidebarDescriptions[tab.value]}
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          <div className="min-w-0">
            <div key={activeTab} className="rounded-lg border bg-card p-4 sm:p-6 animate-in fade-in duration-300">
              {renderContent()}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
