import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import {
  DollarSign, TrendingUp, Loader2, CheckCircle2, XCircle, Clock,
  AlertTriangle, Ban, Phone, Landmark, Upload, Eye, FileImage, Building2,
} from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { proxyImageUrl } from "@/lib/image-proxy";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DUE_DAYS = 10;

export default function TeacherPayments({ teacherId }: { teacherId: string }) {
  const { formatPrice } = useCurrency();
  const qc = useQueryClient();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [submitDialog, setSubmitDialog] = useState<{
    recordId: string;
    month: number;
    year: number;
    amount: number;
  } | null>(null);
  const [proofReference, setProofReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: credentials } = useQuery({
    queryKey: ["payment-credentials"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_credentials").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-payments", teacherId],
    enabled: !!teacherId,
    queryFn: async () => {
      const [recordsRes, profileRes] = await Promise.all([
        supabase.from("payment_records")
          .select("*")
          .eq("teacher_id", teacherId)
          .order("year", { ascending: false })
          .order("month", { ascending: false }),
        supabase.from("profiles")
          .select("full_name, is_blocked, blocked_reason")
          .eq("id", teacherId)
          .maybeSingle(),
      ]);


      const records = recordsRes.data || [];
      const profile = profileRes.data;

      const totalDue = records
        .filter(r => r.status !== "verified")
        .reduce((s, r) => s + (r.amount - r.paid_amount), 0);

      const pendingRecords = records.filter(r => r.status === "pending");
      const overdueRecords = records.filter(r => {
        if (r.status === "verified" || r.status === "overdue") return false;
        const created = new Date(r.created_at);
        const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays > DUE_DAYS && (r.amount - r.paid_amount) > 0;
      });
      const hasOverdue = overdueRecords.length > 0;

      const verifiedTotal = records
        .filter(r => r.status === "verified")
        .reduce((s, r) => s + r.paid_amount, 0);

      const unpaidUnsubmitted = records.filter(
        r => r.status === "unpaid" && (r.amount - r.paid_amount) > 0
      );

      return {
        records,
        profile,
        totalDue: Math.round(totalDue * 100) / 100,
        pendingCount: pendingRecords.length,
        hasOverdue,
        overdueRecords,
        verifiedTotal: Math.round(verifiedTotal * 100) / 100,
        unpaidUnsubmitted,
        monthsOutstanding: records.filter(r => r.status !== "verified").length,
      };
    },
  });

  const uploadProofImage = async (file: File, month: number, year: number): Promise<string> => {
    setUploadProgress(true);
    const ext = file.name.split(".").pop();
    const filePath = `${teacherId}/payment_proof_${year}_${month}_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage
      .from("receipts")
      .getPublicUrl(filePath);
    setUploadProgress(false);
    return publicUrl;
  };

  const submitProof = useMutation({
    mutationFn: async ({ recordId, month, year, reference, file }: { recordId: string; month: number; year: number; reference: string; file: File | null }) => {
      let proofUrl: string | null = null;
      if (file) {
        proofUrl = await uploadProofImage(file, month, year);
      }
      const { error } = await supabase.rpc("submit_payment_proof", {
        p_teacher_id: teacherId,
        p_year: year,
        p_month: month,
        p_proof_url: proofUrl,
        p_proof_reference: reference,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher-payments", teacherId] });
      setSubmitDialog(null);
      setProofReference("");
      setProofFile(null);
      toast.success("Payment proof submitted for verification");
    },
    onError: (e: any) => { toast.error(e.message); },
    onSettled: () => setUploadProgress(false),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-success/10 text-success border-success/30">Verified</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/30 animate-pulse">Pending Review</Badge>;
      case "partial":
        return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/30">Partial</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "overdue":
        return <Badge variant="destructive" className="animate-pulse">Overdue</Badge>;
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
      {data.profile?.is_blocked && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Ban className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-semibold text-sm text-destructive">Account Blocked</p>
              <p className="text-xs text-destructive/80">{data.profile.blocked_reason || "Contact admin for details."}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {data.hasOverdue && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="font-semibold text-sm text-warning">Overdue Payments</p>
              <p className="text-xs text-warning/80">
                You have overdue payments past the {DUE_DAYS}-day limit. Submit payment immediately to avoid account suspension.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className={`text-xl font-bold ${data.totalDue > 0 ? "text-destructive" : "text-success"}`}>
              {formatPrice(data.totalDue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Verified</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-success">{formatPrice(data.verifiedTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-warning">{data.pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className={`text-xl font-bold ${data.hasOverdue ? "text-destructive" : ""}`}>
              {data.hasOverdue ? "Yes" : "None"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Pay Your Dues
          </CardTitle>
          <CardDescription>
            Send your monthly payment to any of these accounts, then submit the transaction reference for admin verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!credentials || credentials.length === 0 ? (
            <p className="text-xs text-muted-foreground">No payment methods configured yet. Contact admin.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {credentials.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-3 rounded-lg border bg-background p-3"
                >
                  <Landmark className="mt-0.5 h-5 w-5 text-primary shrink-0" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{c.name}</p>
                      {!c.is_active && (
                        <span className="text-xs text-muted-foreground">
                          (Inactive)
                        </span>
                      )}
                    </div>

                    {c.bank_name && (
                      <p className="text-xs text-muted-foreground">
                        {c.bank_name}
                      </p>
                    )}

                    {c.account_number && (
                      <p className="mt-1 font-mono text-sm">
                        {c.account_number}
                      </p>
                    )}

                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {c.account_holder && <span>{c.account_holder}</span>}
                      {c.type && <span>• {c.type}</span>}
                      {c.iban && <span>• IBAN available</span>}
                    </div>
                  </div>

                  {c.account_number && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(c.account_number);
                        toast.success("Copied");
                      }}
                    >
                      Copy
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            My Payment Records
          </CardTitle>
          <CardDescription>
            You have {DUE_DAYS} days to clear each monthly due. Unpaid balances roll over. After Due Date fine will be applied.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.records.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No payment records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Proof Ref</TableHead>
                    <TableHead>Verified At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.records.map((rec) => {
                    const remaining = rec.amount - rec.paid_amount;
                    const canSubmit = (rec.status === "unpaid" || rec.status === "rejected" || rec.status === "pending") && remaining > 0;

                    return (
                      <TableRow key={rec.id} className={rec.status === "rejected" ? "bg-destructive/5" : rec.status === "pending" ? "bg-primary/5" : ""}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {MONTHS[rec.month - 1]} {rec.year}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatPrice(rec.amount)}</TableCell>
                        <TableCell className={`text-right tabular-nums ${rec.paid_amount > 0 ? "text-success" : ""}`}>
                          {formatPrice(rec.paid_amount)}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums font-semibold ${remaining > 0 ? "text-destructive" : "text-success"}`}>
                          {formatPrice(remaining)}
                        </TableCell>
                        <TableCell>{getStatusBadge(rec.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[100px] truncate" title={rec.proof_reference || rec.reference_number || ""}>
                          {rec.proof_reference || rec.reference_number || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {rec.verified_at ? format(new Date(rec.verified_at), "MMM d, h:mm a") : "—"}
                        </TableCell>
                        <TableCell>
                          {canSubmit ? (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                              onClick={() => {
                                setSubmitDialog({
                                  recordId: rec.id,
                                  month: rec.month,
                                  year: rec.year,
                                  amount: remaining,
                                });
                                setProofReference("");
                                setProofFile(null);
                              }}>
                              <Upload className="h-3 w-3" /> {rec.status === "pending" ? "Resubmit" : "Submit Proof"}
                            </Button>
                          ) : rec.status === "verified" ? (
                            <span className="text-xs text-success flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Cleared
                            </span>
                          ) : rec.rejection_reason && (
                            <span className="text-xs text-destructive max-w-[120px] truncate block" title={rec.rejection_reason}>
                              <XCircle className="h-3 w-3 inline mr-0.5" /> {rec.rejection_reason}
                            </span>
                          )}
                          {rec.proof_url && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 ml-1"
                              onClick={() => window.open(proxyImageUrl(rec.proof_url), "_blank")}>
                              <Eye className="h-3 w-3" /> View
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!submitDialog} onOpenChange={(o) => !o && setSubmitDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Submit Payment Proof
            </DialogTitle>
            <DialogDescription>
              Submit payment proof for {submitDialog ? `${MONTHS[submitDialog.month - 1]} ${submitDialog.year}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount due</span>
                <span className="font-semibold">{formatPrice(submitDialog?.amount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Send to</span>
                <span className="font-mono font-semibold">{credentials?.[0]?.account_number || "—"}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="proofRef">Transaction Reference</Label>
              <Input
                id="proofRef"
                value={proofReference}
                onChange={e => setProofReference(e.target.value)}
                placeholder="Enter the transaction reference/ID"
              />
              <p className="text-[10px] text-muted-foreground">
                Enter the transaction reference from your payment.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="proofFile">Payment Screenshot</Label>
              <div className="flex items-center gap-2">
                <Input
                  required
                  id="proofFile"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="text-sm"
                  onChange={e => setProofFile(e.target.files?.[0] || null)}
                />
              </div>
              {proofFile && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <FileImage className="h-3 w-3" /> {proofFile.name} ({(proofFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">
                Upload a screenshot of your payment for admin verification.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSubmitDialog(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!submitDialog) return;
                if (!proofReference.trim()) { toast.error("Enter the transaction reference"); return; }
                submitProof.mutate({
                  recordId: submitDialog.recordId,
                  month: submitDialog.month,
                  year: submitDialog.year,
                  reference: proofReference,
                  file: proofFile,
                });
              }}
              disabled={submitProof.isPending || uploadProgress}
              className="gap-1"
            >
              {(submitProof.isPending || uploadProgress) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploadProgress ? "Uploading..." : "Submit for Verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
