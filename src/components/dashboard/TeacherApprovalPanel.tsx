import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { CheckCircle, XCircle, UserCheck, Loader2, Eye, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const VERIFICATION_DOCUMENT_LABEL: Record<string, string> = {
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

interface PendingTeacher {
  user_id: string;
  role: "pending" | "teacher" | "admin";
  profile: {
    full_name: string;
    email: string;
    school_name: string | null;
    phone: string | null;
    created_at: string;
  } | null;
  verification: {
    id: string;
    method: string;
    document_type: string | null;
    document_url: string | null;
    document_name: string | null;
    teaching_mode: string | null;
    institution_name: string | null;
    subjects_taught: string | null;
    years_experience: string | null;
    details: string | null;
  } | null;
}

export function TeacherApprovalPanel() {
  const queryClient = useQueryClient();
  const [verificationDetail, setVerificationDetail] = useState<PendingTeacher["verification"] | null>(null);

  const { data: pendingTeachers, isLoading } = useQuery({
    queryKey: ["pending-teachers"],
    queryFn: async () => {
      // Get all users with pending role
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "pending");

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];

      // Get their profiles
      const userIds = roles.map((r) => r.user_id);
      const [profilesResult, verificationResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, school_name, phone, created_at")
          .in("id", userIds),
        supabase
          .from("teacher_verification_requests")
          .select("id, teacher_id, method, document_type, document_url, document_name, teaching_mode, institution_name, subjects_taught, years_experience, details")
          .in("teacher_id", userIds)
          .eq("status", "pending_review"),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (verificationResult.error) throw verificationResult.error;

      return roles.map((role) => ({
        user_id: role.user_id,
        role: role.role as "pending" | "teacher" | "admin",
        profile:
          profilesResult.data?.find((p) => p.id === role.user_id) || null,
        verification:
          verificationResult.data?.find((v) => v.teacher_id === role.user_id) ||
          null,
      })) as PendingTeacher[];
    },
    refetchInterval: 30000,
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

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: "teacher" })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-teachers"] });
      toast.success("Teacher approved successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to approve: " + error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error: rejectError } = await supabase
        .from("user_roles")
        .update({ role: "rejected" })
        .eq("user_id", userId);
      if (rejectError) throw rejectError;

      const { error: verifError } = await supabase
        .from("teacher_verification_requests")
        .update({
          status: "expired",
          review_feedback: "Account approval was rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("teacher_id", userId)
        .eq("status", "pending_review");
      if (verifError) throw verifError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-teachers"] });
      toast.success("User rejected.");
    },
    onError: (error: any) => {
      toast.error("Failed to reject: " + error.message);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Teacher Approval Panel
          </CardTitle>
          <CardDescription>
            Review and approve pending teacher registrations. Only approved
            teachers can upload notes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!pendingTeachers || pendingTeachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mb-2 text-success" />
            <p>No pending approvals</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>School/Institution</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingTeachers.map((teacher) => (
                <TableRow key={teacher.user_id}>
                  <TableCell className="font-medium">
                    {teacher.profile?.full_name || "Unknown"}
                  </TableCell>
                  <TableCell>{teacher.profile?.email || "N/A"}</TableCell>
                  <TableCell>
                    {teacher.profile?.school_name || (
                      <span className="text-muted-foreground">
                        Not provided
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {teacher.profile?.phone || (
                      <span className="text-muted-foreground">
                        Not provided
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {teacher.verification ? (
                      <div className="space-y-1">
                        {teacher.verification.method === "details" ? (
                          <>
                            <div className="flex items-center gap-1 text-xs font-medium">
                              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                              {teacher.verification.teaching_mode
                                ? (TEACHING_MODE_LABEL[
                                    teacher.verification.teaching_mode
                                  ] ?? teacher.verification.teaching_mode)
                                : "Teaching details"}
                            </div>
                            {teacher.verification.details && (
                              <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                                {teacher.verification.details}
                              </p>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() =>
                                setVerificationDetail(teacher.verification)
                              }
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="ml-1">View details</span>
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1 text-xs font-medium">
                              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                              {
                                VERIFICATION_DOCUMENT_LABEL[
                                  teacher.verification.document_type ?? ""
                                ] ?? teacher.verification.document_type
                              }
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() =>
                                viewDocument(teacher.verification!.document_url!)
                              }
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="ml-1">View doc</span>
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not submitted</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {teacher.profile?.created_at
                      ? format(
                        new Date(teacher.profile.created_at),
                        "MMM d, yyyy"
                      )
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => approveMutation.mutate(teacher.user_id)}
                        disabled={approveMutation.isPending}
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin inline-block" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        <span className="ml-1">Approve</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectMutation.mutate(teacher.user_id)}
                        disabled={rejectMutation.isPending}
                      >
                        {rejectMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin inline-block" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        <span className="ml-1">Reject</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      </Card>

      <Dialog
        open={!!verificationDetail}
        onOpenChange={(open) => { if (!open) setVerificationDetail(null); }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Teaching Details</DialogTitle>
            <DialogDescription>
              How this teacher says they teach.
            </DialogDescription>
          </DialogHeader>
          {verificationDetail && (
            <div className="space-y-3 text-sm">
              {verificationDetail.teaching_mode && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Where they teach</p>
                  <p>{TEACHING_MODE_LABEL[verificationDetail.teaching_mode] ?? verificationDetail.teaching_mode}</p>
                </div>
              )}
              {verificationDetail.institution_name && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Institution / Center</p>
                  <p>{verificationDetail.institution_name}</p>
                </div>
              )}
              {verificationDetail.subjects_taught && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Subjects</p>
                  <p>{verificationDetail.subjects_taught}</p>
                </div>
              )}
              {verificationDetail.years_experience && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Experience</p>
                  <p>{verificationDetail.years_experience} yrs</p>
                </div>
              )}
              {verificationDetail.details && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Details</p>
                  <p className="whitespace-pre-wrap">{verificationDetail.details}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
