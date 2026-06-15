import { ReactNode, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, Plus, ImageIcon, FileText, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/hooks/useCurrency";
import { useCategories, useSubcategories } from "@/hooks/useNotes";
import {
  useCreateNote,
  useCreateCategory,
  useCreateSubcategory,
  useUploadFile,
  useSchoolName,
} from "@/hooks/useNoteMutations";
import { supabase } from "@/integrations/supabase/client";
import { usePrefaceUrl } from "@/hooks/getPrefaceUrl";
import { useToast } from "@/hooks/use-toast";

const noteSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(1000).optional(),
    is_free: z.boolean().default(true),
    price: z.number().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.is_free && (data.price === undefined || data.price === null || data.price <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Price is required if the note is not free",
      });
    }
  });

type NoteFormData = z.infer<typeof noteSchema>;

type Toast = {
  title?: ReactNode;
  description?: ReactNode;
  variant?: "default" | "destructive";
};

export function UploadNoteForm() {
  const { currency, convertToPKR } = useCurrency();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showSubcategoryDialog, setShowSubcategoryDialog] = useState(false);

  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();
  const { data: subcategories = [], isLoading: subcategoriesLoading } =
    useSubcategories(selectedCategory);

  const createNote = useCreateNote();
  const { toast } = useToast();
  const createCategory = useCreateCategory();
  const createSubcategory = useCreateSubcategory();
  const uploadFile = useUploadFile();
  const schoolName = useSchoolName();
  const [valueSchoolName, setValueSchoolName] = useState("");
  const url = usePrefaceUrl();


  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      is_free: false,
      price: undefined,
    },
  });

  useEffect(() => {
    schoolName.mutate(undefined, {
      onSuccess: (value) => {
        if (value) {
          setValueSchoolName(value);
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasSchoolName = Boolean(valueSchoolName?.trim());

  const isFree = watch("is_free");

  // Reset price when switching to free
  useEffect(() => {
    if (isFree) {
      setValue("price", undefined);
    }
  }, [isFree, setValue]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const category = await createCategory.mutateAsync({
        name: newCategoryName.trim(),
      });
      setSelectedCategory(category.id);
      setNewCategoryName("");
      setShowCategoryDialog(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleCreateSubcategory = async () => {
    if (!newSubcategoryName.trim() || !selectedCategory) return;
    try {
      const subcategory = await createSubcategory.mutateAsync({
        name: newSubcategoryName.trim(),
        category_id: selectedCategory,
      });
      setSelectedSubcategory(subcategory.id);
      setNewSubcategoryName("");
      setShowSubcategoryDialog(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const onSubmit = async (data: NoteFormData) => {
    if (!noteFile) {
      return;
    }
    if (!selectedSubcategory) {
      return;
    }

    setIsUploading(true);
    try {
      // Upload note file
      const userId = (await supabase.auth.getUser()).data.user.id;
      const timestamp = Date.now();
      const noteFileName = `${userId}_${timestamp}-${noteFile.name}`;
      const noteUrl = await uploadFile.mutateAsync({
        file: noteFile,
        bucket: "notes",
        path: noteFileName,
      });

      // Upload preview image if provided
      let previewUrl: string | undefined;
      if (previewFile) {
        const previewFileName = `previews/${userId}_${timestamp}-${previewFile.name}`;
        previewUrl = await uploadFile.mutateAsync({
          file: previewFile,
          bucket: "notes",
          path: previewFileName,
        });
      }

      // Create note
      await createNote.mutateAsync({
        title: data.title,
        description: data.description || undefined,
        file_url: noteUrl,
        preview_image_url: previewUrl,
        is_free: data.is_free,
        price: data.is_free ? 0 : convertToPKR(data.price || 0),
        subcategory_id: selectedSubcategory,
        school_name: valueSchoolName || undefined,
      });

      // Reset form
      reset();
      setSelectedCategory("");
      setSelectedSubcategory("");
      setNoteFile(null);
      setPreviewFile(null);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const NOTES_RULES: string[] = [
    "All notes must be in PDF format only.",
    "All notes must include a watermark with your name.",
    "Each note must have a title page that contains the notes name, class, grade, subject, teacher name, teacher contact, and a brief description. Download the template from above.",
    "Do not modify, remove, or sell any content of these documents.",
    "Ensure all content is accurate, original, free from offensive material, and complies with copyright laws.",
    "Preview images must be clear, relevant, and represent the content properly.",
    "Use proper naming conventions for easy search, categorization, and identification.",
    "Upload only educational, original, and non-copyrighted material.",
    "Add your name and site reference in either the header or footer of the notes.",
    "Add page numbering.",
    "Styling and formatting are encouraged but must remain legal and non-infringing.",
    "Ensure any paid notes clearly display the price and indicate if free access is allowed.",
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload New Notes
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="ml-4">
                Rules
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden flex flex-col">

              {/* HEADER */}
              <div className="px-6 py-4 border-b bg-muted/30">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">
                    Notes Upload Rules
                  </DialogTitle>
                </DialogHeader>
              </div>

              {/* DOWNLOAD SECTION */}
              <div className="px-6 py-3 border-b flex items-center justify-between bg-background">
                <p className="text-sm text-muted-foreground">
                  Download the official template for reference before uploading.
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDownloading || url.isLoading}
                  onClick={async () => {
                    if (!url.data) {
                      toast({
                        title: "Error",
                        description: "File not available",
                        variant: "destructive",
                      });
                      return;
                    }

                    try {
                      setIsDownloading(true);

                      toast({
                        title: "Preparing download...",
                        description: "Please wait",
                      });

                      await new Promise((res) => setTimeout(res, 500));

                      const link = document.createElement("a");
                      link.href = url.data;
                      link.download = "Preface.docx";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);

                      toast({
                        title: "Download started",
                        description: "Check your downloads",
                      });

                    } catch (err) {
                      toast({
                        title: "Download failed",
                        description: "Something went wrong",
                        variant: "destructive",
                      });
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                >
                  {isDownloading || url.isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />
                      Downloading...
                    </>
                  ) : (
                    "Download MS Word File"
                  )}
                </Button>
              </div>

              {/* CONTENT (SCROLL AREA) */}
              <div className="flex-1 overflow-y-auto px-6 py-1">
                <ul className="space-y-2 text-sm text-muted-foreground list-disc list-outside pl-5 leading-relaxed">
                  {NOTES_RULES.map((rule, index) => (
                    <li key={index} className="text-foreground/80">
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>

              {/* FOOTER */}
              <div className="px-6 py-3 border-t bg-muted/20 text-center text-xs text-muted-foreground">
                For safety of your notes, we recommend following all rules above.
              </div>

            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 mb-3">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter notes title"
                  {...register("title")}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              {/* Category Selection */}
              <div className="space-y-2">
                <Label>Category *</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedCategory}
                    onValueChange={(value) => {
                      setSelectedCategory(value);
                      setSelectedSubcategory("");
                    }}
                    disabled={categoriesLoading}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length > 0 ? (
                        categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground p-1">
                          No categories
                        </p>
                      )}
                    </SelectContent>
                  </Select>

                  <Dialog
                    open={showCategoryDialog}
                    onOpenChange={setShowCategoryDialog}
                  >
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Category</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <Input
                          placeholder="Category name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                        <Button
                          onClick={handleCreateCategory}
                          disabled={
                            !newCategoryName.trim() || createCategory.isPending
                          }
                          className="w-full"
                        >
                          {createCategory.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />
                          ) : null}
                          Create Category
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Subcategory Selection */}
              <div className="space-y-2">
                <Label>Subcategory *</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedSubcategory}
                    onValueChange={setSelectedSubcategory}
                    disabled={!selectedCategory || subcategoriesLoading}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue
                        placeholder={
                          selectedCategory
                            ? "Select a subcategory"
                            : "Select a category first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.length > 0 ? (
                        subcategories.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name}
                          </SelectItem>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground p-1">
                          No subcategories
                        </p>
                      )}
                    </SelectContent>
                  </Select>

                  <Dialog
                    open={showSubcategoryDialog}
                    onOpenChange={setShowSubcategoryDialog}
                  >
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={!selectedCategory}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Subcategory</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <Input
                          placeholder="Subcategory name"
                          value={newSubcategoryName}
                          onChange={(e) => setNewSubcategoryName(e.target.value)}
                        />
                        <Button
                          onClick={handleCreateSubcategory}
                          disabled={
                            !newSubcategoryName.trim() ||
                            createSubcategory.isPending
                          }
                          className="w-full"
                        >
                          {createSubcategory.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />
                          ) : null}
                          Create Subcategory
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* School Name Display */}
              {hasSchoolName && (
                <div className="space-y-2">
                  <Label>School Name</Label>
                  <p className="text-sm text-muted-foreground p-2 border rounded-md bg-muted">
                    {valueSchoolName}
                  </p>
                </div>
              )}

              {/* Pricing */}
              <div className="space-y-3">

                <Label>Pricing</Label>

                <div className="flex items-center justify-between border rounded-md px-3 py-2">

                  <span className="text-sm font-medium">
                    {isFree ? "Free" : "Paid"}
                  </span>

                  <Switch
                    checked={isFree}
                    onCheckedChange={(checked) => setValue("is_free", checked)}
                  />

                </div>

                <Input
                  type="number"
                  placeholder={`Price (${currency})`}
                  disabled={isFree}
                  {...register("price", { valueAsNumber: true })}
                />

              </div>
            </div>
            <div className="w-px bg-border" />
            {/* Right Column */}
            <div className="space-y-4">
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  className="resize-none"
                  id="description"
                  placeholder="Enter notes description"
                  rows={4}
                  {...register("description")}

                />
                {errors.description && (
                  <p className="text-sm text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Note File Upload */}
              <div className="space-y-2">
                <Label>Note File (PDF/Image) *</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${noteFile
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                    }`}
                  onClick={() => document.getElementById("note-file")?.click()}
                >
                  <Input
                    id="note-file"
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => setNoteFile(e.target.files?.[0] || null)}
                  />
                  {noteFile ? (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <FileText className="h-6 w-6" />
                      <span className="font-medium">{noteFile.name}</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="h-8 w-8 mx-auto mb-2" />
                      <p>Click to upload PDF or image</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Image Upload */}
              <div className="space-y-2">
                <Label>Preview Image (for paid notes)</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${previewFile
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                    }`}
                  onClick={() => document.getElementById("preview-file")?.click()}
                >
                  <input
                    id="preview-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setPreviewFile(e.target.files?.[0] || null)}
                  />
                  {previewFile ? (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <ImageIcon className="h-6 w-6" />
                      <span className="font-medium">{previewFile.name}</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                      <p>Click to upload preview image <span className="text-sm">(optional)</span></p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Full Width Bottom Section */}
          <div className="col-span-2 space-y-4">
            {/* Submit Button */}
            {!hasSchoolName && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Please set your school name in the <strong>Profile</strong> tab
                before uploading notes.
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={
                isUploading || !noteFile || !selectedSubcategory || !hasSchoolName
              }
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Notes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}