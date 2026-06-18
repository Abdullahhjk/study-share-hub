import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";
import { validateRequestId, PATTERN_REGEX } from "@/lib/request-id-validator";
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Undo2,
  AlertCircle,
  Package,
  Mail,
  Phone,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";

interface RequestData {
  id: string;
  request_id: string;
  student_contact: string;
  contact_type: string;
  receipt_image_url: string;
  total_amount: number;
  status: string;
  rejection_reason: string | null;
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
  };
}

export function RequestTracker() {
  const { formatPrice } = useCurrency();
  const [requestId, setRequestId] = useState("");
  const [searchedId, setSearchedId] = useState("");

  const {
    data: request,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["track-request", searchedId],
    queryFn: async () => {
      if (!searchedId) return null;

      const { data, error } = await supabase
        .from("note_requests")
        .select("*")
        .eq("request_id", searchedId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as RequestData | null;
    },
    enabled: !!searchedId,
  });

  const { data: requestNotes = [] } = useQuery({
    queryKey: ["track-request-notes", request?.id],
    queryFn: async () => {
      if (!request?.id) return [];

      const { data, error } = await supabase
        .from("request_notes")
        .select(
          `
          id,
          note_id,
          notes (
            id,
            title,
            price
          )
        `
        )
        .eq("request_id", request.id);

      if (error) throw error;
      return data as RequestNote[];
    },
    enabled: !!request?.id,
  });

  const validation = validateRequestId(requestId);

  const handleSearch = () => {
    const id = requestId.trim();
    if (id) setSearchedId(id);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          icon: <Clock className="h-6 w-6" />,
          label: "Pending",
          color: "text-warning",
          bgColor: "bg-warning/10",
          borderColor: "border-warning/30",
          description:
            "Your request is being reviewed by the teacher. Once verified, a download code will be issued automatically.",
        };
      case "completed":
        return {
          icon: <CheckCircle className="h-6 w-6" />,
          label: "Completed",
          color: "text-success",
          bgColor: "bg-success/10",
          borderColor: "border-success/30",
          description:
            "Your request has been completed! Use your one-time download code to access the notes.",
        };
      case "rejected":
        return {
          icon: <XCircle className="h-6 w-6" />,
          label: "Rejected",
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/30",
          description:
            "Your request was rejected. A refund will be processed to you.",
        };
      case "refunded":
        return {
          icon: <Undo2 className="h-6 w-6" />,
          label: "Refunded",
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          description:
            "Your request was rejected and the payment has been refunded. Please check your payment method.",
        };
      default:
        return {
          icon: <AlertCircle className="h-6 w-6" />,
          label: status,
          color: "text-muted-foreground",
          bgColor: "bg-muted",
          borderColor: "border-muted",
          description: "Status information unavailable.",
        };
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

  const statusInfo = request ? getStatusInfo(request.status) : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Search className="h-4 w-4" />
          <p className="hidden sm:inline">
            Track Request
          </p>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Track Your Request
          </DialogTitle>
          <DialogDescription>
            Enter your request ID to check the status of your notes request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-3">
              <Input
                placeholder="Enter your Request ID (e.g., REQ_XXXXXXXX_XXXX)"
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              {validation.hint && (
                <p className="text-xs mt-1 text-muted-foreground font-mono">
                  {validation.hint}
                </p>
              )}
              {validation.error && (
                <p className="text-xs mt-1 text-destructive font-mono">
                  {validation.error}
                </p>
              )}
            </div>
            <Button
              onClick={handleSearch}
              disabled={!PATTERN_REGEX.test(requestId) || isLoading || !!validation.hint}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin inline-block" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {searchedId && !isLoading && !request && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">
                      Request not found
                    </p>
                    <p className="text-sm text-muted-foreground">
                      No request found with ID "{searchedId}". Please check and
                      try again.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {searchedId && !isLoading && request && (
            <Card className="border-success/30 bg-success/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <Link to="/my-orders">
                      <Button variant="outline" className="gap-2" onClick={() => { localStorage.setItem("student_request_ids", JSON.stringify([...JSON.parse(localStorage.getItem("student_request_ids") || "[]"), searchedId])) }}>
                        <Search className="h-4 w-4" />
                        <p className="hidden sm:inline">
                          Go to My Orders for more details
                        </p>
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {request && statusInfo && (
            <div className="space-y-4">
              {/* Status Card */}
              <Card
                className={`${statusInfo.borderColor} ${statusInfo.bgColor} border`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`${statusInfo.color} mt-0.5`}>
                      {statusInfo.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={`${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor}`}
                        >
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {statusInfo.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Rejection Reason */}
              {(request.status === "rejected" ||
                request.status === "refunded") &&
                request.rejection_reason && (
                  <Card className="border-destructive/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-destructive">
                        Rejection Reason
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{request.rejection_reason}</p>
                    </CardContent>
                  </Card>
                )}

              {/* Request Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Request ID</span>
                    <span className="font-mono font-medium">
                      {request.request_id}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Contact</span>
                    <span className="flex items-center gap-1">
                      {getContactIcon(request.contact_type)}
                      <span className="truncate max-w-[150px]">
                        {request.student_contact}
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">
                      {formatPrice(request.total_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Submitted</span>
                    <span>
                      {format(
                        new Date(request.created_at),
                        "MMM d, yyyy h:mm a"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>
                      {format(
                        new Date(request.updated_at),
                        "MMM d, yyyy h:mm a"
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Requested Notes */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Requested Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {requestNotes.map((rn) => (
                      <li
                        key={rn.id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm"
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

              {/* Timeline */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Status Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-success" />
                      <span className="text-sm">Request Submitted</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(request.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>

                    {request.status !== "pending" && (
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2 w-2 rounded-full ${request.status === "completed"
                            ? "bg-success"
                            : request.status === "rejected"
                              ? "bg-destructive"
                              : request.status === "refunded"
                                ? "bg-blue-500"
                                : "bg-muted"
                            }`}
                        />
                        <span className="text-sm capitalize">
                          {request.status}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(
                            new Date(request.updated_at),
                            "MMM d, h:mm a"
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
