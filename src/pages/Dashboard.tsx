import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";

import {
  FileText,
  Users,
  BarChart3,
  Settings,
  TrendingUp,
  Upload,
  Inbox,
  List,
  Undo2,
  RefreshCw,
  UserCheck,
  Clock,
  AlertCircle,
  Activity,
  Bell,
  Flag,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadNoteForm } from "@/components/dashboard/UploadNoteForm";
import { TeacherNotesList } from "@/components/dashboard/TeacherNotesList";
import { RequestManagement } from "@/components/dashboard/RequestManagement";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { CategoryManagement } from "@/components/dashboard/CategoryManagement";
import { TeacherAnalytics } from "@/components/dashboard/TeacherAnalytics";
import { RefundManagement } from "@/components/dashboard/RefundManagement";
import { TeacherApprovalPanel } from "@/components/dashboard/TeacherApprovalPanel";
import { ActivityLogs } from "@/components/dashboard/ActivityLogs";
import { TeacherReports } from "@/components/dashboard/TeacherReports";
import { TeacherNotifications } from "@/components/dashboard/TeacherNotifications";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { Badge } from "@/components/ui/badge";

interface TabItem {
  value: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

export default function Dashboard() {
  const { formatPrice } = useCurrency();
  const validTabs = new Set([
    "notes",
    "upload",
    "requests",
    "refunds",
    "analytics",
    "categories",
    "activity",
    "notifications",
    "reports",
    "approvals",
    "settings",
  ]);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const rawTab = searchParams.get("tab");
  const safeTab = rawTab && validTabs.has(rawTab) ? rawTab : "notes";

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [revenueData, setRevenueData] = useState(0);
  const [activeTab, setActiveTab] = useState(safeTab);

  useEffect(() => {
    if (!rawTab || !validTabs.has(rawTab)) {
      setActiveTab("notes");
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

  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.role;
    },
    enabled: !!user?.id,
  });

  const isAdmin = userRole === "admin";
  const isTeacher = userRole === "teacher";
  const isPending = userRole === "pending";

  const isApproved = isAdmin || isTeacher;
  const isDenied = (userRole as string) === "rejected" && !isApproved;
  const isDeleted = (userRole as string) === "deleted";

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
    if (!user?.id) return;

    const channel = supabase
      .channel("teacher-dashboard-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "note_requests",
          filter: `teacher_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["teacher-revenues", user.id] });
          queryClient.invalidateQueries({ queryKey: ["teacher-stats", user.id] });
          queryClient.invalidateQueries({ queryKey: ["rejected-requests", user.id] });
          queryClient.invalidateQueries({ queryKey: ["teacher-requests", user.id] });
          queryClient.invalidateQueries({ queryKey: ["analytics-status", user.id] });
          queryClient.invalidateQueries({ queryKey: ["analytics-monthly", user.id] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const { data: revenues } = useQuery({
    queryKey: ["teacher-revenues", user?.id],
    queryFn: async () => {
      if (!user?.id)
        return [
          { total_sum: 0, total_length: 0 },
          { total_sum: 0, total_length: 0 },
          { total_sum: 0, total_length: 0 },
        ];

      const { data: requests, error } = await supabase
        .from("note_requests")
        .select("status, total_amount")
        .eq("teacher_id", user.id);

      if (error) throw error;

      const completed = { total_sum: 0, total_length: 0 };
      const rejected = { total_sum: 0, total_length: 0 };
      const pending = { total_sum: 0, total_length: 0 };

      requests?.forEach((req) => {
        const amount = req.total_amount || 0;

        if (req.status === "completed") {
          completed.total_sum += amount;
          completed.total_length += 1;
        } else if (req.status === "rejected") {
          rejected.total_sum += amount;
          rejected.total_length += 1;
        } else if (req.status === "pending") {
          pending.total_sum += amount;
          pending.total_length += 1;
        }
      });

      return [completed, rejected, pending];
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const [
    completed = { total_sum: 0, total_length: 0 },
    rejected = { total_sum: 0, total_length: 0 },
    pending = { total_sum: 0, total_length: 0 },
  ] = revenues ?? [];

  useEffect(() => {
    setRevenueData(
      completed.total_sum - rejected.total_sum + pending.total_sum
    );
  }, [completed, rejected, pending]);

  const { data: stats } = useQuery({
    queryKey: ["teacher-stats", user?.id],
    queryFn: async () => {
      if (!user?.id)
        return { notesCount: 0, pendingRequests: 0, completedRequests: 0 };

      const [notesResult, pendingResult, completedResult] = await Promise.all([
        supabase
          .from("notes")
          .select("id", { count: "exact" })
          .eq("teacher_id", user.id),
        supabase
          .from("note_requests")
          .select("id", { count: "exact" })
          .eq("teacher_id", user.id)
          .eq("status", "pending"),
        supabase
          .from("note_requests")
          .select("id,total_amount", { count: "exact" })
          .eq("teacher_id", user.id)
          .eq("status", "completed"),
      ]);

      return {
        notesCount: notesResult.count || 0,
        pendingRequests: pendingResult.count || 0,
        completedRequests: completedResult.count || 0,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  const refreshDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ["teacher-revenues"] });
    queryClient.invalidateQueries({ queryKey: ["teacher-stats"] });
    queryClient.invalidateQueries({ queryKey: ["teacher-requests"] });
    queryClient.invalidateQueries({ queryKey: ["rejected-requests"] });
    queryClient.invalidateQueries({ queryKey: ["analytics-status"] });
    queryClient.invalidateQueries({ queryKey: ["analytics-monthly"] });
  };

  const tabs: TabItem[] = [
    { value: "notes", label: "My Notes", icon: <FileText className="h-4 w-4" /> },
    { value: "upload", label: "Upload", icon: <Upload className="h-4 w-4" /> },
    { value: "requests", label: "Requests", icon: <Inbox className="h-4 w-4" /> },
    { value: "refunds", label: `Refunds | ${rejected.total_length > 0 ? rejected.total_length > 9 ? "9+" : rejected.total_length : ""}`, icon: <Undo2 className="h-4 w-4" /> },
    { value: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
    { value: "categories", label: "Categories", icon: <List className="h-4 w-4" /> },
    { value: "activity", label: "Activity", icon: <Activity className="h-4 w-4" /> },
    { value: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { value: "reports", label: "Reports", icon: <Flag className="h-4 w-4" /> },
    { value: "approvals", label: "Approvals", icon: <UserCheck className="h-4 w-4" />, adminOnly: true },
    { value: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  const renderContent = () => {
    switch (activeTab) {
      case "notes":
        return isPending || isDenied || isDeleted ? (
          <Alert className="border-warning bg-warning/10">
            <Clock className="h-4 w-4 text-warning" />
            <AlertTitle>Notes Disabled</AlertTitle>
            <AlertDescription>
              You cannot access notes until your account is approved by an admin.
            </AlertDescription>
          </Alert>
        ) : (
          <TeacherNotesList teacherId={user?.id} />
        );

      case "requests":
        return <RequestManagement teacherId={user?.id} />;
      case "refunds":
        return <RefundManagement teacherId={user?.id} />;
      case "analytics":
        return <TeacherAnalytics teacherId={user?.id} />;
      case "upload":
        return (
          <div className="max-w-2xl">
            {isPending || isDenied || isDeleted ? (
              <Alert className="border-warning bg-warning/10">
                <Clock className="h-4 w-4 text-warning" />
                <AlertTitle>Upload Disabled</AlertTitle>
                <AlertDescription>
                  You cannot upload notes until your account is approved by an admin.
                </AlertDescription>
              </Alert>
            ) : (
              <UploadNoteForm />
            )}
          </div>
        );

      case "categories":
        return isPending || isDenied || isDeleted ? (
          <Alert className="border-warning bg-warning/10">
            <Clock className="h-4 w-4 text-warning" />
            <AlertTitle>Categories Disabled</AlertTitle>
            <AlertDescription>
              You cannot manage categories until your account is approved by an admin.
            </AlertDescription>
          </Alert>
        ) : (
          <CategoryManagement />
        );

      case "settings":
        return <ProfileSettings userId={user?.id} />;
      case "activity":
        return <ActivityLogs userId={user?.id} />;
      case "notifications":
        return <TeacherNotifications userId={user?.id} />;
      case "reports":
        return <TeacherReports teacherId={user?.id} />;
      case "approvals":
        return isAdmin ? <TeacherApprovalPanel /> : null;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold">
            Teacher Dashboard
          </h1>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">
            Manage your notes and view student requests
          </p>

          <br />

          <Button variant="outline" onClick={refreshDashboard}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </div>

        {/* Pending Approval Alert */}
        {isPending && (
          <Alert className="mb-6 border-warning bg-warning/10">
            <Clock className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning">
              Account Pending Approval
            </AlertTitle>
            <AlertDescription>
              Your teacher account is awaiting admin approval. You'll be able to
              fully use this app after admin approval. You'll receive an email
              regarding admin approval.
            </AlertDescription>
          </Alert>
        )}
        {isDenied && (
          <Alert className="mb-6 border-destructive bg-destructive/10">
            <AlertTitle className="text-destructive flex">
              <AlertCircle className="h-4 w-4 mr-2" /> Account Approval Denied
            </AlertTitle>
            <AlertDescription className="ml-6">
              Your teacher account approval has been denied. An email with more
              details regarding this decision has been sent to your registered
              email address. Please note that this account will be automatically
              deleted in 7 days. You can still access this site to buy notes.
            </AlertDescription>
          </Alert>
        )}
        {isDeleted && (
          <Alert className="mb-6 border-destructive bg-destructive/10">
            <AlertTitle className="text-destructive flex">
              <AlertCircle className="h-4 w-4 mr-2" /> Account Deleted
            </AlertTitle>
            <AlertDescription className="ml-6">
              Your teacher account has been deleted. An email with more details
              regarding this decision will be sent to your registered email
              address. All of your data was deleted.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Total Notes
              </CardTitle>
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl font-bold">
                {stats?.notesCount || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Uploaded notes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Pending
              </CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-warning" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl font-bold text-warning">
                {stats?.pendingRequests || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatPrice(pending.total_sum)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Completed
              </CardTitle>
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl font-bold text-success">
                {stats?.completedRequests || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatPrice(completed.total_sum)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Rejected
              </CardTitle>
              <Undo2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl font-bold text-destructive">
                {rejected.total_length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatPrice(rejected.total_sum)} to refund
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Total Requests
              </CardTitle>
              <Inbox className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl font-bold text-primary">
                {(stats?.pendingRequests || 0) +
                  (stats?.completedRequests || 0) +
                  (rejected.total_length || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Net Revenue
              </CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div
                className={`text-lg sm:text-2xl font-bold ${revenueData > 0
                  ? "text-success"
                  : revenueData < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
                  }`}
              >
                {formatPrice(revenueData)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                After refunds
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 sm:mt-8 grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-4 items-start">
          <aside className="w-full md:w-64 space-y-1 bg-muted-background rounded-lg border p-2 md:sticky md:top-[110px] md:self-start">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Navigation
            </div>

            <nav className="space-y-1">
              {visibleTabs.map((tab) => (
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
                  <span>
                    {tab.label.includes("|") ? (
                      (() => {
                        const [label, badge] = tab.label.split("|").map((s) => s.trim());

                        return (
                          <>
                            {label}

                            {badge && (
                              <Badge
                                variant="destructive"
                                className="ml-2 px-2 py-0 text-xs"
                              >
                                {badge}
                              </Badge>
                            )}
                          </>
                        );
                      })()
                    ) : (
                      tab.label
                    )}
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