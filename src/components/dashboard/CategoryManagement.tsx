import { useEffect, useState } from "react";
import {
  FolderOpen,
  Trash2,
  Edit2,
  Plus,
  Check,
  X,
  Loader2,
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCategories, useSubcategories } from "@/hooks/useNotes";
import {
  useCreateCategory,
  useCreateSubcategory,
} from "@/hooks/useNoteMutations";

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
      toast({ title: "Category updated" });
      setEditingCategory(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update",
        description: error.message,
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
      toast({ title: "Subcategory updated" });
      setEditingSubcategory(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Category deleted" });
      if (selectedCategory === deleteTarget?.id) setSelectedCategory(null);
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      const isInUse =
        error.message?.includes("policy") || error.code === "42501";
      toast({
        title: "Failed to delete",
        description: isInUse
          ? "You can only delete categories you created that have no subcategories"
          : error.message,
        variant: "destructive",
      });
      setDeleteTarget(null);
    },
  });

  const deleteSubcategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subcategories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["subcategories", selectedCategory],
      });
      toast({ title: "Subcategory deleted" });
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      const isInUse =
        error.message?.includes("policy") || error.code === "42501";
      toast({
        title: "Failed to delete",
        description: isInUse
          ? "You can only delete subcategories you created that have no notes"
          : error.message,
        variant: "destructive",
      });
      setDeleteTarget(null);
    },
  });

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory.mutateAsync({ name: newCategoryName.trim() });
      setNewCategoryName("");
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleAddSubcategory = async () => {
    if (!newSubcategoryName.trim() || !selectedCategory) return;
    try {
      await createSubcategory.mutateAsync({
        name: newSubcategoryName.trim(),
        category_id: selectedCategory,
      });
      setNewSubcategoryName("");
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "category") {
      deleteCategory.mutate(deleteTarget.id);
    } else {
      deleteSubcategory.mutate(deleteTarget.id);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Category Management
          </CardTitle>
          <CardDescription>
            Manage categories and subcategories for organizing your notes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Categories Column */}
            <div className="space-y-4">
              <h3 className="font-medium">Categories</h3>

              {/* Add Category */}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter new category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                />
                <Button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim() || createCategory.isPending}
                  size="icon"
                >
                  {createCategory.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin inline-block" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Categories List */}
              {categoriesLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : categories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No categories yet
                </p>
              ) : (
                <div className="space-y-2">
                  {categories.map((category, index) => (
                    <div
                      key={category.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedCategory === category.id
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => {
                        if (editingCategory !== category.id) {
                          setSelectedCategory(category.id);
                        }
                      }}
                    >
                      <span className="flex-0 text-sm mx-2">{index + 1}. </span>
                      {editingCategory === category.id ? (
                        <>
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-8"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCategory.mutate({
                                id: category.id,
                                name: editValue,
                              });
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCategory(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm">
                            {category.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={`${
                              userId === category.created_by
                                ? "text-green-500 border-green-500"
                                : "text-yellow-500 border-yellow-500"
                            }`}
                          >
                            {userId === category.created_by
                              ? "Yours"
                              : "Shared"}
                          </Badge>
                          {userId === category.created_by && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCategory(category.id);
                                  setEditValue(category.name);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({
                                    type: "category",
                                    id: category.id,
                                    name: category.name,
                                  });
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subcategories Column */}
            <div className="space-y-4">
              <h3 className="font-medium">
                Subcategories
                {selectedCategory && (
                  <Badge variant="outline" className="ml-2">
                    {categories.find((c) => c.id === selectedCategory)?.name}
                  </Badge>
                )}
              </h3>

              {selectedCategory ? (
                <>
                  {/* Add Subcategory */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter new subcategory name"
                      value={newSubcategoryName}
                      onChange={(e) => setNewSubcategoryName(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleAddSubcategory()
                      }
                    />
                    <Button
                      onClick={handleAddSubcategory}
                      disabled={
                        !newSubcategoryName.trim() ||
                        createSubcategory.isPending
                      }
                      size="icon"
                    >
                      {createSubcategory.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin inline-block" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Subcategories List */}
                  {subcategoriesLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : subcategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      No subcategories yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {subcategories.map((sub, index) => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-2 p-2 rounded-lg border"
                        >
                          <span className="flex-0 text-sm mx-2">
                            {index + 1}.{" "}
                          </span>
                          {editingSubcategory === sub.id ? (
                            <>
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-8"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() =>
                                  updateSubcategory.mutate({
                                    id: sub.id,
                                    name: editValue,
                                  })
                                }
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => setEditingSubcategory(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-sm">{sub.name}</span>
                              <Badge
                                variant="outline"
                                className={`${
                                  userId === sub.created_by
                                    ? "text-green-500 border-green-500"
                                    : "text-yellow-500 border-yellow-500"
                                }`}
                              >
                                {userId === sub.created_by ? "Yours" : "Shared"}
                              </Badge>
                              {userId === sub.created_by && (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSubcategory(sub.id);
                                      setEditValue(sub.name);
                                    }}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteTarget({
                                        type: "subcategory",
                                        id: sub.id,
                                        name: sub.name,
                                      });
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-4">
                  Select a category to manage its subcategories
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This
              action cannot be undone.
              {deleteTarget?.type === "category" &&
                " All subcategories under this category will also be deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
