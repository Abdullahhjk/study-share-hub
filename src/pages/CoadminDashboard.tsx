import { useEffect, useState } from "react";
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
  MessageSquare,
  Layers,
  UserCheck,
  Settings,
  Loader2,
} from "lucide-react";

import { ActivityLogs } from "@/components/dashboard/ActivityLogs";
import { CategoryManagement } from "@/components/dashboard/CategoryManagement";
import { TeacherApprovalPanel } from "@/components/dashboard/TeacherApprovalPanel";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import OverviewTab from "@/components/admin/OverviewTab";
import UsersTab from "@/components/admin/UsersTab";
import NotificationsTab from "@/components/admin/NotificationsTab";
import PaymentsTab from "@/components/admin/PaymentsTab";
import ReportsTab from "@/components/admin/ReportsTab";
import FeedbackTab from "@/components/admin/FeedbackTab";

interface TabItem {
  value: string;
  label: string;
  icon: React.ReactNode;
}

export default function CoadminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const rawTab = searchParams.get("tab");

  const validTabs = new Set([
    "overview",
    "users",
    "categories",
    "notifications",
    "payments",
    "reports",
    "feedback",
    "activity",
    "approvals",
    "settings",
  ]);

  const safeTab = rawTab && validTabs.has(rawTab) ? rawTab : "overview";

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(safeTab);

  const { data: userRole } = useQuery({
    queryKey: ["coadmin-role", user?.id],
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

  const isCoadmin = userRole === "coadmin";

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
    if (userRole && !isCoadmin) navigate("/dashboard");
  }, [userRole, navigate, isCoadmin]);

  useEffect(() => {
    if (!rawTab || !validTabs.has(rawTab)) {
      setActiveTab("overview");
      return;
    }
    setActiveTab(rawTab);
  }, [rawTab]);

  const handleTabChange = (value: string) => {
    if (!validTabs.has(value)) return;
    setActiveTab(value);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("tab", value);
      return params;
    });
  };

  const tabs: TabItem[] = [
    { value: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
    { value: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { value: "categories", label: "Categories", icon: <Layers className="h-4 w-4" /> },
    { value: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { value: "payments", label: "Payments", icon: <DollarSign className="h-4 w-4" /> },
    { value: "reports", label: "Reports", icon: <Flag className="h-4 w-4" /> },
    { value: "feedback", label: "Feedback", icon: <MessageSquare className="h-4 w-4" /> },
    { value: "activity", label: "Activity", icon: <Activity className="h-4 w-4" /> },
    { value: "approvals", label: "Approvals", icon: <UserCheck className="h-4 w-4" /> },
    { value: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "overview": return <OverviewTab />;
      case "users": return <UsersTab userRole={userRole} />;
      case "categories": return <CategoryManagement />;
      case "notifications": return <NotificationsTab />;
      case "payments": return <PaymentsTab userRole={userRole} />;
      case "reports": return <ReportsTab />;
      case "feedback": return <FeedbackTab />;
      case "activity": return <ActivityLogs isAdmin />;
      case "approvals": return <TeacherApprovalPanel />;
      case "settings": return <ProfileSettings userId={user?.id} />;
      default: return null;
    }
  };

  if (loading || !user || !isCoadmin) {
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
        <div className="mb-6">
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Co-Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform oversight, content management, and administrative tools
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-4 items-start">
          <aside className="w-full md:w-64 space-y-1 bg-muted-background rounded-lg border p-2 md:sticky md:top-[110px] md:self-start">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Navigation
            </div>

            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    activeTab === tab.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-primary/50 hover:text-primary-foreground"
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
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
