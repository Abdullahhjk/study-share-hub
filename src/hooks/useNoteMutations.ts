import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ActivityLogger } from "@/hooks/useActivityLogger";

interface CreateNoteData {
  title: string;
  description?: string;
  file_url: string;
  preview_image_url?: string;
  is_free: boolean;
  price?: number;
  subcategory_id: string;
  school_name?: string;
}

interface CreateCategoryData {
  name: string;
}

interface CreateSubcategoryData {
  name: string;
  category_id: string;
}

type SchoolNameResult = {
  school_name: string | null;
};

export function useSchoolName() {
  return useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("school_name")
        .eq("id", session.session.user.id)
        .single<SchoolNameResult>();

      if (error) throw error;

      return data.school_name;
    },
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNoteData) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Not authenticated");

      const { data: note, error } = await supabase
        .from("notes")
        .insert({
          ...data,
          teacher_id: session.session.user.id,
          price: data.is_free ? 0 : data.price || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return note;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      ActivityLogger.uploadNote(variables.title);
      toast.success("Note uploaded successfully!");
    },
    onError: (error) => {
      console.error("Error creating notes:", error);
      toast.error("Failed to upload notes");
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCategoryData) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Not authenticated");

      const { data: category, error } = await supabase
        .from("categories")
        .insert({
          ...data,
          created_by: session.session.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return category;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      ActivityLogger.createCategory(variables.name);
      toast.success("Category created!");
    },
    onError: (error) => {
      console.error("Error creating category:", error);
      toast.error("Failed to create category");
    },
  });
}

export function useCreateSubcategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSubcategoryData) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Not authenticated");

      const { data: subcategory, error } = await supabase
        .from("subcategories")
        .insert({
          ...data,
          created_by: session.session.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return subcategory;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      ActivityLogger.createSubcategory(variables.name);
      toast.success("Subcategory created!");
    },
    onError: (error) => {
      console.error("Error creating subcategory:", error);
      toast.error("Failed to create subcategory");
    },
  });
}

export function useUploadFile() {
  return useMutation({
    mutationFn: async ({
      file,
      bucket,
      path,
    }: {
      file: File;
      bucket: string;
      path: string;
    }) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    },
    onError: (error) => {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    },
  });
}

export function useTeacherNotes(teacherId: string | undefined) {
  const queryClient = useQueryClient();

  return {
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-notes", teacherId] });
    },
  };
}
