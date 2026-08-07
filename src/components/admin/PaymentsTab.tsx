import { useState, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import {
  Search, ChevronDown, ChevronRight, DollarSign, TrendingUp,
  BarChart3, Loader2, CheckCircle2, Phone, CreditCard,
  Landmark, XCircle, Eye, Clock, ThumbsUp, ThumbsDown,
  Settings, Plus, Trash2, Building2, Pencil,
} from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { StatCard } from "./OverviewTab";
import { format } from "date-fns";
import { proxyImageUrl } from "@/lib/image-proxy";
import { commissionAsFraction, DEFAULT_COMMISSION_PERCENT } from "@/hooks/usePlatformSettings";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface PaymentsTabProps {
  userRole?: string;
}

export default function PaymentsTab({ userRole }: PaymentsTabProps) {
  const isCoadmin = userRole === "coadmin";
  const { formatPrice } = useCurrency();
  const qc = useQueryClient();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "overdue">("all");
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<{
    teacherId: string;
    teacherName: string;
    month: number;
    year: number;
    amount: number;
  } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payReference, setPayReference] = useState("");

  const [verifyDialog, setVerifyDialog] = useState<{
    recordId: string;
    teacherName: string;
    period: string;
    amount: number;
    paidAmount: number;
  } | null>(null);
  const [verifyAmount, setVerifyAmount] = useState("");
  const [verifyRef, setVerifyRef] = useState("");

  const [rejectDialog, setRejectDialog] = useState<{
    recordId: string;
    teacherName: string;
    period: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [credForm, setCredForm] = useState({ id: "", name: "", type: "easypaisa", account_number: "", account_holder: "", bank_name: "", iban: "", is_active: true });

  const { data: credentials, isLoading: credLoading } = useQuery({
    queryKey: ["payment-credentials"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_credentials").select("*").order("sort_order");
      return data || [];
    },
  });

  const saveCredential = useMutation({
    mutationFn: async () => {
      if (credForm.id) {
        const { error } = await supabase.from("payment_credentials").update({
          name: credForm.name, type: credForm.type, account_number: credForm.account_number || null,
          account_holder: credForm.account_holder || null, bank_name: credForm.bank_name || null,
          iban: credForm.iban || null, is_active: credForm.is_active,
        }).eq("id", credForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payment_credentials").insert({
          name: credForm.name, type: credForm.type, account_number: credForm.account_number || null,
          account_holder: credForm.account_holder || null, bank_name: credForm.bank_name || null,
          iban: credForm.iban || null, is_active: credForm.is_active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-credentials"] });
      setCredForm({ id: "", name: "", type: "easypaisa", account_number: "", account_holder: "", bank_name: "", iban: "", is_active: true });
      toast.success(credForm.id ? "Credential updated" : "Credential added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCredential = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_credentials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-credentials"] });
      toast.success("Credential deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments-v2"],
    queryFn: async () => {
      const [profilesRes, recordsRes, requestsRes, rolesRes, settingsRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, phone, is_blocked"),
        supabase.from("payment_records").select("*").order("year", { ascending: false }).order("month", { ascending: false }),
        supabase.from("note_requests").select("teacher_id, total_amount, status, created_at"),
        supabase.from("user_roles").select("user_id, settings_id"),
        supabase.from("platform_settings").select("id, commission"),
      ]);

      const settingsMap = new Map((settingsRes.data || []).map(s => [s.id, s.commission]));
      const teacherSettingsId = new Map((rolesRes.data || []).map(r => [r.user_id, r.settings_id]));

      const profiles = (profilesRes.data || []).filter(p =>
        ["teacher", "admin"].some(r => true)
      );
      const records = recordsRes.data || [];
      const requests = requestsRes.data || [];

      const teacherIds = new Set(records.map(r => r.teacher_id));
      requests.forEach(r => teacherIds.add(r.teacher_id));

      const teacherProfiles = profiles.filter(p => teacherIds.has(p.id));

      const teachers = await Promise.all(teacherProfiles.map(async (profile) => {
        const teacherRecords = records.filter(r => r.teacher_id === profile.id);

        const teacherRequests = requests.filter(r => r.teacher_id === profile.id);
        const completedRevenue = teacherRequests
          .filter(r => r.status === "completed")
          .reduce((s, r) => s + (r.total_amount || 0), 0);
        const settingsId = teacherSettingsId.get(profile.id);
        const commissionPercent = settingsId ? settingsMap.get(settingsId) : undefined;
        const commissionRate = commissionAsFraction(commissionPercent ?? DEFAULT_COMMISSION_PERCENT);
        const monthlyCommission = completedRevenue * commissionRate;

        const unpaidBalance = teacherRecords
          .filter(r => r.status !== "verified")
          .reduce((s, r) => s + (r.amount - r.paid_amount), 0);

        const lastPaidRecord = [...teacherRecords]
          .filter(r => r.status === "verified")
          .sort((a, b) => b.year - a.year || b.month - a.month)[0];

        const monthsSinceLastPaid = lastPaidRecord
          ? ((currentYear - lastPaidRecord.year) * 12 + currentMonth - lastPaidRecord.month)
          : 0;

        const hasCurrentMonthRecord = teacherRecords.some(
          r => r.year === currentYear && r.month === currentMonth
        );

        const sortedRecords = [...teacherRecords].sort(
          (a, b) => b.year - a.year || b.month - a.month
        );

        return {
          id: profile.id,
          name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          isBlocked: profile.is_blocked,
          completedRevenue,
          monthlyCommission,
          commissionRate,
          unpaidBalance: Math.round(unpaidBalance * 100) / 100,
          lastPaid: lastPaidRecord
            ? `${MONTHS[lastPaidRecord.month - 1]} ${lastPaidRecord.year}`
            : "Never",
          monthsSinceLastPaid,
          hasCurrentMonthRecord,
          records: sortedRecords,
        };
      }));

      const totalAllTimeCommission = teachers.reduce((s, t) => s + t.monthlyCommission, 0);
      const totalUnpaid = teachers.reduce((s, t) => s + t.unpaidBalance, 0);
      const totalPaidThisYear = records
        .filter(r => r.status === "verified" && r.year === currentYear)
        .reduce((s, r) => s + r.paid_amount, 0);

      return {
        teachers: teachers.sort((a, b) => b.unpaidBalance - a.unpaidBalance),
        totalAllTimeCommission: Math.round(totalAllTimeCommission * 100) / 100,
        totalUnpaid: Math.round(totalUnpaid * 100) / 100,
        totalPaidThisYear: Math.round(totalPaidThisYear * 100) / 100,
        teacherCount: teachers.length,
      };
    },
  });

  const recordPayment = useMutation({
    mutationFn: async ({
      teacherId, year, month, amount, reference,
    }: {
      teacherId: string;
      year: number;
      month: number;
      amount: number;
      reference: string;
    }) => {
      const { error } = await supabase.rpc("record_teacher_payment", {
        p_teacher_id: teacherId,
        p_year: year,
        p_month: month,
        p_amount: amount,
        p_method: "easypaisa",
        p_reference: reference || null,
        p_notes: "Payment recorded via admin panel",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payments-v2"] });
      setPayDialog(null);
      setPayAmount("");
      setPayReference("");
      toast.success("Payment recorded successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const verifyPayment = useMutation({
    mutationFn: async ({ recordId, amount, reference }: { recordId: string; amount: number; reference: string }) => {
      const { error } = await supabase.rpc("verify_teacher_payment", {
        p_record_id: recordId,
        p_verified_by: (await supabase.auth.getUser()).data.user?.id,
        p_paid_amount: amount,
        p_reference_number: reference || null,
        p_notes: "Verified via admin panel",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payments-v2"] });
      setVerifyDialog(null);
      setVerifyAmount("");
      setVerifyRef("");
      toast.success("Payment verified");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectPayment = useMutation({
    mutationFn: async ({ recordId, reason }: { recordId: string; reason: string }) => {
      const { error } = await supabase.rpc("reject_payment_proof", {
        p_record_id: recordId,
        p_reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payments-v2"] });
      setRejectDialog(null);
      setRejectReason("");
      toast.success("Payment proof rejected");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const generateMonthlyRecord = useMutation({
    mutationFn: async ({ teacherId }: { teacherId: string }) => {
      const { error } = await supabase.rpc("generate_monthly_payment_record", {
        p_teacher_id: teacherId,
        p_year: currentYear,
        p_month: currentMonth,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payments-v2"] });
      toast.success("Monthly record generated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredTeachers = (data?.teachers || []).filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTab === "pending") return t.records.some(r => r.status === "pending");
    if (filterTab === "overdue") return t.unpaidBalance > 0 && t.monthsSinceLastPaid > 0;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge variant="secondary" className="bg-success/10 text-success border-success/30">Verified</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/30">Pending</Badge>;
      case "partial":
        return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/30">Partial</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">Unpaid</Badge>;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6 mt-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Teachers Tracked" value={data.teacherCount} icon={<BarChart3 className="h-4 w-4" />} sub="With payment records" />
        <StatCard title="Total Unpaid" value={formatPrice(data.totalUnpaid)} icon={<DollarSign className="h-4 w-4 text-warning" />} sub="Outstanding balance" color="text-warning" />
        <StatCard title="Collected This Year" value={formatPrice(data.totalPaidThisYear)} icon={<TrendingUp className="h-4 w-4 text-success" />} sub={`${currentYear}`} color="text-success" />
        <StatCard title="All-Time Commission" value={formatPrice(data.totalAllTimeCommission)} icon={<DollarSign className="h-4 w-4 text-primary" />} sub="Calculated from each teacher's assigned settings" color="text-primary" />
      </div>

      {!isCoadmin && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" />
                  Payment Credentials
                </CardTitle>
                <CardDescription>
                  Payment methods teachers see when submitting dues
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"
                onClick={() => { setCredForm({ id: "", name: "", type: "easypaisa", account_number: "", account_holder: "", bank_name: "", iban: "", is_active: true }); setCredDialogOpen(true); }}>
                <Settings className="h-3 w-3" /> Manage
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {credLoading ? (
              <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : !credentials || credentials.length === 0 ? (
              <p className="text-xs text-muted-foreground">No payment credentials configured. Add one via Manage.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {credentials.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
                    <Landmark className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs font-medium">{c.name} {c.is_active ? "" : "(Inactive)"}</p>
                      <p className="text-sm font-bold tracking-wider font-mono">{c.account_number}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1"
                      onClick={() => { navigator.clipboard.writeText(c.account_number || ""); toast.success("Copied"); }}>
                      Copy
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Teacher Payment Records
          </CardTitle>
          <CardDescription>
            Monthly payment tracking — unpaid balances roll over to the next month
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search teachers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-0.5 sm:flex-nowrap">
              {(["all", "pending", "overdue"] as const).map((tab) => (
                <Button
                  key={tab}
                  size="sm"
                  variant={filterTab === tab ? "default" : "ghost"}
                  className="h-8 flex-1 sm:flex-none text-xs capitalize"
                  onClick={() => setFilterTab(tab)}
                >
                  {tab === "pending" && <Clock className="mr-1 h-3 w-3" />}
                  {tab === "overdue" && <XCircle className="mr-1 h-3 w-3" />}
                  {tab}
                </Button>
              ))}
            </div>
          </div>

          {filteredTeachers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No teachers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Teacher</TableHead>
                    <TableHead>Monthly Due</TableHead>
                    <TableHead>Unpaid Balance</TableHead>
                    <TableHead>Last Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher) => {
                    const isExpanded = expandedTeacher === teacher.id;
                    return (
                      <Fragment key={teacher.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedTeacher(isExpanded ? null : teacher.id)}
                        >
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm flex items-center gap-1">
                                {teacher.name}
                                {teacher.isBlocked && <Badge variant="destructive" className="text-[9px] px-1 py-0">Banned</Badge>}
                              </p>
                              <p className="text-xs text-muted-foreground">{teacher.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">{formatPrice(teacher.monthlyCommission)}</span>
                            <p className="text-[10px] text-muted-foreground">/{MONTHS[currentMonth - 1]} {currentYear} · {Math.round(teacher.commissionRate * 100)}%</p>
                          </TableCell>
                          <TableCell>
                            <span className={`font-semibold ${teacher.unpaidBalance > 0 ? "text-destructive" : "text-success"}`}>
                              {formatPrice(teacher.unpaidBalance)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">
                            {teacher.lastPaid}
                          </TableCell>
                          <TableCell>
                            {teacher.unpaidBalance > 0 ? (
                              <Badge variant="destructive" className="whitespace-nowrap">
                                {teacher.monthsSinceLastPaid > 0
                                  ? `${teacher.monthsSinceLastPaid}m overdue`
                                  : "Due"}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-success/10 text-success border-success/30">Clear</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              {!teacher.hasCurrentMonthRecord && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => generateMonthlyRecord.mutate({ teacherId: teacher.id })}
                                  disabled={generateMonthlyRecord.isPending}
                                >
                                  Generate
                                </Button>
                              )}
                              {teacher.unpaidBalance > 0 && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => {
                                    setPayDialog({
                                      teacherId: teacher.id,
                                      teacherName: teacher.name,
                                      month: currentMonth,
                                      year: currentYear,
                                      amount: teacher.unpaidBalance,
                                    });
                                    setPayAmount(String(teacher.unpaidBalance));
                                    setPayReference("");
                                  }}
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Pay
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${teacher.id}-expanded`}>
                            <TableCell colSpan={7} className="bg-muted/20 p-0">
                              <div className="p-4">
                                {teacher.records.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    No payment records yet.
                                  </p>
                                ) : (
                                  <div className="space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                      Payment History
                                    </p>
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="border-b border-muted/30">
                                          <TableHead className="text-xs py-1">Period</TableHead>
                                          <TableHead className="text-xs py-1 text-right">Amount</TableHead>
                                          <TableHead className="text-xs py-1 text-right">Paid</TableHead>
                                          <TableHead className="text-xs py-1 text-right">Remaining</TableHead>
                                          <TableHead className="text-xs py-1">Status</TableHead>
                                          <TableHead className="text-xs py-1">Proof</TableHead>
                                          <TableHead className="text-xs py-1">Verified At</TableHead>
                                          <TableHead className="text-xs py-1">Actions</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {teacher.records.map((rec) => {
                                          const remaining = rec.amount - rec.paid_amount;
                                          return (
                                            <TableRow key={rec.id} className="border-b border-muted/20">
                                              <TableCell className="py-1.5 text-xs font-medium">
                                                {MONTHS[rec.month - 1]} {rec.year}
                                              </TableCell>
                                              <TableCell className="py-1.5 text-xs text-right tabular-nums">
                                                {formatPrice(rec.amount)}
                                              </TableCell>
                                              <TableCell className={`py-1.5 text-xs text-right tabular-nums ${rec.paid_amount > 0 ? "text-success" : ""}`}>
                                                {formatPrice(rec.paid_amount)}
                                              </TableCell>
                                              <TableCell className={`py-1.5 text-xs text-right tabular-nums ${remaining > 0 ? "text-destructive" : ""}`}>
                                                {formatPrice(remaining)}
                                              </TableCell>
                                              <TableCell className="py-1.5">
                                                {getStatusBadge(rec.status)}
                                              </TableCell>
                                              <TableCell className="py-1.5">
                                                {rec.proof_url ? (
                                                  <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5 px-1"
                                                    onClick={() => window.open(proxyImageUrl(rec.proof_url), "_blank")}>
                                                    <Eye className="h-3 w-3" /> View
                                                  </Button>
                                                ) : rec.proof_reference ? (
                                                  <span className="text-xs text-muted-foreground max-w-[80px] truncate block" title={rec.proof_reference}>
                                                    {rec.proof_reference}
                                                  </span>
                                                ) : (
                                                  <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                              </TableCell>
                                              <TableCell className="py-1.5 text-xs text-muted-foreground">
                                                {rec.verified_at ? format(new Date(rec.verified_at), "MMM d, h:mm a") : "—"}
                                              </TableCell>
                                              <TableCell className="py-1.5">
                                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                  {rec.status === "pending" && (
                                                    <>
                                                      <Button size="sm" variant="outline" className="h-6 text-[10px] gap-0.5 px-1.5 text-success border-success/30 hover:bg-success/10"
                                                        onClick={() => {
                                                          setVerifyDialog({
                                                            recordId: rec.id,
                                                            teacherName: teacher.name,
                                                            period: `${MONTHS[rec.month - 1]} ${rec.year}`,
                                                            amount: rec.amount,
                                                            paidAmount: rec.paid_amount,
                                                          });
                                                          setVerifyAmount(String(remaining));
                                                          setVerifyRef(rec.proof_reference || "");
                                                        }}>
                                                        <CheckCircle2 className="h-3 w-3" /> Verify
                                                      </Button>
                                                      <Button size="sm" variant="outline" className="h-6 text-[10px] gap-0.5 px-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                                                        onClick={() => {
                                                          setRejectDialog({
                                                            recordId: rec.id,
                                                            teacherName: teacher.name,
                                                            period: `${MONTHS[rec.month - 1]} ${rec.year}`,
                                                          });
                                                          setRejectReason("");
                                                        }}>
                                                        <XCircle className="h-3 w-3" /> Reject
                                                      </Button>
                                                    </>
                                                  )}
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!payDialog} onOpenChange={(o) => !o && setPayDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              Recording payment for <strong>{payDialog?.teacherName}</strong> — {payDialog ? `${MONTHS[payDialog.month - 1]} ${payDialog.year}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outstanding</span>
                <span className="font-semibold text-destructive">
                  {formatPrice(payDialog?.amount || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{credentials?.[0]?.name || "—"}</span>
                <span className="font-mono font-semibold">{credentials?.[0]?.account_number || "—"}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payAmount">Payment Amount</Label>
              <Input
                id="payAmount"
                type="number"
                step="0.01"
                min="0"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payReference">Reference Number (optional)</Label>
              <Input
                id="payReference"
                value={payReference}
                onChange={e => setPayReference(e.target.value)}
                placeholder="EasyPaisa transaction ID"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPayDialog(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!payDialog) return;
                const amount = parseFloat(payAmount);
                if (!amount || amount <= 0) {
                  toast.error("Enter a valid amount");
                  return;
                }
                recordPayment.mutate({
                  teacherId: payDialog.teacherId,
                  year: payDialog.year,
                  month: payDialog.month,
                  amount,
                  reference: payReference,
                });
              }}
              disabled={recordPayment.isPending}
              className="gap-1"
            >
              {recordPayment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!verifyDialog} onOpenChange={(o) => !o && setVerifyDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-success" />
              Verify Payment
            </DialogTitle>
            <DialogDescription>
              Verify payment for <strong>{verifyDialog?.teacherName}</strong> — {verifyDialog?.period}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Due</span>
                <span className="font-semibold">{formatPrice(verifyDialog?.amount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already Paid</span>
                <span className="font-semibold">{formatPrice(verifyDialog?.paidAmount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining</span>
                <span className="font-semibold text-destructive">{formatPrice((verifyDialog?.amount || 0) - (verifyDialog?.paidAmount || 0))}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verifyAmount">Amount to Verify</Label>
              <Input
                id="verifyAmount"
                type="number"
                step="0.01"
                min="0"
                value={verifyAmount}
                onChange={e => setVerifyAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verifyRef">Reference Number</Label>
              <Input
                id="verifyRef"
                value={verifyRef}
                onChange={e => setVerifyRef(e.target.value)}
                placeholder="Transaction reference"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVerifyDialog(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!verifyDialog) return;
                const amount = parseFloat(verifyAmount);
                if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
                verifyPayment.mutate({
                  recordId: verifyDialog.recordId,
                  amount,
                  reference: verifyRef,
                });
              }}
              disabled={verifyPayment.isPending}
              className="gap-1"
            >
              {verifyPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Verify Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ThumbsDown className="h-4 w-4 text-destructive" />
              Reject Proof
            </DialogTitle>
            <DialogDescription>
              Reject payment proof for <strong>{rejectDialog?.teacherName}</strong> — {rejectDialog?.period}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Rejection Reason</Label>
              <Input
                id="rejectReason"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Why is this proof being rejected?"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejectDialog) return;
                if (!rejectReason.trim()) { toast.error("Enter a reason"); return; }
                rejectPayment.mutate({
                  recordId: rejectDialog.recordId,
                  reason: rejectReason,
                });
              }}
              disabled={rejectPayment.isPending}
              className="gap-1"
            >
              {rejectPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Reject Proof
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isCoadmin && (
        <Dialog open={credDialogOpen} onOpenChange={o => { if (!o) { setCredDialogOpen(false); setCredForm({ id: "", name: "", type: "easypaisa", account_number: "", account_holder: "", bank_name: "", iban: "", is_active: true }); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Payment Credentials
              </DialogTitle>
              <DialogDescription>
                Manage payment methods shown to teachers. Add EasyPaisa, bank accounts, JazzCash, etc.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {credLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <div className="space-y-2">
                  {(credentials || []).map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{c.name}</p>
                          {!c.is_active && <Badge variant="outline" className="text-[9px] px-1 py-0">Inactive</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{c.account_number}</p>
                        {c.account_holder && <p className="text-[10px] text-muted-foreground">{c.account_holder}{c.bank_name ? ` · ${c.bank_name}` : ""}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => {
                            setCredForm({ id: c.id, name: c.name, type: c.type, account_number: c.account_number || "", account_holder: c.account_holder || "", bank_name: c.bank_name || "", iban: c.iban || "", is_active: c.is_active });
                          }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                          onClick={() => { if (confirm("Delete this credential?")) deleteCredential.mutate(c.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{credForm.id ? "Edit" : "Add"} Credential</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Name</Label><Input size={1} value={credForm.name} onChange={e => setCredForm(f => ({ ...f, name: e.target.value }))} placeholder="EasyPaisa Main" /></div>
                  <div className="space-y-1"><Label className="text-xs">Type</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={credForm.type} onChange={e => setCredForm(f => ({ ...f, type: e.target.value }))}>
                      <option value="easypaisa">EasyPaisa</option>
                      <option value="jazzcash">JazzCash</option>
                      <option value="bank">Bank Account</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Account Number</Label><Input value={credForm.account_number} onChange={e => setCredForm(f => ({ ...f, account_number: e.target.value }))} placeholder="01234567890" /></div>
                  <div className="space-y-1"><Label className="text-xs">Account Holder</Label><Input value={credForm.account_holder} onChange={e => setCredForm(f => ({ ...f, account_holder: e.target.value }))} placeholder="John Doe" /></div>
                  {credForm.type === "bank" && (
                    <>
                      <div className="space-y-1"><Label className="text-xs">Bank Name</Label><Input value={credForm.bank_name} onChange={e => setCredForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="HBL" /></div>
                      <div className="space-y-1"><Label className="text-xs">IBAN</Label><Input value={credForm.iban} onChange={e => setCredForm(f => ({ ...f, iban: e.target.value }))} placeholder="PK36..." /></div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={credForm.is_active} onChange={e => setCredForm(f => ({ ...f, is_active: e.target.checked }))} />
                  <Label htmlFor="isActive" className="text-xs">Active (visible to teachers)</Label>
                </div>
                <Button size="sm" onClick={() => saveCredential.mutate()} disabled={saveCredential.isPending || !credForm.name.trim() || !credForm.account_number.trim()}>
                  {saveCredential.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  {credForm.id ? "Update" : "Add"} Credential
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
