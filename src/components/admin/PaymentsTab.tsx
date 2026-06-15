/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import {
  DollarSign, TrendingUp, BarChart3, AlertTriangle, Send, Ban, Unlock,
  HandCoins, Loader2
} from "lucide-react";

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";

import { toast } from "sonner";
import { StatCard } from "./OverviewTab";
import { SendNotificationModal } from "./SendNotificationModal";

const COMMISSION_RATE = 0.15;

const safeNum = (v: any) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

export default function PaymentsTab() {
  const { formatPrice } = useCurrency();
  const qc = useQueryClient();

  const [sendOpen, setSendOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<{ id: string; name: string } | null>(null);
  const [blockTarget, setBlockTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const [requestsRes, profilesRes, notesRes] = await Promise.all([
        supabase.from("note_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, email, is_blocked, blocked_reason"),
        supabase.from("notes").select("id, price, is_free, teacher_id"),
      ]);

      const requests = requestsRes.data || [];
      const profiles = profilesRes.data || [];
      const notes = notesRes.data || [];

      const teacherMap: Record<string, any> = {};

      profiles.forEach((p: any) => {
        teacherMap[p.id] = {
          profile: p,
          completedRevenue: 0,
          pendingRevenue: 0,
          rejectedRevenue: 0,
          platformRevenue: 0,
          teacherRevenue: 0,
          requestCount: 0,
        };
      });

      requests.forEach(r => {
        const t = teacherMap[r.teacher_id];
        if (!t) return;

        t.requestCount++;

        const amount = safeNum(r.total_amount);

        if (r.status === "completed") {
          t.completedRevenue += amount;

          const platformCut = amount * COMMISSION_RATE;
          const teacherCut = amount * (1 - COMMISSION_RATE);

          t.platformRevenue += platformCut;
          t.teacherRevenue += teacherCut;
        }

        if (r.status === "pending") {
          t.pendingRevenue += amount;
        }

        if (r.status === "rejected") {
          t.rejectedRevenue += amount;
        }
      });

      notes.forEach(n => {
        const t = teacherMap[n.teacher_id];
        if (!t) return;

        if (!n.is_free) {
          const amount = safeNum(n.price);

          const platformCut = amount * COMMISSION_RATE;
          const teacherCut = amount * (1 - COMMISSION_RATE);

          t.platformRevenue += platformCut;
          t.teacherRevenue += teacherCut;
        }
      });

      const teacherData = Object.values(teacherMap)
        .filter((t: any) =>
          t.completedRevenue ||
          t.pendingRevenue ||
          t.rejectedRevenue ||
          t.teacherRevenue
        )
        .sort((a: any, b: any) => b.platformRevenue - a.platformRevenue);

      return { requests, teacherData };
    },
  });

  const sendPaymentReminder = useMutation({
    mutationFn: async ({ teacherId, amount }: any) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("notifications").insert({
        title: "Payment Reminder",
        message: `You have ${formatPrice(safeNum(amount))} pending payments. Please send payment to continue using the platform uninterruptedly.`,
        user_id: teacherId,
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => toast.success("Reminder sent"),
    onError: (e: any) => toast.error(e.message),
  });

  const warn = useMutation({
    mutationFn: async (teacherId: string) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("notifications").insert({
        title: "Warning! Account Under Review",
        message: "Your account activity is under review. Please remain cautious and do not take any further actions until the review is complete. Failure to comply may result in your account being temporarily suspended or permanently banned.",
        user_id: teacherId,
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => toast.success("Warning sent"),
    onError: (e: any) => toast.error(e.message),
  });

  const toggleBlock = useMutation({
    mutationFn: async ({ teacherId, block, reason }: any) => {
      const { error } = await supabase.from("profiles").update({
        is_blocked: block,
        blocked_reason: block ? reason : null,
        blocked_at: block ? new Date().toISOString() : null,
      }).eq("id", teacherId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      setBlockTarget(null);
      toast.success("Updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const totalCompleted = data.teacherData.reduce((s: number, t: any) => s + safeNum(t.completedRevenue), 0);
  const totalPending = data.teacherData.reduce((s: number, t: any) => s + safeNum(t.pendingRevenue), 0);
  const totalPlatformRevenue = (data.teacherData.reduce((s: number, t: any) => s + safeNum(t.platformRevenue), 0));
  const totalTeacherRevenue = data.teacherData.reduce((s: number, t: any) => s + safeNum(t.teacherRevenue), 0);

  return (
    <div className="space-y-6 mt-4">

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Platform Revenue" value={formatPrice(safeNum(totalPlatformRevenue * totalCompleted))} icon={<TrendingUp className="h-4 w-4 text-primary" />} sub="15% commission" />
        <StatCard title="Teacher Earnings" value={formatPrice(safeNum(totalTeacherRevenue * totalCompleted))} icon={<DollarSign className="h-4 w-4 text-success" />} sub="85% payout" />
        <StatCard title="To Collect" value={formatPrice(safeNum(totalPending))} icon={<DollarSign className="h-4 w-4 text-warning" />} sub="Pending requests" />
        <StatCard title="Gross Volume" value={formatPrice(safeNum(totalCompleted))} icon={<BarChart3 className="h-4 w-4" />} sub="Student payments" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teacher Revenue Breakdown</CardTitle>
          <CardDescription>Platform vs teacher earnings</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Rejected</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.teacherData.map((t: any) => (
                  <TableRow key={t.profile.id}>

                    <TableCell>
                      <div>
                        <p className="font-medium text-sm flex items-center gap-1">
                          {t.profile.full_name}
                          {t.profile.is_blocked && <Badge variant="destructive">Blocked</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">{t.profile.email}</p>
                      </div>
                    </TableCell>

                    <TableCell>{formatPrice(safeNum(t.completedRevenue))}</TableCell>
                    <TableCell>{formatPrice(safeNum(t.pendingRevenue))}</TableCell>
                    <TableCell>{formatPrice(safeNum(t.rejectedRevenue))}</TableCell>
                    <TableCell>{formatPrice(safeNum(t.platformRevenue * t.completedRevenue))}</TableCell>
                    <TableCell>{formatPrice(safeNum(t.teacherRevenue * t.completedRevenue))}</TableCell>

                    <TableCell>
                      <div className="flex gap-1">

                        <Button size="sm" variant="outline" onClick={() => warn.mutate(t.profile.id)}>
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </Button>

                        <Button size="sm" variant="outline" onClick={() => sendPaymentReminder.mutate({ teacherId: t.profile.id, amount: t.pendingRevenue })}>
                          <HandCoins className="h-3.5 w-3.5" />
                        </Button>

                        <Button size="sm" variant="outline" onClick={() => {
                          setSendTarget({ id: t.profile.id, name: t.profile.full_name });
                          setSendOpen(true);
                        }}>
                          <Send className="h-3.5 w-3.5" />
                        </Button>

                        {t.profile.is_blocked ? (
                          <Button size="sm" variant="outline"
                            onClick={() => toggleBlock.mutate({ teacherId: t.profile.id, block: false })}>
                            <Unlock className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="destructive"
                            onClick={() => setBlockTarget(t)}>
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}

                      </div>
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>

            </Table>
          </div>
        </CardContent>
      </Card>

      <SendNotificationModal
        open={sendOpen}
        onOpenChange={setSendOpen}
        recipientId={sendTarget?.id ?? null}
        recipientName={sendTarget?.name}
      />

      <Dialog open={!!blockTarget} onOpenChange={(o) => !o && setBlockTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block {blockTarget?.profile.full_name}?</DialogTitle>
            <DialogDescription>This will restrict the account.</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockTarget(null)}>Cancel</Button>
            <Button variant="destructive"
              onClick={() => toggleBlock.mutate({
                teacherId: blockTarget.profile.id,
                block: true,
                reason: "Admin block"
              })}>
              Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}