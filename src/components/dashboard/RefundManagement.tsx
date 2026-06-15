import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import {
  CheckCircle,
  XCircle,
  Eye,
  Mail,
  Phone,
  MessageSquare,
  Undo2,
  AlertCircle,
  Upload,
  Loader2,
  Undo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { RefundScreenshotDialog } from "./RefundScreenshotDialog";
import { proxyImageUrl } from "@/lib/image-proxy";

interface RejectedRequest {
  id: string;
  request_id: string;
  student_contact: string;
  contact_type: string;
  receipt_image_url: string;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface RequestNote {
  id: string;
  note_id: string;
  notes: {
    id: string;
    title: string;
    price: number;
    file_url: string;
  };
}

interface Props {
  teacherId: string | undefined;
}

export function RefundManagement({ teacherId }: Props) {
  const { formatPrice } = useCurrency();
  const [selectedRequest, setSelectedRequest] =
    useState<RejectedRequest | null>(null);
  const [refundDialogRequest, setRefundDialogRequest] =
    useState<RejectedRequest | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();


  const handleRestoreRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("note_requests")
        .update({
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Request moved back to pending");

      queryClient.invalidateQueries({
        queryKey: ["rejected-requests"],
      });

      queryClient.invalidateQueries({
        queryKey: ["pending-requests"],
      });

      queryClient.invalidateQueries({
        queryKey: ["teacher-stats"],
      });

      queryClient.invalidateQueries({
        queryKey: ["teacher-revenues"],
      });

      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to restore request");
    }
  };

  const { data: rejectedRequests = [], isLoading } = useQuery({
    queryKey: ["rejected-requests", teacherId],
    queryFn: async () => {
      if (!teacherId) return [];

      const { data, error } = await supabase
        .from("note_requests")
        .select("*")
        .eq("teacher_id", teacherId)
        .eq("status", "rejected")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as RejectedRequest[];
    },
    enabled: !!teacherId,
  });

  const { data: requestNotes = [] } = useQuery({
    queryKey: ["request-notes", selectedRequest?.id],
    queryFn: async () => {
      if (!selectedRequest?.id) return [];

      const { data, error } = await supabase
        .from("request_notes")
        .select(
          `
          id,
          note_id,
          notes (
            id,
            title,
            price,
            file_url
          )
        `
        )
        .eq("request_id", selectedRequest.id);

      if (error) throw error;
      return data as RequestNote[];
    },
    enabled: !!selectedRequest?.id,
  });

  const handleRefundSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["rejected-requests"] });
    queryClient.invalidateQueries({ queryKey: ["teacher-stats"] });
    queryClient.invalidateQueries({ queryKey: ["teacher-revenues"] });
    setSelectedIds(new Set());
  };

  const getContactIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === rejectedRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rejectedRequests.map((r) => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (rejectedRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <CheckCircle className="h-12 w-12 text-success/50" />
        <h3 className="mt-4 font-medium">All caught up!</h3>
        <p className="mt-1 text-sm text-muted-foreground text-center px-4">
          No rejected requests pending refund. All payments have been processed.
        </p>
      </div>
    );
  }

  const totalRefundAmount = rejectedRequests.reduce(
    (sum, r) => sum + r.total_amount,
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-destructive" />
            Pending Refunds
          </h2>
          <p className="text-sm text-muted-foreground">
            {rejectedRequests.length} rejected request
            {rejectedRequests.length !== 1 ? "s" : ""} need refund
          </p>
        </div>

        <Card className="px-4 py-2">
          <div className="text-xs text-muted-foreground">Total to Refund</div>
          <div className="text-lg font-bold text-destructive">
            {formatPrice(totalRefundAmount)}
          </div>
        </Card>
      </div>

      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader className="p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <CardDescription className="text-destructive">Upload proof of refund payment (Bank Account screenshot)
              when marking as refunded.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      selectedIds.size === rejectedRequests.length &&
                      rejectedRequests.length > 0
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Request ID</TableHead>
                <TableHead>Bank Account</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Rejected On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rejectedRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(request.id)}
                      onCheckedChange={() => toggleSelect(request.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {request.request_id}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getContactIcon(request.contact_type)}
                      <span className="text-sm truncate max-w-[150px]">
                        {request.student_contact}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-destructive">
                    {formatPrice(request.total_amount)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(request.updated_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-warning hover:text-warning"
                        onClick={() => handleRestoreRequest(request.id)}
                      >
                        <Undo className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-success hover:text-success"
                        onClick={() => setRefundDialogRequest(request)}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Refund Screenshot Upload Dialog */}
      {refundDialogRequest && (
        <RefundScreenshotDialog
          open={!!refundDialogRequest}
          onOpenChange={(open) => !open && setRefundDialogRequest(null)}
          requestId={refundDialogRequest.id}
          amount={refundDialogRequest.total_amount}
          onSuccess={handleRefundSuccess}
        />
      )}

      {/* Request Details Dialog */}
      <Dialog
        open={!!selectedRequest}
        onOpenChange={() => setSelectedRequest(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Rejected Request
            </DialogTitle>
            <DialogDescription>
              Request ID: {selectedRequest?.request_id}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Student Contact Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {getContactIcon(selectedRequest.contact_type)}
                      <span className="break-all">
                        {selectedRequest.student_contact}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Send refund screenshot to here after refunding (Optional).
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-destructive/30 bg-destructive/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Refund Amount</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-destructive">
                      {formatPrice(selectedRequest.total_amount)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Payment Receipt</CardTitle>
                  <CardDescription>
                    Original payment proof from student
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <a
                    href={selectedRequest.receipt_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={proxyImageUrl(selectedRequest.receipt_image_url)}
                      alt="Payment receipt"
                      className="max-h-64 rounded-lg border object-contain"
                    />
                  </a>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Requested Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {requestNotes.map((rn) => (
                      <li
                        key={rn.id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                      >
                        <span>{rn.notes.title}</span>
                        <span className="font-medium">
                          {formatPrice(rn.notes.price ?? 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className="bg-destructive/10 text-destructive border-destructive/30"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Rejected
                </Badge>
                <Button
                  className="gap-2"
                  onClick={() => {
                    setSelectedRequest(null);
                    setRefundDialogRequest(selectedRequest);
                  }}
                >
                  <Upload className="h-4 w-4" />
                  Upload Refund Proof
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
