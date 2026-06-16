import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trash2,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Upload,
  FileUp,
  PlusCircle,
  Loader2,
  CircleX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Footer } from "@/components/Footer";
import { useCurrency } from "@/hooks/useCurrency";
import { proxyImageUrl } from "@/lib/image-proxy";
import { getStoredRequestIds, removeRequestId, addMultipleRequestIds } from "@/lib/student-request-storage";
import { validateRequestId, PATTERN_REGEX } from "@/lib/request-id-validator";

interface RequestData {
  refund_screenshot_url: string | URL;
  receipt_image_url: string;
  id: string;
  request_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  rejection_reason: string | null;
  student_contact: string;
  contact_type: string;
  download_code: string | null;
  download_code_used_at: string | null;
  teacher?: {
    full_name: string;
    email: string;
    phone: string | null;
  };
}

interface RequestNote {
  id: string;
  note_id: string;
  notes: {
    id: string;
    title: string;
    price: number | null;
  };
}

export default function StudentDashboard() {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [storedIds, setStoredIds] = useState<string[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ requestId: string; status: string } | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RequestData | null>(
    null
  );
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [manualRequestId, setManualRequestId] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    if (receiptPreviewUrl) setImageLoading(true);
  }, [receiptPreviewUrl]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const manualValidation = validateRequestId(manualRequestId);

  useEffect(() => {
    setStoredIds(getStoredRequestIds());
  }, []);

  const {
    data: requests,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["student-requests", storedIds],
    queryFn: async () => {
      if (storedIds.length === 0) return [];

      const { data, error } = await supabase
        .from("note_requests")
        .select(
          `
          *,
          teacher:profiles (
            full_name,
            email,
            phone
          )
        `
        )
        .in("request_id", storedIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as RequestData[];
    },
    enabled: storedIds.length > 0,
  });

  const { data: requestNotes } = useQuery({
    queryKey: ["student-request-notes", requests?.map((r) => r.id)],
    queryFn: async () => {
      if (!requests || requests.length === 0) return {};

      const { data, error } = await supabase
        .from("request_notes")
        .select(
          `
          id,
          request_id,
          note_id,
          notes (
            id,
            title,
            price
          )
        `
        )
        .in(
          "request_id",
          requests.map((r) => r.id)
        );

      if (error) throw error;

      const grouped: Record<string, RequestNote[]> = {};
      (data as any[]).forEach((item) => {
        if (!grouped[item.request_id]) grouped[item.request_id] = [];
        grouped[item.request_id].push(item);
      });
      return grouped;
    },
    enabled: !!requests && requests.length > 0,
  });

  const validRequestIds = new Set(requests?.map((r) => r.request_id) || []);
  const invalidIds = storedIds.filter((id) => !validRequestIds.has(id));

  const cancelMutation = useMutation({
    mutationFn: async (request: RequestData) => {
      if (request.status !== "pending")
        throw new Error("Can only cancel pending requests");

      const { data, error } = await supabase.rpc("cancel_student_request" as any, {
        p_request_id: request.request_id,
      });

      if (error) throw error;
      if (!data) throw new Error("Request could not be cancelled (already processed).");
      return request;
    },
    onSuccess: async (request) => {
      toast({
        title: "Request cancelled",
        description: `Request ${request.request_id} has been cancelled.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["student-requests"] });
      await refetch();
      setCancelDialogOpen(false);
      setSelectedRequest(null);
      setCancelResult({ requestId: request.request_id, status: "cancelled" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel request.",
        variant: "destructive",
      });
    },
  });

  const handleRemoveFromHistory = (requestId: string) => {
    removeRequestId(requestId);
    setStoredIds(getStoredRequestIds());
    toast({
      title: "Removed from history",
      description: "This request has been removed from your local history.",
    });
  };

  const handleCancelClick = (request: RequestData) => {
    setSelectedRequest(request);
    setCancelDialogOpen(true);
  };

  const validateCSVFormat = (headers: string[]): boolean => {
    const requiredHeaders = [
      "Request ID",
      "Status",
      "Created At",
      "Total Amount",
      "Teacher Name",
      "Teacher Email",
      "Teacher Phone",
      "Note Titles",
      "Note Prices"
    ];

    return requiredHeaders.every(header => headers.includes(header));
  };

  const parseCSV = (text: string): { requestIds: string[], isValid: boolean, error?: string, warning?: string } => {
    try {
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      if (lines.length < 2) {
        return { requestIds: [], isValid: false, error: "CSV file is empty" };
      }

      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());

      if (!validateCSVFormat(headers)) {
        return {
          requestIds: [],
          isValid: false,
          error: "Invalid CSV format. Please use the format from 'Download Requests'"
        };
      }

      const requestIdIndex = headers.indexOf("Request ID");
      const requestIds: string[] = [];

      let invalidCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length > requestIdIndex) {
          const requestId = values[requestIdIndex].replace(/^"|"$/g, '').trim();
          if (requestId) {
            if (PATTERN_REGEX.test(requestId)) {
              requestIds.push(requestId);
            } else {
              invalidCount++;
            }
          }
        }
      }

      if (invalidCount > 0) {
        return {
          requestIds,
          isValid: true,
          warning: `${invalidCount} row${invalidCount !== 1 ? 's' : ''} skipped due to invalid Request ID format.`
        };
      }

      return { requestIds, isValid: true };
    } catch (error) {
      return { requestIds: [], isValid: false, error: "Failed to parse CSV file" };
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let inQuotes = false;
    let currentValue = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    result.push(currentValue);

    return result;
  };

  const handleFileUpload = async (file: File) => {
    setIsImporting(true);
    try {
      const text = await file.text();
      const { requestIds, isValid, error, warning } = parseCSV(text);

      if (!isValid) {
        toast({
          title: "Invalid CSV Format",
          description: error || "The CSV format doesn't match the expected format.",
          variant: "destructive",
        });
        return false;
      }

      if (requestIds.length === 0) {
        toast({
          title: "No Request IDs Found",
          description: "The CSV file doesn't contain any valid Request IDs.",
          variant: "destructive",
        });
        return false;
      }

      const newIds = addMultipleRequestIds(requestIds);
      setStoredIds(getStoredRequestIds());

      toast({
        title: "Import Successful",
        description: `Added ${newIds.length} new request${newIds.length !== 1 ? 's' : ''} from CSV.`,
      });

      if (warning) {
        toast({
          title: "Warning",
          description: warning,
          variant: "destructive",
        });
      }

      return true;
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to read the CSV file.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualAdd = () => {
    const id = manualRequestId.trim();
    if (!id) {
      toast({
        title: "Error",
        description: "Please enter a Request ID.",
        variant: "destructive",
      });
      return;
    }

    if (!PATTERN_REGEX.test(id)) return;

    const newIds = addMultipleRequestIds([id]);
    setStoredIds(getStoredRequestIds());
    setManualRequestId("");

    if (newIds.length > 0) {
      toast({
        title: "Request Added",
        description: `Request ${id} has been added to your history.`,
      });
    } else {
      toast({
        title: "Already Exists",
        description: "This request ID is already in your history.",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
      case "completed":
        return (
          <Badge className="gap-1 bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3" /> Completed
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="gap-1">
            <XCircle className="h-3 w-3" /> Cancelled
          </Badge>
        );
      case "refunded":
        return (
          <Badge className="gap-1 bg-amber-500 hover:bg-amber-600">
            <RefreshCw className="h-3 w-3" /> Refunded
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDownloadRequests = () => {
    if (!requests || requests.length === 0) return;

    const rows = [
      [
        "Request ID",
        "Status",
        "Created At",
        "Total Amount",
        "Teacher Name",
        "Teacher Email",
        "Teacher Phone",
        "Note Titles",
        "Note Prices",
      ],
    ];
    requests.forEach((req) => {
      const notes = requestNotes?.[req.id] || [];
      const titles = notes.map((n) => n.notes.title).join(" | ");
      const prices = notes.map((n) => formatPrice(n.notes.price ?? 0)).join(" | ");

      rows.push([
        req.request_id,
        req.status,
        format(new Date(req.created_at), "PPP 'at' p"),
        formatPrice(req.total_amount),
        req.teacher?.full_name ?? "",
        req.teacher?.email ?? "",
        req.teacher?.phone ?? "",
        titles,
        prices,
      ]);
    });

    const csvContent = rows
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "requests.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 pt-8 pb-2">
        <div className="mb-8 space-y-4 flex flex-col items-center text-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
            <p className="text-muted-foreground mt-2 leading-relaxed max-w-2xl">
              Track and manage your note requests. Your order history is stored locally on this device.
            </p>
          </div>

          <div className="w-full max-w-2xl">
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-5 shadow-sm text-center">
              <div className="mb-3">
                <span className="inline-block text-xs font-semibold tracking-widest text-destructive uppercase">
                  Critical Notice
                </span>
              </div>

              <p className="text-sm text-destructive leading-relaxed">
                Data is stored locally in your browser. Clearing browser data or switching devices will permanently erase your order history.
              </p>

              <p className="text-sm font-semibold text-destructive mt-3 leading-relaxed">
                Download the CSV backup immediately. No recovery is possible after deletion.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !requests || (requests.length === 0 && invalidIds.length === 0) ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No orders yet</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-md">
                When you request paid notes, they'll appear here. Your order
                history is saved on this device.
              </p>
              <Button className="mt-4" onClick={() => navigate("/")}>
                Browse Notes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {requests.length > 0 && (
            <div className="space-y-5">
            {requests.map((request) => {
              const isRejectedOrRefunded =
                (request.status === "rejected" ||
                  request.status === "refunded") &&
                request.rejection_reason;

              return (
                <Card
                  key={request.id}
                  className="overflow-hidden border-muted/40"
                >
                  <CardHeader className="space-y-4 pb-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <CardTitle className="font-mono text-lg tracking-tight">
                          {request.request_id}
                        </CardTitle>

                        <CardDescription>
                          Created{" "}
                          {format(
                            new Date(request.created_at),
                            "PPP 'at' p"
                          )}
                        </CardDescription>

                        {request.status === "cancelled" &&
                          request.rejection_reason !== "" && (
                            <p className="text-sm text-muted-foreground">
                              You Cancelled on{" "}
                              {format(
                                new Date(request.updated_at),
                                "PPP 'at' p"
                              )}
                            </p>
                          )}
                      </div>

                      <div className="items-center gap-2">
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    {/* Info Section */}
                    {request.teacher && (
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* Teacher */}
                        <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                          <h4 className="text-sm font-semibold">
                            Teacher Information
                          </h4>

                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>
                              <span className="font-medium text-foreground">
                                Name:
                              </span>{" "}
                              {request.teacher.full_name}
                            </p>

                            <p>
                              <span className="font-medium text-foreground">
                                Email:
                              </span>{" "}
                              {request.teacher.email}
                            </p>

                            {request.teacher.phone && (
                              <p>
                                <span className="font-medium text-foreground">
                                  Phone:
                                </span>{" "}
                                {request.teacher.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Student */}
                        <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                          <h4 className="text-sm font-semibold">
                            Student Information
                          </h4>

                          <div className="space-y-1 text-sm text-muted-foreground">
                            {request.contact_type === "both" && (
                              <>
                                <p><span className="font-medium text-foreground">
                                  Email:
                                </span>{" "}{request.student_contact.replace("Email: ", "").split("|")[0]}</p>
                                <p><span className="font-medium text-foreground">
                                  Phone:
                                </span>{" "}{request.student_contact.replace("Phone: ", "").split("|")[1]}</p>
                              </>
                            )}

                            {request.contact_type === "email" && (
                              <p><span className="font-medium text-foreground">
                                Email:
                              </span>{" "}{request.student_contact}</p>
                            )}

                            {request.contact_type === "phone" && (
                              <p><span className="font-medium text-foreground">
                                Phone:
                              </span>{" "}{request.student_contact}</p>
                            )}

                            <p>
                              Ordered{" "}
                              {format(
                                new Date(request.created_at),
                                "PPP 'at' p"
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Screenshots */}
                        <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                          <h4 className="text-sm font-semibold">
                            Payment Proofs
                          </h4>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setReceiptPreviewUrl(
                                  proxyImageUrl(request.receipt_image_url) ?? request.receipt_image_url
                                )
                              }
                            >
                              Payment Screenshot
                            </Button>

                            {request.refund_screenshot_url && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  setReceiptPreviewUrl(
                                    proxyImageUrl(String(request.refund_screenshot_url!))
                                  )
                                }
                              >
                                Refund Screenshot
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">
                          Requested Notes
                        </p>

                        <span className="text-sm text-muted-foreground">
                          {requestNotes?.[request.id]?.length || 0} items
                        </span>
                      </div>

                      <ul className="space-y-2">
                        {requestNotes?.[request.id]?.map((rn) => (
                          <li
                            key={rn.id}
                            className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3"
                          >
                            <span className="truncate text-sm font-medium">
                              {rn.notes.title}
                            </span>

                            <span className="text-sm text-muted-foreground">
                              {formatPrice(rn.notes.price ?? 0)}
                            </span>
                          </li>
                        )) || (
                            <li className="text-sm text-muted-foreground">
                              Loading notes...
                            </li>
                          )}
                      </ul>

                      <div className="flex items-center justify-between border-t pt-3">
                        <span className="font-medium">Total</span>

                        <span className="font-semibold text-primary">
                          {formatPrice(request.total_amount)}
                        </span>
                      </div>
                    </div>

                    {/* Rejection / Refund Reason */}
                    {isRejectedOrRefunded && (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                        <p className="text-sm font-semibold text-destructive">
                          Reason
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {request.rejection_reason}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 border-t pt-4">
                      {request.status === "completed" &&
                        request.download_code &&
                        !request.download_code_used_at && (
                          <Button
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/download?code=${encodeURIComponent(
                                  request.download_code
                                )}&requestId=${encodeURIComponent(
                                  request.request_id
                                )}`
                              )
                            }
                          >
                            <Download className="mr-1 h-4 w-4" />
                            Download Notes
                          </Button>
                        )}

                      {request.status === "completed" &&
                        request.download_code_used_at && (
                          <Badge variant="outline">
                            Downloaded on{" "}
                            {format(
                              new Date(
                                request.download_code_used_at
                              ),
                              "MMM d, yyyy"
                            )}
                          </Badge>
                        )}

                      {request.status === "pending" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelClick(request)}
                        >
                          Cancel Request
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveFromHistory(
                            request.request_id
                          )
                        }
                        className="text-muted-foreground"
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Remove from History
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
            )}

            {invalidIds.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Unavailable Requests</h3>
                {invalidIds.map((id) => (
                  <Card key={id} className="border-destructive/40">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="space-y-1">
                        <p className="font-mono text-sm">{id}</p>
                        <p className="text-sm text-muted-foreground">
                          This request is no longer available or doesn't exist.
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromHistory(id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Refresh & Download & Import */}
        <div className="my-6 grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 justify-center gap-2">
          {storedIds.length > 0 && (
            <>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
              <Button variant="outline" onClick={handleDownloadRequests}>
                <Download className="h-4 w-4 mr-2" />
                Download Requests
              </Button>
              <Button variant="destructive" onClick={() => { localStorage.removeItem("student_request_ids"); refetch(); }}>
                <CircleX className="h-4 w-4 mr-2" />
                Clear Requests
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import Requests
          </Button>

        </div>
        <Footer />
      </main>

      {/* Receipt Preview */}
      <Dialog open={!!receiptPreviewUrl} onOpenChange={(o) => { if (!o) setReceiptPreviewUrl(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
          </DialogHeader>
          {receiptPreviewUrl && (
            <>
              {imageLoading && (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              <div className="flex justify-center">
                <img
                  src={receiptPreviewUrl}
                  alt="Payment receipt"
                  className={`max-w-full rounded-lg object-contain transition-opacity duration-300 ${imageLoading ? "opacity-0" : "opacity-100"}`}
                  onLoad={() => setImageLoading(false)}
                />
              </div>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptPreviewUrl(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel request{" "}
              <strong>{selectedRequest?.request_id}</strong>? This action cannot
              be undone. You'll need to contact the teacher for a refund if
              you've already paid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedRequest && cancelMutation.mutate(selectedRequest)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin inline-block" />
              ) : (
                "Cancel Request"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel result confirmation */}
      <AlertDialog open={!!cancelResult} onOpenChange={(o) => !o && setCancelResult(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Cancelled</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div>Your cancellation has been processed successfully.</div>
                <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                  <div><span className="text-muted-foreground">Request ID:</span> <strong>{cancelResult?.requestId}</strong></div>
                  <div><span className="text-muted-foreground">Final status:</span> <strong className="capitalize">{cancelResult?.status}</strong></div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setCancelResult(null)}>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Requests</DialogTitle>
            <DialogDescription>
              Add existing requests to your history using a CSV file or by manually entering a Request ID.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="auto" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="auto">
                <FileUp className="h-4 w-4 mr-2" />
                Automatic (CSV)
              </TabsTrigger>
              <TabsTrigger value="manual">
                <PlusCircle className="h-4 w-4 mr-2" />
                Manual Entry
              </TabsTrigger>
            </TabsList>

            <TabsContent value="auto" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="csv-file">Upload CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCsvFile(file);
                      handleFileUpload(file).then(() => {
                        if (csvFile) {
                          setImportDialogOpen(false);
                          setCsvFile(null);
                        }
                      });
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Upload a CSV file exported from "Download Requests". The file must match the exact format.
                </p>
              </div>
              <DialogFooter>
                <Button variant="default" className="w-full" onClick={() => setImportDialogOpen(false)}>
                  Done
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="request-id">Request ID</Label>
                <Input
                  id="request-id"
                  placeholder="e.g., REQ_XXXXXXXX_XXXX"
                  value={manualRequestId}
                  onChange={(e) => setManualRequestId(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleManualAdd();
                      setImportDialogOpen(false);
                    }
                  }}
                />
                {manualValidation.hint && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {manualValidation.hint}
                  </p>
                )}
                {manualValidation.error && (
                  <p className="text-xs text-destructive font-mono">
                    {manualValidation.error}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter a single Request ID to add it to your history.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleManualAdd();
                    setImportDialogOpen(false);
                  }}
                  disabled={!PATTERN_REGEX.test(manualRequestId)}
                >
                  Add Request
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}