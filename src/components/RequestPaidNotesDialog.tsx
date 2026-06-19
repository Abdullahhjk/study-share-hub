import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Upload, Copy, Star, Smartphone, Building2, Banknote, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Note } from "@/lib/types";
import type { BankCredWithBank } from "@/lib/payment-types";
import { isMobileWallet, copyToClipboard } from "@/lib/payment-utils";
import { saveRequestId } from "@/lib/student-request-storage";
import { useCurrency } from "@/hooks/useCurrency";

const requestSchema = z
  .object({
    contactType: z.enum(["email", "phone", "both"]),
    email: z.string().optional(),
    phone: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.contactType === "email") return !!data.email;
      if (data.contactType === "phone") return !!data.phone;
      if (data.contactType === "both") return !!data.email && !!data.phone;
      return false;
    },
    {
      message: "Please provide the required contact information",
      path: ["email"],
    }
  );

type RequestFormData = z.infer<typeof requestSchema>;

interface RequestPaidNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedNotes: Note[];
  onSuccess: () => void;
}

export function RequestPaidNotesDialog({
  open,
  onOpenChange,
  selectedNotes,
  onSuccess,
}: RequestPaidNotesDialogProps) {
  const { formatPrice } = useCurrency();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      contactType: "email",
    },
  });

  const contactType = watch("contactType");
  const totalAmount = selectedNotes.reduce(
    (sum, note) => sum + Number(note.price ?? 0),
    0
  );
  const teacherId = selectedNotes[0]?.teacher_id;
  const teacherContact = selectedNotes[0]?.teacher;

  const { data: methods = [], isLoading: methodsLoading } = useQuery({
    queryKey: ["bank_creds", teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_creds")
        .select("*, approved_bank:approved_bank_id(*)")
        .eq("teacher_id", teacherId)
        .order("is_preferred", { ascending: false })
        .order("bank_id", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as BankCredWithBank[];
    },
    enabled: !!teacherId && open,
  });

  const selectedMethod = methods.find((m) => m.bank_id === selectedBankId) ?? null;
  const selectedBankName = selectedMethod?.approved_bank?.bank_name ?? "";
  const isWallet = isMobileWallet(selectedBankName);

  const handleCopy = async (text: string, key: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopiedKey(null), 2000);
    } else {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const onSubmit = async (data: RequestFormData) => {
    if (!receiptFile) {
      toast({
        title: "Receipt required",
        description: "Please upload a screenshot of your payment receipt.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const fileExt = receiptFile.name.split(".").pop();
      const randomBytes = new Uint8Array(8);
      crypto.getRandomValues(randomBytes);
      const randomHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
      const fileName = `${teacherId}_${Date.now()}-${randomHex}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("receipts")
        .getPublicUrl(fileName);
      const receiptUrl = urlData?.publicUrl;

      let studentContact = "";
      if (data.contactType === "email") {
        studentContact = data.email || "";
      } else if (data.contactType === "phone") {
        studentContact = data.phone || "";
      } else {
        studentContact = `Email: ${data.email} | Phone: ${data.phone}`;
      }

      const { data: requestData, error: requestError } = await supabase.rpc(
        "create_note_request",
        {
          p_student_contact: studentContact,
          p_contact_type: data.contactType,
          p_receipt_image_url: receiptUrl,
          p_total_amount: totalAmount,
          p_teacher_id: teacherId,
        }
      );

      if (requestError) throw requestError;

      const serverRequestId = requestData?.request_id;

      const requestNotesData = selectedNotes.map((note) => ({
        request_id: requestData.id,
        note_id: note.id,
      }));

      const { error: linkError } = await supabase
        .from("request_notes")
        .insert(requestNotesData);

      if (linkError) throw linkError;
      setRequestId(serverRequestId);
      toast({
        title: "Request submitted!",
        description: "Your request has been submitted successfully.",
      });
    } catch (error) {
      console.error("Error submitting request:", error);
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRequestId(null);
    setReceiptFile(null);
    setSelectedBankId("");
    setCopiedKey(null);
    reset();
    onOpenChange(false);
    if (requestId) onSuccess();
  };

  const copyRequestId = () => {
    if (requestId) {
      navigator.clipboard.writeText(requestId);
      toast({
        title: "Copied!",
        description: "Request ID copied to clipboard.",
      });
    }
  };

  if (requestId) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <Check className="h-5 w-5" />
              Request Submitted!
            </DialogTitle>
            <DialogDescription>
              Your request has been submitted. Once the teacher verifies your
              payment, a one-time download code will be generated for you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Your Request ID</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-lg font-semibold">
                  {requestId}
                </code>
                <Button variant="outline" size="icon" onClick={copyRequestId}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Save this ID for reference when communicating with the teacher.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="
              w-[90vw]
              max-w-3xl
              h-[85vh]
              overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Request Paid Notes</DialogTitle>
          <DialogDescription>
            Submit your payment receipt and contact info. Once verified, a
            one-time download code will be generated for your notes.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
          <b>Important:</b> Select a payment method below, transfer the amount
          to that account, then upload your receipt.
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Selected Notes Summary */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-sm font-medium">
              Selected Notes ({selectedNotes.length})
            </p>
            <ul className="mt-2 space-y-1">
              {selectedNotes.map((note) => (
                <li
                  key={note.id}
                  className="flex flex-row justify-between items-center text-sm"
                >
                  <span className="flex flex-col items-start">
                    <p className="truncate font-semibold">{note.title}</p>
                    <p className="text-xs w-[50%] text-justify break-words text-muted-foreground">
                      {note.description}
                    </p>
                  </span>
                  <span className="flex justify-center items-center w-16 font-medium">
                    {formatPrice(note.price)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t pt-2 font-medium">
              <span>Total</span>
              <span className="text-primary">{formatPrice(totalAmount)}</span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label>Pay using</Label>
            {methodsLoading ? (
              <div className="flex h-10 items-center justify-center rounded-md border">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : methods.length === 0 ? (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                No payment methods available for this teacher yet.
              </div>
            ) : (
              <>
                <Select
                  value={selectedBankId}
                  onValueChange={setSelectedBankId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a bank or wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {methods.map((m) => {
                      const name = m.approved_bank?.bank_name ?? "Unknown";
                      return (
                        <SelectItem key={m.bank_id} value={m.bank_id}>
                          <span className="flex items-center gap-2">
                            {m.is_preferred && (
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            )}
                            {name}
                            {m.is_preferred && (
                              <span className="text-xs text-muted-foreground">
                                (Recommended)
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {selectedMethod && (
                  <div className="animate-scale-in rounded-lg border bg-muted/30 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      {isWallet ? (
                        <Smartphone className="h-5 w-5 text-primary" />
                      ) : (
                        <Building2 className="h-5 w-5 text-primary" />
                      )}
                      <p className="text-sm font-medium">{selectedBankName}</p>
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        {isWallet ? "Mobile Wallet" : "Islamic Bank"}
                      </Badge>
                    </div>

                    {isWallet ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Transfer Phone Number
                          </p>
                          <p className="text-base font-semibold">
                            {selectedMethod.account_number_or_iban}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() =>
                            handleCopy(
                              selectedMethod.account_number_or_iban,
                              selectedMethod.bank_id
                            )
                          }
                        >
                          {copiedKey === selectedMethod.bank_id ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copiedKey === selectedMethod.bank_id
                            ? "Copied!"
                            : "Copy Number"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">
                              Account Holder
                            </p>
                            <p className="font-medium text-foreground">
                              {selectedMethod.account_holder_name}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Bank</p>
                            <p className="font-medium text-foreground">
                              {selectedBankName}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            IBAN
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="flex-1 truncate rounded bg-background px-2 py-1 font-mono text-xs">
                              {selectedMethod.account_number_or_iban}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 shrink-0 gap-1.5 text-xs"
                              onClick={() =>
                                handleCopy(
                                  selectedMethod.account_number_or_iban,
                                  selectedMethod.bank_id
                                )
                              }
                            >
                              {copiedKey === selectedMethod.bank_id ? (
                                <Check className="h-3.5 w-3.5 text-success" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                              {copiedKey === selectedMethod.bank_id
                                ? "Copied!"
                                : "Copy IBAN"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Fallback: show teacher contact */}
            {teacherContact && methods.length === 0 && !methodsLoading && (
              <div className="rounded-lg border bg-accent/50 p-3">
                <p className="text-sm font-medium">Contact Teacher:</p>
                <p className="text-sm">{teacherContact.full_name}</p>
                {teacherContact.phone && (
                  <p className="text-sm">
                    Phone: {teacherContact.phone}
                  </p>
                )}
                <p className="text-sm">Email: {teacherContact.email}</p>
              </div>
            )}
          </div>

          {/* Contact Type */}
          <div className="space-y-2">
            <Label>How should the teacher contact you?</Label>
            <RadioGroup
              value={contactType}
              onValueChange={(value) =>
                setValue("contactType", value as "email" | "phone" | "both")
              }
              className="flex flex-wrap gap-3 sm:gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email" />
                <Label
                  htmlFor="email"
                  className="font-normal text-sm sm:text-base"
                >
                  Email
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="phone" id="phone" />
                <Label
                  htmlFor="phone"
                  className="font-normal text-sm sm:text-base"
                >
                  Phone
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label
                  htmlFor="both"
                  className="font-normal text-sm sm:text-base"
                >
                  Both
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Contact Inputs */}
          {(contactType === "email" || contactType === "both") && (
            <div className="space-y-2">
              <Label htmlFor="emailInput">Your Email</Label>
              <Input
                id="emailInput"
                type="email"
                placeholder="your@email.com"
                {...register("email")}
              />
            </div>
          )}

          {(contactType === "phone" || contactType === "both") && (
            <div className="space-y-2">
              <Label htmlFor="phoneInput">Your Phone Number</Label>
              <Input
                id="phoneInput"
                type="tel"
                placeholder="03XXXXXXXXX"
                {...register("phone")}
              />
              <p className="text-xs text-muted-foreground">
                Enter your phone number for contacting you (if needed or for refunds).
              </p>
            </div>
          )}

          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label>Payment Receipt Screenshot</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
            </div>
            {receiptFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {receiptFile.name}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
