import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import {
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  CircleDollarSign,
  Loader2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { proxyImageUrl } from "@/lib/image-proxy";

interface NoteRequest {
  id: string;
  request_id: string;
  student_contact: string;
  contact_type: string;
  receipt_image_url: string;
  refund_screenshot_url: string | null;
  total_amount: number;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  download_code: string | null;
  download_code_used_at: string | null;
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

export function RequestManagement({ teacherId }: Props) {
  const { formatPrice } = useCurrency();
  const [selectedRequest, setSelectedRequest] = useState<NoteRequest | null>(
    null
  );
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<NoteRequest | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["teacher-requests", teacherId, filterStatus],
    queryFn: async () => {
      if (!teacherId) return [];

      let query = supabase
        .from("note_requests")
        .select("*")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as unknown as NoteRequest[];
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
      return data as unknown as RequestNote[];
    },
    enabled: !!selectedRequest?.id,
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      rejection_reason,
    }: {
      id: string;
      status: string;
      rejection_reason?: string;
    }) => {
      const updateData: {
        status: string;
        updated_at: string;
        rejection_reason?: string;
      } = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (rejection_reason !== undefined) {
        updateData.rejection_reason = rejection_reason;
      }

      const { error } = await supabase
        .from("note_requests")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-requests"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-stats"] });
      setRejectDialogOpen(false);
      setRejectingRequest(null);
      setRejectionReason("");
      toast.success("Request status updated!");
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      toast.error("Failed to update request status");
    },
  });

  const handleRejectClick = (request: NoteRequest) => {
    setRejectingRequest(request);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = () => {
    if (rejectingRequest) {
      updateStatus.mutate({
        id: rejectingRequest.id,
        status: "rejected",
        rejection_reason: rejectionReason.trim() || undefined,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-warning/10 text-warning border-warning/30"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="bg-destructive/10 text-destructive border-destructive/30"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-success/10 text-success border-success/30"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-destructive/10 text-destructive border-destructive/30"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "refunded":
        return (
          <Badge
            variant="outline"
            className="bg-refunded/10 text-blue-500 border-blue-500/30"
          >
            <CircleDollarSign className="h-3 w-3 mr-1" />
            Refunded
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (requests.length === 0 && filterStatus === "all") {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 font-medium">No requests yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Student requests will appear here when they request your paid notes
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Student Requests</h2>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Request ID</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request, index) => (
              <TableRow key={request.id}>
                <TableCell>{index + 1}.</TableCell>
                <TableCell className="font-mono text-sm">
                  {request.request_id}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getContactIcon(request.contact_type)}
                    <span className="text-sm">
                      {request.contact_type === "both" ? (
                        <p>
                          {request.student_contact.split("|")[0].trim()}
                          <br />
                          {request.student_contact.split("|")[1].trim()}
                        </p>
                      ) : (
                        request.student_contact
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatPrice(request.total_amount)}
                </TableCell>
                <TableCell>
                  {getStatusBadge(request.status)}
                  {request.status === "cancelled" && request.rejection_reason && (
                    <div className="text-xs font-mono mt-1">
                      <sup>Reason: {request.rejection_reason}</sup>
                    </div>
                  )}
                  {request.download_code && (
                    <div className="text-xs font-mono mt-1">
                      Code: <strong>{request.download_code}</strong>
                      {request.download_code_used_at && <span className="text-success ml-1">(used)</span>}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(request.created_at), "MMM d, yyyy")}
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
                    {request.status === "pending" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-success hover:text-success"
                          onClick={() =>
                            updateStatus.mutate({
                              id: request.id,
                              status: "completed",
                            })
                          }
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRejectClick(request)}
                          disabled={updateStatus.isPending}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Request Details Dialog */}
      <Dialog
        open={!!selectedRequest}
        onOpenChange={() => setSelectedRequest(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
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
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {getContactIcon(selectedRequest.contact_type)}
                      <span>{selectedRequest.student_contact.includes("|") ? `${selectedRequest.student_contact.split("|")[0].trim()}<br />${selectedRequest.student_contact.split("|")[1].trim()}` : selectedRequest.student_contact}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Payment Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatPrice(selectedRequest.total_amount)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Payment Receipt</CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">

                    {/* Payment Screenshot */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Payment Screenshot</p>

                      <a
                        href={proxyImageUrl(selectedRequest.receipt_image_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={proxyImageUrl(selectedRequest.receipt_image_url)}
                          alt="Payment receipt"
                          className="w-full max-h-64 rounded-lg border object-contain"
                        />
                      </a>
                    </div>

                    {/* Refund Screenshot */}
                    {selectedRequest.refund_screenshot_url && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Refund Screenshot</p>

                        <a
                          href={selectedRequest.refund_screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={proxyImageUrl(selectedRequest.refund_screenshot_url) ?? selectedRequest.refund_screenshot_url}
                            alt="Refund screenshot"
                            className="w-full max-h-64 rounded-lg border object-contain"
                          />
                        </a>
                      </div>
                    )}
                  </div>
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

              {/* Rejection Reason Display */}
              {selectedRequest.status === "rejected" &&
                selectedRequest.rejection_reason && (
                  <Card className="border-destructive/30 bg-destructive/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-destructive">
                        Rejection Reason
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        {selectedRequest.rejection_reason}
                      </p>
                    </CardContent>
                  </Card>
                )}

              <div className="flex items-center justify-between">
                <div>{getStatusBadge(selectedRequest.status)}</div>
                {selectedRequest.status === "cancelled" && selectedRequest.rejection_reason && (
                  <div className="text-md font-mono mt-1">
                    <p className="text-sm">Reason: {selectedRequest.rejection_reason}</p>
                  </div>
                )}
                {selectedRequest.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setSelectedRequest(null);
                        handleRejectClick(selectedRequest);
                      }}
                      disabled={updateStatus.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      className="bg-success hover:bg-success/90"
                      onClick={() => {
                        updateStatus.mutate({
                          id: selectedRequest.id,
                          status: "completed",
                        });
                        setSelectedRequest(null);
                      }}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Completed
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Reject Request
            </DialogTitle>
            <DialogDescription>
              Request ID: {rejectingRequest?.request_id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">
                Rejection Reason (optional)
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter a reason for rejecting this request..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This reason will be visible to the student when they track their
                request.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectingRequest(null);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmReject}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Reject Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
