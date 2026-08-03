import { useEffect, useState } from "react";
import {
  FolderOpen,
  Trash2,
  Edit2,
  Plus,
  Check,
  X,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCategories, useSubcategories } from "@/hooks/useNotes";
import {
  useCreateCategory,
  useCreateSubcategory,
} from "@/hooks/useNoteMutations";
import { cn } from "@/lib/utils";

const CATEGORY_RULES = [
  "This is a shared community space — keep categories clear and meaningful.",
  "Avoid creating duplicate categories. Check if one already exists.",
  "Category names should be concise and descriptive.",
  "You can only delete categories you created that have no subcategories.",
  "You can only delete subcategories you created that have no notes linked to them.",
];

function AddItemForm({ value, onChange, onAdd, placeholder, disabled = false, isPending, tooltip }) {
  const isBtnDisabled = disabled || !value.trim() || isPending;

  const button = (
    <Button onClick={onAdd} disabled={isBtnDisabled} size="icon">
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <div className="flex gap-2">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        onKeyDown={(e) => e.key === "Enter" && !isBtnDisabled && onAdd()}
      />
      {tooltip && disabled ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{button}</span>
          </TooltipTrigger>
          <TooltipContent side="top">{tooltip}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
    </div>
  );
}

function OwnerBadge({ userId, createdBy }) {
  const isOwn = userId === createdBy;
  return (
    <Badge
      variant="outline"
      className={isOwn ? "text-green-500 border-green-500" : "text-yellow-500 border-yellow-500"}
    >
      {isOwn ? "Yours" : "Shared"}
    </Badge>
  );
}

function EditActions({ value, onChange, onSave, onCancel }) {
  return (
    <>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8"
      />
      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={onSave}>
        <Check className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={onCancel}>
        <X className="h-4 w-4" />
      </Button>
    </>
  );
}

function ListState({ isLoading, isEmpty, emptyMessage, children }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isEmpty) {
    return <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>;
  }
  return <div className="space-y-2">{children}</div>;
}

function CategoryItem({ category, index, selectedCategory, editingCategory, editValue, userId, onSelect, onEdit, onEditSave, onEditCancel, onEditChange, onDelete }) {
  const isOwn = userId === category.created_by;
  const isSelected = selectedCategory === category.id;
  const isEditing = editingCategory === category.id;
  const subCount = (category as any).subcategories?.[0]?.count ?? 0;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${isSelected
        ? "border-primary bg-primary/10 ring-1 ring-primary"
        : "hover:border-primary/50 hover:bg-muted/30"
        }`}
      onClick={() => {
        if (!isEditing) onSelect(category.id);
      }}
    >
      <span className="shrink-0 text-sm mx-2 text-muted-foreground">{index + 1}.</span>
      {isEditing ? (
        <EditActions
          value={editValue}
          onChange={onEditChange}
          onSave={() => onEditSave(category.id)}
          onCancel={onEditCancel}
        />
      ) : (
        <>
          <span className="flex-1 min-w-[8rem] text-sm font-medium break-words">{category.name}</span>
          <Badge variant="secondary" className="text-xs font-normal whitespace-nowrap">
            {subCount} {subCount === 1 ? "sub" : "subs"}
          </Badge>
          <OwnerBadge userId={userId} createdBy={category.created_by} />
          {isOwn && (
            <>
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); onEdit(category.id, category.name); }}>
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete("category", category.id, category.name); }}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}

function SubcategoryItem({ sub, index, editingSubcategory, editValue, userId, onEdit, onEditSave, onEditCancel, onEditChange, onDelete }) {
  const isOwn = userId === sub.created_by;
  const isEditing = editingSubcategory === sub.id;
  const noteCount = (sub as any).notes?.[0]?.count ?? 0;

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg border hover:bg-muted/30 transition-colors">
      <span className="shrink-0 text-sm mx-2 text-muted-foreground">{index + 1}.</span>
      {isEditing ? (
        <EditActions
          value={editValue}
          onChange={onEditChange}
          onSave={() => onEditSave(sub.id)}
          onCancel={onEditCancel}
        />
      ) : (
        <>
          <span className="flex-1 min-w-[8rem] text-sm break-words">{sub.name}</span>
          <Badge variant="secondary" className="text-xs font-normal whitespace-nowrap">
            {noteCount} {noteCount === 1 ? "note" : "notes"}
          </Badge>
          <OwnerBadge userId={userId} createdBy={sub.created_by} />
          {isOwn && (
            <>
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => onEdit(sub.id, sub.name)}>
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => onDelete("subcategory", sub.id, sub.name)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}

function DeleteConfirmDialog({ deleteTarget, onClose, onConfirm, isPending }) {
  return (
    <AlertDialog open={!!deleteTarget} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this {deleteTarget?.type}?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive/80 text-destructive-foreground hover:bg-destructive"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />
                Checking...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RulesDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          Rules
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b bg-muted/30">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Category & Subcategory Rules
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <ul className="space-y-3 text-sm text-muted-foreground list-disc list-outside pl-5 leading-relaxed">
            {CATEGORY_RULES.map((rule, index) => (
              <li key={index} className="text-foreground/80">
                {rule}
              </li>
            ))}
          </ul>
        </div>
        <div className="px-6 py-3 border-t bg-muted/20 text-center text-xs text-muted-foreground">
          Keep the space organized for everyone.
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getErrorMessage(error, fallback) {
  if (!error) return fallback;
  if (error.code === "23505") return "This name already exists. Please use a different name.";
  if (error.code === "42501") return "You don't have permission to perform this action.";
  if (error.message?.includes("fetch")) return "A network error occurred. Please check your connection and try again.";
  return error.message || fallback;
}

export function CategoryManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<string | null>(
    null,
  );
  const [editValue, setEditValue] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "category" | "subcategory";
    id: string;
    name: string;
  } | null>(null);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);

  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();
  const { data: subcategories = [], isLoading: subcategoriesLoading } =
    useSubcategories(selectedCategory || "");

  const createCategory = useCreateCategory();
  const createSubcategory = useCreateSubcategory();

  const getUserId = async () => {
    const { data } = await supabase.auth.getUser();
    setUserId(data?.user.id || null);
  };

  useEffect(() => {
    getUserId();
  }, []);

  const selectedCategoryName = selectedCategory
    ? categories.find((c) => c.id === selectedCategory)?.name
    : null;

  const updateCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("categories")
        .update({ name, created_by: userId })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Category renamed" });
      setEditingCategory(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to rename",
        description: getErrorMessage(error, "An unexpected error occurred."),
        variant: "destructive",
      });
    },
  });

  const updateSubcategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("subcategories")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["subcategories", selectedCategory],
      });
      toast({ title: "Subcategory renamed" });
      setEditingSubcategory(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to rename",
        description: getErrorMessage(error, "An unexpected error occurred."),
        variant: "destructive",
      });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error, count } = await supabase
        .from("categories")
        .delete({ count: "exact" })
        .eq("id", id);
      if (error) throw error;
      if (count === 0) throw new Error("NOT_FOUND_OR_BLOCKED");
      setSelectedCategory(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Category deleted" });
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      const message = error.message === "NOT_FOUND_OR_BLOCKED"
        ? "Category wasn't deleted. It may contain subcategories or you may not have permission."
        : getErrorMessage(error, "Category wasn't deleted. It may contain subcategories.");
      toast({ title: "Failed to delete", description: message, variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  const deleteSubcategory = useMutation({
    mutationFn: async (id: string) => {
      const { error, count } = await supabase
        .from("subcategories")
        .delete({ count: "exact" })
        .eq("id", id);
      if (error) throw error;
      if (count === 0) throw new Error("NOT_FOUND_OR_BLOCKED");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["subcategories", selectedCategory],
      });
      toast({ title: "Subcategory deleted" });
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      const message = error.message === "NOT_FOUND_OR_BLOCKED"
        ? "Subcategory wasn't deleted. It is being used in notes or you may not have permission."
        : getErrorMessage(error, "Subcategory wasn't deleted. It may be in use.");
      toast({ title: "Failed to delete", description: message, variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  const isDuplicateCategory = (name, excludeId) => {
    const trimmed = name.trim().toLowerCase();
    return categories.some(
      (c) => c.name.toLowerCase() === trimmed && c.id !== excludeId
    );
  };

  const isDuplicateSubcategory = (name, excludeId) => {
    const trimmed = name.trim().toLowerCase();
    return subcategories.some(
      (s) => s.name.toLowerCase() === trimmed && s.id !== excludeId
    );
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;

    if (isDuplicateCategory(name, null)) {
      toast({
        title: "Category already exists",
        description: `A category named "${name}" already exists.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await createCategory.mutateAsync({ name });
      setNewCategoryName("");
      toast({ title: "Category created", description: `"${name}" has been added.` });
    } catch (error) {
      toast({
        title: "Failed to create category",
        description: getErrorMessage(error, "An unexpected error occurred."),
        variant: "destructive",
      });
    }
  };

  const handleAddSubcategory = async () => {
    if (!selectedCategory) {
      toast({
        title: "No category selected",
        description: "Please select a category first before adding a subcategory.",
        variant: "destructive",
      });
      return;
    }

    const name = newSubcategoryName.trim();
    if (!name) return;

    if (isDuplicateSubcategory(name, null)) {
      toast({
        title: "Subcategory already exists",
        description: `A subcategory named "${name}" already exists under this category.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await createSubcategory.mutateAsync({
        name,
        category_id: selectedCategory,
      });
      setNewSubcategoryName("");
      toast({ title: "Subcategory created", description: `"${name}" has been added.` });
    } catch (error) {
      toast({
        title: "Failed to create subcategory",
        description: getErrorMessage(error, "An unexpected error occurred."),
        variant: "destructive",
      });
    }
  };

  const handleSaveCategoryEdit = (id) => {
    const name = editValue.trim();
    if (!name) return;
    if (isDuplicateCategory(name, id)) {
      toast({
        title: "Name already taken",
        description: `A category named "${name}" already exists.`,
        variant: "destructive",
      });
      return;
    }
    updateCategory.mutate({ id, name });
  };

  const handleSaveSubcategoryEdit = (id) => {
    const name = editValue.trim();
    if (!name) return;
    if (isDuplicateSubcategory(name, id)) {
      toast({
        title: "Name already taken",
        description: `A subcategory named "${name}" already exists under this category.`,
        variant: "destructive",
      });
      return;
    }
    updateSubcategory.mutate({ id, name });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsCheckingDelete(true);

    try {
      if (deleteTarget.type === "category") {
        const { count } = await supabase
          .from("subcategories")
          .select("id", { count: "exact", head: true })
          .eq("category_id", deleteTarget.id);

        if (count && count > 0) {
          toast({
            title: "Category wasn't deleted",
            description: `"${deleteTarget.name}" contains ${count} subcategor${count === 1 ? "y" : "ies"}. Remove ${count === 1 ? "it" : "them"} first.`,
            variant: "destructive",
          });
          setDeleteTarget(null);
          setIsCheckingDelete(false);
          return;
        }

        deleteCategory.mutate(deleteTarget.id);
      } else {
        const { count } = await supabase
          .from("notes")
          .select("id", { count: "exact", head: true })
          .eq("subcategory_id", deleteTarget.id);

        if (count && count > 0) {
          toast({
            title: "Subcategory wasn't deleted",
            description: `"${deleteTarget.name}" is being used in ${count} note${count === 1 ? "" : "s"}. Remove ${count === 1 ? "it" : "them"} first.`,
            variant: "destructive",
          });
          setDeleteTarget(null);
          setIsCheckingDelete(false);
          return;
        }

        deleteSubcategory.mutate(deleteTarget.id);
      }
    } catch (error) {
      toast({
        title: "Failed to check",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setDeleteTarget(null);
    } finally {
      setIsCheckingDelete(false);
    }
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Category Management
            <RulesDialog />
          </CardTitle>
          <CardDescription>
            Manage categories and subcategories for organizing your notes
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {/* Categories Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Categories</h3>
            <AddItemForm
              tooltip="Press Enter to add"
              value={newCategoryName}
              onChange={setNewCategoryName}
              onAdd={handleAddCategory}
              placeholder="Enter new category name"
              isPending={createCategory.isPending}
            />
            <ListState
              isLoading={categoriesLoading}
              isEmpty={categories.length === 0}
              emptyMessage="No categories yet. Create one to get started."
            >
              {categories.map((category, index) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  index={index}
                  selectedCategory={selectedCategory}
                  editingCategory={editingCategory}
                  editValue={editValue}
                  userId={userId}
                  onSelect={(id) =>
                    setSelectedCategory((prev) => (prev === id ? null : id))
                  }
                  onEdit={(id, name) => {
                    setEditingCategory(id);
                    setEditValue(name);
                  }}
                  onEditSave={handleSaveCategoryEdit}
                  onEditCancel={() => setEditingCategory(null)}
                  onEditChange={setEditValue}
                  onDelete={(type, id, name) =>
                    setDeleteTarget({ type, id, name })
                  }
                />
              ))}
            </ListState>
          </div>

          {/* Subcategories Section - only visible when a category is selected */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              selectedCategory
                ? "max-h-[1600px] opacity-100 space-y-4 border-t pt-4"
                : "max-h-0 opacity-0 border-0"
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-semibold text-lg flex flex-wrap items-center gap-2">
                Subcategories
                <Badge variant="secondary" className="text-sm font-normal">
                  {selectedCategoryName}
                </Badge>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="w-fit gap-1 text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to categories
              </Button>
            </div>
            <AddItemForm
              value={newSubcategoryName}
              onChange={setNewSubcategoryName}
              onAdd={handleAddSubcategory}
              placeholder="Enter new subcategory name"
              disabled={!selectedCategory}
              isPending={createSubcategory.isPending}
              tooltip="Press Enter to add"
            />
            <ListState
              isLoading={subcategoriesLoading}
              isEmpty={subcategories.length === 0}
              emptyMessage="No subcategories under this category yet."
            >
              {subcategories.map((sub, index) => (
                <SubcategoryItem
                  key={sub.id}
                  sub={sub}
                  index={index}
                  editingSubcategory={editingSubcategory}
                  editValue={editValue}
                  userId={userId}
                  onEdit={(id, name) => {
                    setEditingSubcategory(id);
                    setEditValue(name);
                  }}
                  onEditSave={handleSaveSubcategoryEdit}
                  onEditCancel={() => setEditingSubcategory(null)}
                  onEditChange={setEditValue}
                  onDelete={(type, id, name) =>
                    setDeleteTarget({ type, id, name })
                  }
                />
              ))}
            </ListState>
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        deleteTarget={deleteTarget}
        onClose={() => !isCheckingDelete && setDeleteTarget(null)}
        onConfirm={handleDelete}
        isPending={isCheckingDelete}
      />
    </TooltipProvider>
  );
}
