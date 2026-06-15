import { useState } from "react";
import { Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";

interface RefundScreenshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  amount: number;
  onSuccess: () => void;
}

export function RefundScreenshotDialog({
  open,
  onOpenChange,
  requestId,
  amount,
  onSuccess,
}: RefundScreenshotDialogProps) {
  const { formatPrice } = useCurrency();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please upload a screenshot of the refund payment");
      return;
    }

    setUploading(true);

    try {
      // Upload screenshot
      const userId = (await supabase.auth.getUser()).data.user.id;
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}_refund-${requestId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("receipts").getPublicUrl(fileName);

      // Update request with refund screenshot and mark as refunded
      const { error: updateError } = await supabase
        .from("note_requests")
        .update({
          status: "refunded",
          refund_screenshot_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      toast.success("Refund marked complete with proof!");
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Error uploading refund screenshot:", error);
      toast.error(error.message || "Failed to upload screenshot");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Refund Proof
          </DialogTitle>
          <DialogDescription>
            Upload a screenshot of the Bank Account payment showing{" "}
            {formatPrice(amount)} refunded to the student.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border-2 border-dashed p-4 text-center">
            {preview ? (
              <div className="space-y-2">
                <img
                  src={preview}
                  alt="Refund screenshot preview"
                  className="mx-auto max-h-48 rounded-lg object-contain"
                />
                <p className="text-sm text-muted-foreground">{file?.name}</p>
              </div>
            ) : (
              <div className="py-4">
                <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Upload refund payment screenshot
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-screenshot">Payment Screenshot</Label>
            <Input
              id="refund-screenshot"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading || !file}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />
                Uploading...
              </>
            ) : (
              "Confirm Refund"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
