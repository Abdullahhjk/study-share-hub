import { useState, Fragment } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  XCircle,
  ShieldCheck,
  Loader2,
  Eye,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  institution_id: "Institution ID Card",
  appointment_letter: "Appointment Letter",
  faculty_staff_id: "Faculty/Staff ID Card",
  teaching_license: "Teaching License/Certificate",
  employment_letter: "Employment Verification Letter",
};

const TEACHING_MODE_LABEL: Record<string, string> = {
  tuition_center: "Tuition Center",
  home_tuition: "Home Tuition",
  online_tutor: "Online Tutoring",
  youtube_teacher: "YouTube / Content Creator",
  school_college: "School / College Teacher",
  other: "Other",
};

const STATUS_BADGE: Record<string, string> = {
  pending_review: "bg-warning text-warning-foreground",
  verified: "bg-success text-success-foreground",
  rejected: "bg-destructive text-destructive-foreground",
  expired: "bg-muted text-muted-foreground",
};

interface VerificationRequest {
  id: string;
  teacher_id: string;
  method: string;
  document_type: string | null;
  document_url: string | null;
  document_name: string | null;
  teaching_mode: string | null;
  institution_name: string | null;
  subjects_taught: string | null;
  years_experience: string | null;
  details: string | null;
  status: string;
  review_feedback: string | null;
  created_at: string;
  profile: {
    full_name: string;
    email: string;
    school_name: string | null;
  } | null;
}

export function VerificationReviewPanel() {
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ["verification-requests", showAll],
    queryFn: async () => {
      let query = supabase
        .from("teacher_verification_requests")
        .select(
          "id, teacher_id, method, document_type, document_url, document_name, teaching_mode, institution_name, subjects_taught, years_experience, details, status, review_feedback, created_at, profile:profiles!teacher_verification_requests_teacher_id_fkey(id, full_name, email, school_name)"
        )
        .order("created_at", { ascending: false });
      if (!showAll) query = query.eq("status", "pending_review");
      query = query.limit(100);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as VerificationRequest[];
    },
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
    retry: 1,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      requestId,
      approve,
      reason,
    }: {
      requestId: string;
      approve: boolean;
      reason?: string;
    }) => {
      const { error } = await supabase.rpc("review_teacher_verification", {
        p_request_id: requestId,
        p_approve: approve,
        p_feedback: reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["verification-requests"] });
      toast.success(
        vars.approve
          ? "Teacher verified. Badge is now public."
          : "Request rejected."
      );
    },
    onError: (error) => {
      toast.error(error.message || "Review failed.");
    },
  });

  const expireMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("expire_teacher_verification", {
        p_request_id: requestId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification-requests"] });
      toast.success("Verification expired.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to expire verification.");
    },
  });

  const viewDocument = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("verification-documents")
      .createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast.error(error?.message || "Could not open the document.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  if (isLoading && !requests) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Teacher Verification Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-destructive">
            <XCircle className="h-10 w-10" />
            <p className="text-sm font-medium">Failed to load verification requests</p>
            <p className="max-w-md text-xs text-muted-foreground">
              {(error as Error).message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingCount =
    requests?.filter((r) => r.status === "pending_review").length ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Teacher Verification Review
          </CardTitle>
          <CardDescription>
            Review teacher identity proof — documents or teaching details.
            Approved teachers get a public verified badge.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="destructive">{pendingCount} pending</Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll((v) => !v)}
          >
            <ClipboardCheck className="h-4 w-4" />
            <span className="ml-1">{showAll ? "Pending only" : "Show all"}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!requests || requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mb-2 text-success" />
            <p>No verification requests</p>
            <p className="mt-1 text-xs">
              Teachers see their verification requests here once submitted.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Submission</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <Fragment key={req.id}>
                    <TableRow>
                      <TableCell className="align-top">
                        <div className="font-medium">
                          {req.profile?.full_name || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {req.profile?.email || "N/A"}
                        </div>
                        {req.profile?.school_name && (
                          <div className="text-xs text-muted-foreground">
                            {req.profile.school_name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {req.method === "details" ? (
                          <div className="space-y-1">
                            <div className="font-medium">
                              {req.teaching_mode
                                ? (TEACHING_MODE_LABEL[req.teaching_mode] ??
                                  req.teaching_mode)
                                : "Teaching details"}
                            </div>
                            {req.subjects_taught && (
                              <div className="text-xs text-muted-foreground">
                                Subjects: {req.subjects_taught}
                              </div>
                            )}
                            {req.years_experience && (
                              <div className="text-xs text-muted-foreground">
                                Experience: {req.years_experience} yrs
                              </div>
                            )}
                            {req.details && (
                              <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                                {req.details}
                              </p>
                            )}
                            {req.review_feedback && (
                              <div className="text-xs text-muted-foreground">
                                Feedback: {req.review_feedback}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div>
                              {DOCUMENT_TYPE_LABEL[req.document_type ?? ""] ??
                                req.document_type}
                            </div>
                            {req.document_name && (
                              <div className="text-xs text-muted-foreground">
                                {req.document_name}
                              </div>
                            )}
                            {req.review_feedback && (
                              <div className="text-xs text-muted-foreground">
                                Feedback: {req.review_feedback}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        {format(new Date(req.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge className={STATUS_BADGE[req.status]}>
                          {req.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-2">
                          {req.method !== "details" && req.document_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewDocument(req.document_url!)}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="ml-1">View</span>
                            </Button>
                          )}
                          {req.status === "pending_review" && (
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  disabled={
                                    reviewMutation.isPending ||
                                    rejectingId === req.id
                                  }
                                  onClick={() =>
                                    reviewMutation.mutate({
                                      requestId: req.id,
                                      approve: true,
                                    })
                                  }
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="ml-1">Approve</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={
                                    reviewMutation.isPending ||
                                    rejectingId === req.id
                                  }
                                  onClick={() => {
                                    setRejectingId(req.id);
                                    setFeedback("");
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                  <span className="ml-1">Reject</span>
                                </Button>
                              </div>
                              {rejectingId === req.id && (
                                <div className="space-y-2">
                                  <Textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Reason for rejection (shown to teacher)"
                                    rows={2}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={reviewMutation.isPending}
                                      onClick={() =>
                                        reviewMutation.mutate({
                                          requestId: req.id,
                                          approve: false,
                                          reason: feedback,
                                        })
                                      }
                                    >
                                      Confirm Reject
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setRejectingId(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {req.status === "verified" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={expireMutation.isPending}
                              onClick={() => expireMutation.mutate(req.id)}
                            >
                              {expireMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                              <span className="ml-1">Expire</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
