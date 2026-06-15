import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Banknote,
  Plus,
  Star,
  Trash2,
  Pencil,
  Smartphone,
  Building2,
  Loader2,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApprovedBank, BankCredWithBank } from "@/lib/payment-types";
import { MAX_METHODS, isMobileWallet } from "@/lib/payment-utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const formSchema = z.object({
  approved_bank_id: z.string({ required_error: "Select a bank" }),
  account_holder_name: z.string().min(2, "Min 2 characters"),
  account_number_or_iban: z.string().min(4, "Min 4 characters"),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  teacherId: string;
}

export function TeacherPaymentSettings({ teacherId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<BankCredWithBank | null>(null);

  const addForm = useForm<FormData>({ resolver: zodResolver(formSchema) });
  const editForm = useForm<FormData>({ resolver: zodResolver(formSchema) });

  /* ── Queries ──────────────────────────────────── */

  const { data: methods = [], isLoading } = useQuery({
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
    enabled: !!teacherId,
  });

  const { data: approvedBanks = [] } = useQuery({
    queryKey: ["approved_banks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approved_banks")
        .select("*")
        .order("bank_name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as ApprovedBank[];
    },
    staleTime: 1000 * 60 * 30,
  });

  /* ── Mutations ────────────────────────────────── */

  const addMutation = useMutation({
    mutationFn: async (v: FormData) => {
      const { error } = await supabase.from("bank_creds").insert({
        teacher_id: teacherId,
        approved_bank_id: v.approved_bank_id,
        account_holder_name: v.account_holder_name,
        account_number_or_iban: v.account_number_or_iban,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_creds", teacherId] });
      setAddOpen(false);
      addForm.reset();
      toast({ title: "Payment method added", description: "Payment method has been added successfully." });
    },
    onError: (err: any) =>
      toast({ title: "Failed to add", description: err.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async ({ bankId, ...v }: FormData & { bankId: string }) => {
      const { error } = await supabase
        .from("bank_creds")
        .update({
          approved_bank_id: v.approved_bank_id,
          account_holder_name: v.account_holder_name,
          account_number_or_iban: v.account_number_or_iban,
        })
        .eq("bank_id", bankId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_creds", teacherId] });
      setEditing(null);
      editForm.reset();
      toast({ title: "Payment method updated" });
    },
    onError: (err: any) =>
      toast({ title: "Failed to update", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bank_creds").delete().eq("bank_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_creds", teacherId] });
      toast({ title: "Method removed", description: "Payment method has been removed successfully." });
    },
    onError: (err: any) =>
      toast({ title: "Failed to remove", description: err.message, variant: "destructive" }),
  });

  const togglePreferred = useMutation({
    mutationFn: async (targetId: string) => {
      const current = methods.find((m) => m.is_preferred);

      if (current && current.bank_id === targetId) {
        const { error } = await supabase
          .from("bank_creds")
          .update({ is_preferred: false })
          .eq("bank_id", targetId);
        if (error) throw error;
        return;
      }

      const ops: Promise<any>[] = [];
      if (current) {
        ops.push(
          supabase.from("bank_creds").update({ is_preferred: false }).eq("bank_id", current.bank_id)
        );
      }
      ops.push(
        supabase.from("bank_creds").update({ is_preferred: true }).eq("bank_id", targetId)
      );

      const results = await Promise.all(ops);
      for (const r of results) {
        if (r.error) throw r.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_creds", teacherId] });
    },
    onError: (err: any) =>
      toast({ title: "Failed to update", description: err.message, variant: "destructive" }),
  });

  /* ── Handlers ─────────────────────────────────── */

  const openEdit = (m: BankCredWithBank) => {
    setEditing(m);
    editForm.reset({
      approved_bank_id: m.approved_bank_id,
      account_holder_name: m.account_holder_name,
      account_number_or_iban: m.account_number_or_iban,
    });
  };

  const closeEdit = () => {
    setEditing(null);
    editForm.reset();
  };

  const atLimit = methods.length >= MAX_METHODS;

  /* ── Render ───────────────────────────────────── */

  return (
    <>
      <Card className="mt-3">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>
              Manage bank accounts and wallets for receiving payments ({methods.length}/{MAX_METHODS})
            </CardDescription>
          </div>
          <Button
            variant={atLimit ? "destructive" : "outline"}
            size="sm"
            className={cn("gap-1", atLimit && "cursor-not-allowed")}
            onClick={() => {
              if (!atLimit) {
                setAddOpen(true);
              } else {
                toast({
                  title: "Limit Reached",
                  description: "You can only add 5 payment methods. Remove one to add a new one.",
                  variant: "destructive",
                });
              }
            }}
          >
            {atLimit ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {atLimit ? "Limit Reached" : "Add Payment Method"}
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center rounded-lg border border-dashed py-6 text-center">
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            </div>
          ) : methods.length === 0 ? (
            <div className="flex flex-col justify-center items-center rounded-lg border border-dashed py-6 text-center">
              <Banknote className="mb-1 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No payment methods yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {methods.map((m) => {
                const name = m.approved_bank?.bank_name ?? "Unknown";
                const wallet = isMobileWallet(name);
                return (
                  <div
                    key={m.bank_id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                      m.is_preferred && "border-primary/30 bg-primary/5"
                    )}
                  >
                    {wallet ? (
                      <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{name}</span>
                        {m.is_preferred && (
                          <Badge variant="default" className="h-5 gap-0.5 px-1.5 text-[10px]">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            Preferred
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.account_holder_name} &middot; {m.account_number_or_iban}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
                        title="Edit"
                        onClick={() => openEdit(m)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        variant={m.is_preferred ? "default" : "outline"}
                        size="sm"
                        className="h-7 shrink-0 gap-1 px-2 text-xs"
                        onClick={() => togglePreferred.mutate(m.bank_id)}
                        disabled={togglePreferred.isPending}
                      >
                        <Star className={cn("h-3 w-3", m.is_preferred && "fill-current")} />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>

                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete this payment method.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={deleteMutation.isPending}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              disabled={deleteMutation.isPending}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => {
                                deleteMutation.mutate(m.bank_id);
                              }}
                            >
                              {deleteMutation.isPending ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-1">
            {atLimit && (
              <p className="text-xs text-muted-foreground">
                Maximum {MAX_METHODS} methods reached. Remove one first.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Add Dialog ──────────────────────────────── */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) addForm.reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Add a bank account or mobile wallet to receive student payments.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={addForm.handleSubmit((v) => addMutation.mutate(v))}
            className="space-y-4"
          >
            <FormFields form={addForm} banks={approvedBanks} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Method
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ─────────────────────────────── */}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payment Method</DialogTitle>
            <DialogDescription>
              Update the bank account or mobile wallet details.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={editForm.handleSubmit((v) =>
              editing && editMutation.mutate({ ...v, bankId: editing.bank_id })
            )}
            className="space-y-4"
          >
            <FormFields form={editForm} banks={approvedBanks} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeEdit}>
                Cancel
              </Button>
              <Button type="submit" disabled={editMutation.isPending}>
                {editMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Reusable Form Fields ─────────────────────────── */

function FormFields({
  form,
  banks,
}: {
  form: ReturnType<typeof useForm<FormData>>;
  banks: ApprovedBank[];
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Bank / Wallet</Label>
        <Select
          value={form.watch("approved_bank_id")}
          onValueChange={(v) =>
            form.setValue("approved_bank_id", v, { shouldValidate: true })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            {banks.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                <span className="flex items-center gap-2">
                  {isMobileWallet(b.bank_name) ? (
                    <Smartphone className="h-3.5 w-3.5" />
                  ) : (
                    <Building2 className="h-3.5 w-3.5" />
                  )}
                  {b.bank_name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.approved_bank_id && (
          <p className="text-xs text-destructive">{form.formState.errors.approved_bank_id.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Account Holder Name</Label>
        <Input placeholder="Full name on account" {...form.register("account_holder_name")} />
        {form.formState.errors.account_holder_name && (
          <p className="text-xs text-destructive">{form.formState.errors.account_holder_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Account Number / IBAN</Label>
        <Input placeholder="Enter account number or IBAN" {...form.register("account_number_or_iban")} />
        {form.formState.errors.account_number_or_iban && (
          <p className="text-xs text-destructive">{form.formState.errors.account_number_or_iban.message}</p>
        )}
      </div>
    </>
  );
}
