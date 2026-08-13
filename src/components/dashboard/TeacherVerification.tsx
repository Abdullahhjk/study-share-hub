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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Clock,
  FileUp,
  Loader2,
  ShieldCheck,
  XCircle,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const VERIFICATION_DOCUMENT_TYPES = [
  { value: "institution_id", label: "Institution ID Card" },
  { value: "appointment_letter", label: "Appointment Letter" },
  { value: "faculty_staff_id", label: "Faculty/Staff ID Card" },
  { value: "teaching_license", label: "Teaching License/Certificate" },
  { value: "employment_letter", label: "Employment Verification Letter" },
] as const;

export type VerificationDocumentType = (typeof VERIFICATION_DOCUMENT_TYPES)[number]["value"];

const DOCUMENT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  VERIFICATION_DOCUMENT_TYPES.map((d) => [d.value, d.label])
);

export const TEACHING_MODES = [
  { value: "tuition_center", label: "Tuition Center" },
  { value: "home_tuition", label: "Home Tuition" },
  { value: "online_tutor", label: "Online Tutoring" },
  { value: "youtube_teacher", label: "YouTube / Content Creator" },
  { value: "school_college", label: "School / College Teacher" },
  { value: "other", label: "Other" },
] as const;

export type TeachingMode = (typeof TEACHING_MODES)[number]["value"];

const TEACHING_MODE_LABEL: Record<string, string> = Object.fromEntries(
  TEACHING_MODES.map((m) => [m.value, m.label])
);

interface TeacherVerificationProps {
  teacherId: string;
}

export function TeacherVerification({ teacherId }: TeacherVerificationProps) {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<"document" | "details">("document");
  const [documentType, setDocumentType] = useState<VerificationDocumentType>("institution_id");
  const [file, setFile] = useState<File | null>(null);
  const [teachingMode, setTeachingMode] = useState<TeachingMode>("tuition_center");
  const [institutionName, setInstitutionName] = useState("");
  const [subjectsTaught, setSubjectsTaught] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [details, setDetails] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-verification", teacherId],
    queryFn: async () => {
      const [profileRes, requestsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("is_verified, verified_at")
          .eq("id", teacherId)
          .maybeSingle(),
        supabase
          .from("teacher_verification_requests")
          .select("*")
          .eq("teacher_id", teacherId)
          .order("created_at", { ascending: false }),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (requestsRes.error) throw requestsRes.error;

      return {
        isVerified: profileRes.data?.is_verified ?? false,
        verifiedAt: profileRes.data?.verified_at ?? null,
        requests: requestsRes.data ?? [],
      };
    },
  });

  const latestRequest = data?.requests[0] ?? null;

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (method === "document") {
        if (!file) throw new Error("Please select a document to upload.");
        if (file.size > 10 * 1024 * 1024) throw new Error("Document must be under 10 MB.");

        const ext = file.name.split(".").pop() || "bin";
        const filePath = `${teacherId}/verif_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("verification-documents")
          .upload(filePath, file, { upsert: false });
        if (uploadError) throw uploadError;

        const { error: rpcError } = await supabase.rpc("submit_teacher_verification", {
          p_document_type: documentType,
          p_document_url: filePath,
          p_document_name: file.name,
          p_method: "document",
        });
        if (rpcError) {
          await supabase.storage
            .from("verification-documents")
            .remove([filePath])
            .then(() => null);
          throw rpcError;
        }
      } else {
        if (!details.trim()) throw new Error("Please describe how you teach.");
        const { error: rpcError } = await supabase.rpc("submit_teacher_verification", {
          p_method: "details",
          p_teaching_mode: teachingMode,
          p_institution_name: institutionName.trim() || null,
          p_subjects_taught: subjectsTaught.trim() || null,
          p_years_experience: yearsExperience.trim() || null,
          p_details: details.trim(),
        });
        if (rpcError) throw rpcError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-verification", teacherId] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      setFile(null);
      setDetails("");
      toast.success("Verification request submitted for review.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit verification request.");
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

  const canSubmit = !latestRequest || ["rejected", "expired"].includes(latestRequest.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Teacher Verification
        </CardTitle>
        <CardDescription>
          Verify your teaching identity to earn the verified badge on your
          public notes. Upload a document, or tell us how and where you teach.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <ShieldCheck
            className={`h-5 w-5 ${data?.isVerified ? "text-success" : "text-muted-foreground"}`}
          />
          <div className="text-sm">
            {data?.isVerified ? (
              <span className="font-medium text-success">
                Verified Teacher
                {data.verifiedAt &&
                  ` since ${format(new Date(data.verifiedAt), "MMM d, yyyy")}`}
              </span>
            ) : (
              <span className="text-muted-foreground">Not verified yet</span>
            )}
          </div>
        </div>

        {latestRequest && (
          <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
            {latestRequest.status === "pending_review" && (
              <>
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-warning">
                  Request under review — submitted{" "}
                  {format(new Date(latestRequest.created_at), "MMM d, yyyy")}
                </span>
              </>
            )}
            {latestRequest.status === "rejected" && (
              <>
                <XCircle className="h-4 w-4 text-destructive" />
                <div className="text-destructive">
                  Request rejected.{" "}
                  {latestRequest.review_feedback && (
                    <span className="text-muted-foreground">
                      Reason: {latestRequest.review_feedback}
                    </span>
                  )}
                </div>
              </>
            )}
            {latestRequest.status === "verified" && (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-success">Verification active</span>
              </>
            )}
            {latestRequest.status === "expired" && (
              <>
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Previous verification expired — you can apply again.
                </span>
              </>
            )}
          </div>
        )}

        {canSubmit ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>How do you want to prove your teaching?</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMethod("document")}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors ${method === "document"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                    }`}
                >
                  <FileUp className="h-4 w-4 shrink-0" />
                  <span>
                    <span className="block font-medium">Upload a document</span>
                    <span className="text-xs text-muted-foreground">
                      Institution ID, appointment letter, etc.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("details")}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors ${method === "details"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                    }`}
                >
                  <UserRound className="h-4 w-4 shrink-0" />
                  <span>
                    <span className="block font-medium">Tell us about your teaching</span>
                    <span className="text-xs text-muted-foreground">
                      No documents? Describe how and where you teach.
                    </span>
                  </span>
                </button>
              </div>
            </div>

            {method === "document" ? (
              <>
                <div className="space-y-1.5">
                  <Label>Document Type</Label>
                  <Select
                    value={documentType}
                    onValueChange={(v) => setDocumentType(v as VerificationDocumentType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {VERIFICATION_DOCUMENT_TYPES.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Document Upload</Label>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload one of the accepted documents (image or PDF, max 10 MB).
                    It will not be visible to other users.
                  </p>
                </div>

                {file && (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2 text-xs text-muted-foreground">
                    <FileUp className="h-4 w-4" />
                    <span className="truncate">{file.name}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Where do you teach?</Label>
                    <Select
                      value={teachingMode}
                      onValueChange={(v) => setTeachingMode(v as TeachingMode)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a teaching mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEACHING_MODES.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Institution / Center Name (optional)</Label>
                    <Input
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      placeholder="e.g. ABC Tuition Center"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Subjects you teach</Label>
                    <Input
                      value={subjectsTaught}
                      onChange={(e) => setSubjectsTaught(e.target.value)}
                      placeholder="e.g. Mathematics, Physics"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Teaching experience (years)</Label>
                    <Input
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(e.target.value)}
                      placeholder="e.g. 5"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Tell us about your teaching *</Label>
                  <Textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={5}
                    placeholder="Describe how you teach — e.g. number of students, tuition timing, your YouTube channel, online classes, where you teach from, anything that proves you are a real teacher. This is only visible to you and admins."
                  />
                  <p className="text-xs text-muted-foreground">
                    Only visible to you and admins. This replaces the document.
                  </p>
                </div>
              </>
            )}

            <Button
              onClick={() => submitMutation.mutate()}
              disabled={
                submitMutation.isPending ||
                (method === "document" ? !file : !details.trim())
              }
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              <span className="ml-1">Submit for Verification</span>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            <ShieldCheck className="h-10 w-10" />
            <p className="text-sm">
              {latestRequest?.status === "verified"
                ? "Your identity is verified."
                : "You already have a request under review."}
            </p>
          </div>
        )}

        {data && data.requests.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Submission History
            </h4>
            {data.requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border p-2 text-xs"
              >
                <span className="truncate">
                  {r.method === "details"
                    ? `Teaching details${r.teaching_mode ? ` — ${TEACHING_MODE_LABEL[r.teaching_mode] ?? r.teaching_mode}` : ""
                    }`
                    : (DOCUMENT_TYPE_LABEL[r.document_type] ?? r.document_type)}
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant="outline">{r.status.replace("_", " ").toUpperCase()}</Badge>
                  <span className="text-muted-foreground">
                    {format(new Date(r.created_at), "MMM d, yyyy")}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
