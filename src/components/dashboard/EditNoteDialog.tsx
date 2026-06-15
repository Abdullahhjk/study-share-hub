import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import { X, FileText, Image, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { Note } from "@/lib/types";

const currencyPrecision: Record<string, number> = {
  USD: 2,
  PKR: 2,
  CAD: 2,
  JPY: 0,
  CNY: 2,
  EUR: 2,
  GBP: 2,
  SAR: 2,
};

const editNoteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  is_free: z.boolean(),
  price: z.coerce.number().min(0).optional(),
});

type EditNoteFormData = z.infer<typeof editNoteSchema>;

interface EditNoteDialogProps {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
}

export function EditNoteDialog({
  note,
  open,
  onOpenChange,
  teacherId,
}: EditNoteDialogProps) {
  const { currency, convertPrice, convertToPKR } = useCurrency();

  const queryClient = useQueryClient();

  const [newNoteFile, setNewNoteFile] = useState<File | null>(null);

  const [newPreviewFile, setNewPreviewFile] = useState<File | null>(null);

  const [removePreview, setRemovePreview] = useState(false);

  const [isUploading, setIsUploading] = useState(false);

  const precision = currencyPrecision[currency] ?? 2;

  const step =
    precision === 0
      ? "1"
      : `0.${"0".repeat(precision - 1)}1`;

  const form = useForm<EditNoteFormData>({
    resolver: zodResolver(editNoteSchema),

    defaultValues: {
      title: "",
      description: "",
      is_free: false,
      price: 0,
    },
  });

  useEffect(() => {
    if (note) {
      form.reset({
        title: note.title,
        description: note.description || "",
        is_free: note.is_free,
        price: convertPrice(note.price || 0),
      });

      setNewNoteFile(null);
      setNewPreviewFile(null);
      setRemovePreview(false);
    }
  }, [note, form, convertPrice]);

  const extractStoragePath = (url: string): string | null => {
    try {
      const urlObj = new URL(url);

      const pathParts = urlObj.pathname.split(
        "/storage/v1/object/public/"
      );

      if (pathParts.length > 1) {
        const [, ...rest] = pathParts[1].split("/");

        return rest.join("/");
      }

      return null;
    } catch {
      return null;
    }
  };

  const deleteOldFile = async (
    url: string,
    bucket: string
  ) => {
    const path = extractStoragePath(url);

    if (path) {
      await supabase.storage.from(bucket).remove([path]);
    }
  };

  const uploadFile = async (
    file: File,
    bucket: string,
    folder: string
  ): Promise<string> => {
    const fileExt = file.name.split(".").pop();

    const fileName = `${teacherId}/${folder}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const updateNote = useMutation({
    mutationFn: async (data: EditNoteFormData) => {
      if (!note) {
        throw new Error("No note selected");
      }

      setIsUploading(true);

      let newFileUrl = note.file_url;

      let newPreviewUrl: string | null =
        note.preview_image_url;

      try {
        if (newNoteFile) {
          await deleteOldFile(note.file_url, "notes");

          newFileUrl = await uploadFile(
            newNoteFile,
            "notes",
            "files"
          );
        }

        if (removePreview && note.preview_image_url) {
          await deleteOldFile(
            note.preview_image_url,
            "notes"
          );

          newPreviewUrl = null;
        } else if (newPreviewFile) {
          if (note.preview_image_url) {
            await deleteOldFile(
              note.preview_image_url,
              "notes"
            );
          }

          newPreviewUrl = await uploadFile(
            newPreviewFile,
            "notes",
            "previews"
          );
        }

        const { error } = await supabase
          .from("notes")
          .update({
            title: data.title,
            description: data.description || null,
            is_free: data.is_free,
            price: data.is_free
              ? 0
              : convertToPKR(data.price ?? 0),
            file_url: newFileUrl,
            preview_image_url: newPreviewUrl,
          })
          .eq("id", note.id);

        if (error) {
          throw error;
        }
      } finally {
        setIsUploading(false);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-notes", teacherId],
      });

      queryClient.invalidateQueries({
        queryKey: ["notes"],
      });

      toast.success("Note updated successfully");

      onOpenChange(false);
    },

    onError: (error) => {
      console.error("Error updating note:", error);

      toast.error("Failed to update note");
    },
  });

  const isFree = form.watch("is_free");

  const onSubmit = (data: EditNoteFormData) => {
    updateNote.mutate(data);
  };

  const hasExistingPreview =
    note?.preview_image_url && !removePreview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>

                  <FormControl>
                    <Input
                      placeholder="Note title"
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>

                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the note"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Replace Note File</FormLabel>

              {newNoteFile ? (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <FileText className="h-4 w-4 text-primary" />

                  <span className="text-sm flex-1 truncate">
                    {newNoteFile.name}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setNewNoteFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    className="cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];

                      if (file) {
                        setNewNoteFile(file);
                      }
                    }}
                  />

                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to keep current file
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <FormLabel>Preview Image</FormLabel>

              {hasExistingPreview && !newPreviewFile && (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <Image className="h-4 w-4 text-primary" />

                  <span className="text-sm flex-1 truncate">
                    Current preview image
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => setRemovePreview(true)}
                    title="Remove preview image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {removePreview && !newPreviewFile && (
                <div className="flex items-center gap-2 p-2 border border-destructive/50 rounded-md bg-destructive/10">
                  <Trash2 className="h-4 w-4 text-destructive" />

                  <span className="text-sm flex-1 text-destructive">
                    Preview will be removed
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemovePreview(false)}
                  >
                    Undo
                  </Button>
                </div>
              )}

              {newPreviewFile && (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <Image className="h-4 w-4 text-primary" />

                  <span className="text-sm flex-1 truncate">
                    {newPreviewFile.name}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setNewPreviewFile(null);
                      setRemovePreview(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {!newPreviewFile && (
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    className="cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];

                      if (file) {
                        setNewPreviewFile(file);
                        setRemovePreview(false);
                      }
                    }}
                  />

                  <p className="text-xs text-muted-foreground mt-1">
                    {removePreview
                      ? "Upload a new preview or leave empty to remove"
                      : "Leave empty to keep current preview"}
                  </p>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="is_free"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-base">
                      Free Note
                    </FormLabel>

                    <p className="text-sm text-muted-foreground">
                      Make this note available for free
                    </p>
                  </div>

                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {!isFree && (
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Price ({currency})
                    </FormLabel>

                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={step}
                        placeholder="Enter price"
                        value={field.value.toFixed(precision) ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;

                          if (value === "") {
                            field.onChange("");
                            return;
                          }

                          const parsed =
                            precision === 0
                              ? parseInt(value, 10)
                              : parseFloat(value);

                          field.onChange(parsed);
                        }}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                className="flex-1"
                disabled={
                  updateNote.isPending || isUploading
                }
              >
                {updateNote.isPending || isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />

                    {isUploading
                      ? "Uploading..."
                      : "Saving..."}
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}