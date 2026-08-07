import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import {
  Trash2,
  RotateCcw,
  Image,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Check,
  X,
  Eye,
  Download,
  CreditCard,
  Activity,
  History,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";
import { usePlatformSettings, commissionAsFraction } from "@/hooks/usePlatformSettings";
import { proxyImageUrl } from "@/lib/image-proxy";

type ProfileData = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  school_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type NoteData = {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  preview_image_url: string | null;
  is_free: boolean;
  price: number | null;
  school_name: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  purged_at: string | null;
  subcategory?: { name: string; category?: { name: string } };
};

type RequestData = {
  id: string;
  request_id: string;
  student_contact: string;
  contact_type: string;
  receipt_image_url: string;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  refund_screenshot_url: string | null;
  rejection_reason: string | null;
  request_notes: { notes: { title: string } }[];
};

type ActivityData = {
  id: string;
  action: string;
  category: string;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

type DeletedAvatar = {
  id: string;
  avatar_url: string;
  storage_path: string;
  is_active: boolean;
  crop_data: any;
  created_at: string;
  user_id: string;
};

type UserStats = {
  totalNotes: number;
  activeNotes: number;
  deletedNotes: number;
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  rejectedRequests: number;
  totalRevenue: number;
};

export default function YourData() {
  const { formatPrice } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "profile";

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [selectedAvatars, setSelectedAvatars] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; type: "notes" | "avatar" | "forever"; id?: string; count?: number }>({ open: false, type: "notes" });
  const [selectedRequest, setSelectedRequest] = useState<RequestData | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptImgLoading, setReceiptImgLoading] = useState(true);
  const [refundImgLoading, setRefundImgLoading] = useState(true);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: userRole } = useQuery({
    queryKey: ["yourdata-role", user?.id],
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

  const { data: platformSettings } = usePlatformSettings(user?.id);
  const commissionRate = platformSettings
    ? commissionAsFraction(platformSettings.commission)
    : 0;

  useEffect(() => {
    if (selectedRequest) {
      setReceiptImgLoading(true);
      setRefundImgLoading(true);
    }
  }, [selectedRequest]);

  // Handle tab change with URL sync
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();
      if (error) throw error;
      return data as ProfileData;
    },
    enabled: !!user?.id,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["user-data-stats", user?.id],
    queryFn: async () => {
      const [notesRes, deletedNotesRes, requestsRes] = await Promise.all([
        supabase
          .from("notes")
          .select("id", { count: "exact", head: true })
          .eq("teacher_id", user?.id)
          .is("purged_at", null),
        supabase
          .from("notes")
          .select("id", { count: "exact", head: true })
          .eq("teacher_id", user?.id)
          .not("deleted_at", "is", null)
          .is("purged_at", null),
        supabase
          .from("note_requests")
          .select("status, total_amount")
          .eq("teacher_id", user?.id),
      ]);

      const totalRevenue = (requestsRes.data || []).reduce((sum, r) =>
        r.status === "completed" ? sum + (r.total_amount || 0) : sum, 0
      );

      return {
        totalNotes: notesRes.count || 0,
        activeNotes: (notesRes.count || 0) - (deletedNotesRes.count || 0),
        deletedNotes: deletedNotesRes.count || 0,
        totalRequests: requestsRes.data?.length || 0,
        pendingRequests: requestsRes.data?.filter(r => r.status === "pending").length || 0,
        completedRequests: requestsRes.data?.filter(r => r.status === "completed").length || 0,
        rejectedRequests: requestsRes.data?.filter(r => r.status === "rejected").length || 0,
        totalRevenue,
      } as UserStats;
    },
    enabled: !!user?.id,
  });

  const { data: allNotes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["user-all-notes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*, subcategory:subcategories(name, category:categories(name))")
        .eq("teacher_id", user?.id)
        .is("purged_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as NoteData[];
    },
    enabled: !!user?.id,
  });

  const { data: deletedNotes = [], isLoading: trashLoading } = useQuery({
    queryKey: ["user-deleted-notes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*, subcategory:subcategories(name, category:categories(name))")
        .eq("teacher_id", user?.id)
        .not("deleted_at", "is", null)
        .is("purged_at", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as NoteData[];
    },
    enabled: !!user?.id,
  });

  const { data: allRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["user-all-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("note_requests")
        .select("*, request_notes(notes(title))")
        .eq("teacher_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as RequestData[];
    },
    enabled: !!user?.id,
  });

  const { data: activities = [], isLoading: activityLoading } = useQuery({
    queryKey: ["user-activities", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as ActivityData[];
    },
    enabled: !!user?.id,
  });

  const { data: deletedAvatars = [], isLoading: avatarsLoading } = useQuery({
    queryKey: ["user-deleted-avatars", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deleted_avatars")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as DeletedAvatar[];
    },
    enabled: !!user?.id,
  });

  const recoverNotes = useMutation({
    mutationFn: async (noteIds: string[]) => {
      const { error } = await supabase
        .from("notes")
        .update({ deleted_at: null })
        .in("id", noteIds);
      if (error) throw error;
    },
    onSuccess: (_, noteIds) => {
      queryClient.invalidateQueries({ queryKey: ["user-deleted-notes", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-all-notes", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-data-stats", user?.id] });
      setSelectedNotes(new Set());
      toast.success(`${noteIds.length} note(s) recovered successfully`);
    },
    onError: (e: any) => toast.error(e.message || "Failed to recover notes"),
  });

  const permanentlyDeleteNotes = useMutation({
    mutationFn: async (noteIds: string[]) => {
      const { error } = await supabase
        .from("notes")
        .update({ purged_at: new Date().toISOString() })
        .in("id", noteIds);
      if (error) throw error;
    },
    onSuccess: (_, noteIds) => {
      queryClient.invalidateQueries({ queryKey: ["user-deleted-notes", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-all-notes", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-data-stats", user?.id] });
      setSelectedNotes(new Set());
      toast.success(`${noteIds.length} note(s) removed from your view`);
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete notes"),
  });

  const setActiveAvatar = useMutation({
    mutationFn: async (avatar: DeletedAvatar) => {
      await supabase
        .from("deleted_avatars")
        .update({ is_active: false })
        .eq("user_id", user?.id)
        .eq("is_active", true);

      await supabase
        .from("deleted_avatars")
        .update({ is_active: true })
        .eq("id", avatar.id);

      await supabase
        .from("profiles")
        .update({ avatar_url: avatar.avatar_url })
        .eq("id", user?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-deleted-avatars", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Avatar set as active");
      setSelectedAvatars(new Set());
    },
    onError: (e: any) => toast.error(e.message || "Failed to set avatar"),
  });

  const deleteAvatar = useMutation({
    mutationFn: async (avatarId: string) => {
      const avatar = deletedAvatars.find(a => a.id === avatarId);
      if (avatar?.storage_path) {
        await supabase.storage.from("avatars").remove([avatar.storage_path]);
      }
      await supabase.from("deleted_avatars").delete().eq("id", avatarId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-deleted-avatars", user?.id] });
      toast.success("Avatar deleted");
      setSelectedAvatars(new Set());
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete avatar"),
  });

  const getDaysRemaining = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted);
    expiry.setDate(expiry.getDate() + 30);
    const days = differenceInDays(expiry, new Date());
    return Math.max(0, days);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-600 dark:text-yellow-400";
      case "completed": return "text-green-600 dark:text-green-400";
      case "rejected": return "text-destructive";
      case "verified": return "text-primary";
      default: return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "rejected": return <XCircle className="h-4 w-4" />;
      case "verified": return <Check className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const toggleNoteSelection = (id: string) => {
    const newSet = new Set(selectedNotes);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedNotes(newSet);
  };

  const toggleAvatarSelection = (id: string) => {
    const newSet = new Set(selectedAvatars);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedAvatars(newSet);
  };

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            Your Data
          </h1>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">
            Your data, organized, accessible, and fully under your control
          </p>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 border border-border mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-1 text-xs sm:text-sm">
              <User className="h-3.5 w-3.5" /> Profile
            </TabsTrigger>
            {!isCoadmin && (
              <TabsTrigger value="notes" className="flex items-center gap-1 text-xs sm:text-sm">
                <FileText className="h-3.5 w-3.5" /> Notes ({allNotes.length})
              </TabsTrigger>
            )}
            {!isCoadmin && (
              <TabsTrigger value="requests" className="flex items-center gap-1 text-xs sm:text-sm">
                <CreditCard className="h-3.5 w-3.5" /> Requests ({allRequests.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="activity" className="flex items-center gap-1 text-xs sm:text-sm">
              <Activity className="h-3.5 w-3.5" /> Activity
            </TabsTrigger>
            <TabsTrigger value="avatars" className="flex items-center gap-1 text-xs sm:text-sm">
              <Image className="h-3.5 w-3.5" /> Avatars
            </TabsTrigger>
            {!isCoadmin && (
              <TabsTrigger value="trash" className="flex items-center gap-1 text-xs sm:text-sm">
                <Trash2 className="h-3.5 w-3.5" /> Trash ({deletedNotes.length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* PROFILE TAB */}
          <TabsContent value="profile">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" /> Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Avatar"
                        className="h-24 w-24 rounded-full object-cover border-2 border-border"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-semibold border-2 border-border">
                        {(profile?.full_name || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-lg">{profile?.full_name || "No name set"}</p>
                      <p className="text-sm text-muted-foreground">
                        Member since {profile?.created_at ? format(new Date(profile.created_at), "MMM d, yyyy") : "Unknown"}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium">{profile?.email || "Not available"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm font-medium">{profile?.phone || "Not set"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">School/Institution</p>
                        <p className="text-sm font-medium">{profile?.school_name || "Not set"}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {isCoadmin ? <Shield className="h-5 w-5" /> : <History className="h-5 w-5" />}
                    {isCoadmin ? "Account Info" : "Quick Stats"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isCoadmin ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-5 w-5 text-primary" />
                          <span className="font-semibold">Co-Admin Account</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          You have platform oversight with access to user management, categories, notifications, reports, and administrative tools.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Role</p>
                          <p className="text-sm font-semibold flex items-center gap-1.5 mt-0.5">
                            <Shield className="h-3.5 w-3.5 text-primary" />
                            Co-Admin
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Account Type</p>
                          <p className="text-sm font-semibold mt-0.5">Administrative</p>
                        </div>
                      </div>
                    </div>
                  ) : statsLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{stats?.activeNotes || 0}</p>
                        <p className="text-xs text-muted-foreground">Active Notes</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{stats?.deletedNotes || 0}</p>
                        <p className="text-xs text-muted-foreground">Deleted Notes</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{stats?.pendingRequests || 0}</p>
                        <p className="text-xs text-muted-foreground">Pending Requests</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold text-success">{formatPrice(stats?.totalRevenue || 0)}</p>
                        <p className="text-xs text-muted-foreground">Total Revenue</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{stats?.completedRequests || 0}</p>
                        <p className="text-xs text-muted-foreground">Completed Requests</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold text-destructive">{formatPrice((stats?.totalRevenue || 0) * commissionRate)}</p>
                        <p className="text-xs text-muted-foreground">Amount Owed to Platform ({Math.round(commissionRate * 100)}%)</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* NOTES TAB */}
          <TabsContent value="notes">
            {isCoadmin ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium">Not available for co-admins</h3>
                  <p className="text-sm text-muted-foreground mt-1">Notes management is a teacher feature</p>
                </CardContent>
              </Card>
            ) : notesLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : allNotes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium">No notes uploaded</h3>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allNotes.map((note) => (
                  <Card key={note.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-semibold truncate flex-1">{note.title}</h4>
                        <Badge variant={note.is_free ? "secondary" : "default"}>
                          {note.is_free ? "Free" : formatPrice(note.price)}
                        </Badge>
                      </div>
                      {note.subcategory && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {note.subcategory.category?.name} → {note.subcategory.name}
                        </p>
                      )}
                      {note.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{note.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Created: {format(new Date(note.created_at), "MMM d, yyyy")}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(proxyImageUrl(note.file_url), "_blank")}>
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                        <Button variant="outline" size="sm" asChild className="flex-1">
                          <a href={proxyImageUrl(note.file_url)} download>
                            <Download className="h-3 w-3 mr-1" /> Download
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* REQUESTS TAB */}
          <TabsContent value="requests">
            {isCoadmin ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium">Not available for co-admins</h3>
                  <p className="text-sm text-muted-foreground mt-1">Payment requests are a teacher feature</p>
                </CardContent>
              </Card>
            ) : requestsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : allRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium">No requests yet</h3>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {allRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="font-mono text-xs sm:text-sm bg-muted px-2 py-1 rounded break-all">
                              {request.request_id}
                            </span>
                            <Badge variant="outline" className={getStatusColor(request.status)}>
                              {getStatusIcon(request.status)}
                              <span className="ml-1">
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </span>
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Contact</p>
                              <p className="font-medium break-all">{request.student_contact}</p>
                              <p className="text-xs text-muted-foreground">({request.contact_type})</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Amount</p>
                              <p className="font-medium">{formatPrice(request.total_amount)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Requested</p>
                              <p className="font-medium">{format(new Date(request.created_at), "MMM d, yyyy")}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Updated</p>
                              <p className="font-medium">{format(new Date(request.updated_at), "MMM d, yyyy")}</p>
                            </div>
                            <div className="lg:col-span-2">
                              <p className="text-xs text-muted-foreground">Notes Requested</p>
                              <p className="font-medium">{request.request_notes?.length || 0}</p>
                            </div>
                          </div>

                          {request.request_notes?.map((rn, index) => (
                            <div key={index} className="mt-3 p-3 bg-primary/5 rounded text-sm border border-primary/10">
                              <p className="font-medium text-primary text-xs mb-1">NOTE TITLE</p>
                              <p>{rn.notes?.title || "-"}</p>
                            </div>
                          ))}

                          {request.rejection_reason && (
                            <div className="mt-3 p-3 bg-destructive/5 rounded text-sm border border-destructive/20">
                              <p className="font-medium text-destructive text-xs mb-1">REJECTION REASON</p>
                              <p>{request.rejection_reason}</p>
                            </div>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto self-start"
                          onClick={() => {
                            setSelectedRequest(request);
                            setReceiptDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" /> View Receipt
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ACTIVITY TAB */}
          <TabsContent value="activity">
            {activityLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : activities.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium">No activity recorded</h3>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[70vh] sm:h-[600px]">
                    <div className="divide-y">
                      {activities.map((activity, index) => (
                        <div key={activity.id} className="p-4 flex flex-col sm:flex-row gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="hidden sm:flex items-center justify-center border-r pr-3 text-sm text-muted-foreground w-8">
                              {index + 1}.
                            </div>
                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center mt-0.5">
                              <Activity className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium capitalize">{activity.action.replace(/_/g, " ")}</p>
                              <p className="text-sm text-muted-foreground capitalize">
                                {activity.category.replace(/_/g, " ")}
                              </p>
                              {activity.details && Object.keys(activity.details).length > 0 && (
                                <pre className="text-xs mt-2 bg-muted/50 p-2 rounded overflow-auto max-h-32">
                                  {JSON.stringify(activity.details, null, 2)}
                                </pre>
                              )}
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground flex flex-col sm:items-end gap-1 text-right">
                            <p>{format(new Date(activity.created_at), "MMM d, yyyy • h:mm a")}</p>
                            {activity.ip_address && <p>IP: {activity.ip_address}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* AVATARS TAB */}
          <TabsContent value="avatars">
            {avatarsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : deletedAvatars.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Image className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium">No avatar history</h3>
                  <p className="text-sm text-muted-foreground mt-1">Previously used avatars appear here</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  <Button
                    variant="destructive"
                    disabled={selectedAvatars.size === 0 || deleteAvatar.isPending}
                    onClick={() => Array.from(selectedAvatars).forEach(id => deleteAvatar.mutate(id))}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Selected ({selectedAvatars.size})
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {deletedAvatars.map((avatar) => (
                    <Card key={avatar.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Checkbox
                            checked={selectedAvatars.has(avatar.id)}
                            onCheckedChange={() => toggleAvatarSelection(avatar.id)}
                          />
                          {avatar.is_active && (
                            <Badge variant="default" className="flex items-center gap-1">
                              <Check className="h-3 w-3" /> Active
                            </Badge>
                          )}
                        </div>
                        <img
                          src={avatar.avatar_url}
                          alt="Avatar"
                          className="w-full aspect-square object-cover rounded-md border"
                        />
                        <p className="text-xs text-muted-foreground mt-3">
                          Uploaded: {format(new Date(avatar.created_at), "MMM d, yyyy")}
                        </p>
                        <div className="flex gap-2 mt-4">
                          {!avatar.is_active && (
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1"
                              onClick={() => setActiveAvatar.mutate(avatar)}
                            >
                              <Check className="h-3 w-3 mr-1" /> Set Active
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setConfirmDelete({ open: true, type: "avatar", id: avatar.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* TRASH TAB */}
          <TabsContent value="trash">
            {isCoadmin ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium">Not available for co-admins</h3>
                  <p className="text-sm text-muted-foreground mt-1">Note trash is a teacher feature</p>
                </CardContent>
              </Card>
            ) : trashLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : deletedNotes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Trash2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium">Trash is empty</h3>
                  <p className="text-sm text-muted-foreground mt-1">Deleted notes stay here for 30 days</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Alert className="mb-4 border-muted bg-muted/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Deleted notes are recoverable for 30 days</AlertTitle>
                  <AlertDescription>
                    After 30 days, notes are auto-purged. "Delete Forever" removes them from your view immediately,
                    but they remain in our system for <strong>15 days</strong> as per retention policy.
                  </AlertDescription>
                </Alert>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    variant="default"
                    disabled={selectedNotes.size === 0 || recoverNotes.isPending}
                    onClick={() => recoverNotes.mutate(Array.from(selectedNotes))}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" /> Recover Selected ({selectedNotes.size})
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={selectedNotes.size === 0 || permanentlyDeleteNotes.isPending}
                    onClick={() => setConfirmDelete({ open: true, type: "forever", count: selectedNotes.size })}
                  >
                    <X className="h-4 w-4 mr-2" /> Delete Forever ({selectedNotes.size})
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {deletedNotes.map((note) => {
                    const daysLeft = getDaysRemaining(note.deleted_at!);
                    return (
                      <Card key={note.id} className="overflow-hidden group">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Checkbox
                                checked={selectedNotes.has(note.id)}
                                onCheckedChange={() => toggleNoteSelection(note.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold truncate">{note.title}</h4>
                                {note.subcategory && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {note.subcategory.category?.name} → {note.subcategory.name}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge variant={daysLeft <= 7 ? "destructive" : "secondary"}>
                              {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                            </Badge>
                          </div>

                          {note.preview_image_url && (
                            <img
                              src={proxyImageUrl(note.preview_image_url)}
                              alt={note.title}
                              className="w-full h-40 object-cover rounded-md mb-3"
                            />
                          )}

                          <p className="text-xs text-muted-foreground mb-4">
                            Deleted: {format(new Date(note.deleted_at!), "MMM d, yyyy")}
                          </p>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => window.open(proxyImageUrl(note.file_url), "_blank")}
                            >
                              <Eye className="h-3 w-3 mr-1" /> View
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1"
                              onClick={() => recoverNotes.mutate([note.id])}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" /> Recover
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDelete.open} onOpenChange={(open) => !open && setConfirmDelete({ open: false, type: "notes" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDelete.type === "forever" ? "Delete Forever" : "Confirm Permanent Deletion"}
            </DialogTitle>
            <DialogDescription>
              {confirmDelete.type === "forever"
                ? `${confirmDelete.count} note(s) will be removed from your view.`
                : confirmDelete.type === "avatar"
                  ? "This avatar will be permanently deleted from storage."
                  : "This item will be permanently deleted and cannot be recovered."}
            </DialogDescription>
          </DialogHeader>

          {confirmDelete.type === "forever" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Retention Policy</AlertTitle>
              <AlertDescription>
                Deleted items remain in our system for <strong>15 days</strong> as per our data retention policy.
                You will not be able to recover them after this action. Contact support if you need assistance within the retention period.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete({ open: false, type: "notes" })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (confirmDelete.type === "forever" && confirmDelete.count) {
                  permanentlyDeleteNotes.mutate(Array.from(selectedNotes));
                } else if (confirmDelete.type === "avatar" && confirmDelete.id) {
                  deleteAvatar.mutate(confirmDelete.id);
                }
                setConfirmDelete({ open: false, type: "notes" });
              }}
            >
              {confirmDelete.type === "forever" ? "Yes, Delete Forever" : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Receipt Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CreditCard className="h-5 w-5" />
              Request Details — {selectedRequest?.request_id}
            </DialogTitle>
            <DialogDescription>
              Payment and refund documentation
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="mt-4 sm:mt-6 space-y-5 sm:space-y-6">
              {/* layout */}
              <div
                className={`grid gap-4 sm:gap-6 ${selectedRequest.status === "refunded" &&
                  selectedRequest.refund_screenshot_url
                  ? "grid-cols-1 lg:grid-cols-2"
                  : "grid-cols-1"
                  }`}
              >
                {/* Payment */}
                <div className="border rounded-xl p-3 sm:p-5">
                  <h4 className="font-semibold flex items-center gap-2 mb-3 sm:mb-4 text-sm sm:text-base">
                    <DollarSign className="h-5 w-5" />
                    Payment Receipt
                  </h4>

                  <div className="relative">
                    {receiptImgLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-lg">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    )}

                    <img
                      src={proxyImageUrl(selectedRequest.receipt_image_url)}
                      alt="Payment Receipt"
                      className="w-full rounded-lg border max-h-[260px] sm:max-h-[420px] object-contain"
                      onLoad={() => setReceiptImgLoading(false)}
                      onError={() => setReceiptImgLoading(false)}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-4">
                    <Button variant="outline" asChild className="w-full sm:flex-1">
                      <a
                        href={proxyImageUrl(selectedRequest.receipt_image_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </a>
                    </Button>

                    <Button variant="outline" asChild className="w-full sm:flex-1">
                      <a
                        href={proxyImageUrl(selectedRequest.receipt_image_url)}
                        download
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Refund */}
                {selectedRequest.status === "refunded" &&
                  selectedRequest.refund_screenshot_url && (
                    <div className="border rounded-xl p-3 sm:p-5">
                      <h4 className="font-semibold flex items-center gap-2 mb-3 sm:mb-4 text-sm sm:text-base">
                        <DollarSign className="h-5 w-5" />
                        Refund Receipt
                      </h4>

                      <div className="relative">
                        {refundImgLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-lg">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        )}

                        <img
                          src={proxyImageUrl(selectedRequest.refund_screenshot_url)}
                          alt="Refund Receipt"
                          className="w-full rounded-lg border max-h-[260px] sm:max-h-[420px] object-contain"
                          onLoad={() => setRefundImgLoading(false)}
                          onError={() => setRefundImgLoading(false)}
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-4">
                        <Button variant="outline" asChild className="w-full sm:flex-1">
                          <a
                            href={proxyImageUrl(selectedRequest.refund_screenshot_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open
                          </a>
                        </Button>

                        <Button variant="outline" asChild className="w-full sm:flex-1">
                          <a
                            href={proxyImageUrl(selectedRequest.refund_screenshot_url)}
                            download
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
              </div>

              {/* Notes */}
              {selectedRequest.request_notes?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <FileText className="h-4 w-4" />
                    Requested Notes
                  </h4>

                  <div className="space-y-2">
                    {selectedRequest.request_notes.map((rn, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{rn.notes?.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection */}
              {selectedRequest.rejection_reason && (
                <div className="p-3 sm:p-4 border border-destructive/30 bg-destructive/5 rounded-xl">
                  <p className="font-medium text-destructive flex items-center gap-2 mb-2 text-sm sm:text-base">
                    <XCircle className="h-4 w-4" />
                    Rejection Reason
                  </p>
                  <p className="text-sm sm:text-base">
                    {selectedRequest.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4 sm:mt-6">
            <Button onClick={() => setReceiptDialogOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}