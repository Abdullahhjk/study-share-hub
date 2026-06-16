import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Note, Category, Subcategory } from "@/lib/types";

export async function fetchNotesQuery(): Promise<Note[]> {
	const start = Date.now();

	const timeoutPromise = new Promise((_, reject) => {
		setTimeout(() => reject(new Error("Request timeout")), 10000);
	});

	const notesPromise = supabase
		.from("notes")
		.select(`
		*,
		teacher:profiles(*),
		subcategory:subcategories(
			*,
			category:categories(*)
		)
	`)
		.order("created_at", { ascending: false });

	const result = await Promise.race([notesPromise, timeoutPromise]);

	const { data, error } = result as Awaited<typeof notesPromise>;

	if (error) throw error;

	const elapsed = Date.now() - start;
	const minDelay = 5720;

	if (elapsed < minDelay) {
		await new Promise((r) => setTimeout(r, minDelay - elapsed));
	}

	return data as unknown as Note[];
}

export function useNotes() {
	return useQuery({
		queryKey: ["notes"],
		retry: 1,
		queryFn: fetchNotesQuery,
	});
}

export function useCategories() {
	return useQuery({
		queryKey: ["categories"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("categories")
				.select("*, subcategories(count)")
				.order("name");

			if (error) throw error;
			return data as (Category & { subcategories: { count: number }[] })[];
		},
	});
}

export function useSubcategories(categoryId?: string) {
	return useQuery({
		queryKey: ["subcategories", categoryId],
		queryFn: async () => {
			let query = supabase
				.from("subcategories")
				.select("*, category:categories(*), notes(count)")
				.order("name");

			if (categoryId) {
				query = query.eq("category_id", categoryId);
			}

			const { data, error } = await query;
			if (error) throw error;
			return data as (Subcategory & { category: Category; notes: { count: number }[] })[];
		},
	});
}

export function useTeachers() {
	return useQuery({
		queryKey: ["teachers"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("profiles")
				.select("id, full_name, avatar_url, notes!inner()")
				.order("full_name");

			if (error) throw error;
			return data as { id: string; full_name: string; avatar_url: string }[];
		},
	});
}

export function useSchools() {
	return useQuery({
		queryKey: ["schools"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("notes")
				.select("school_name")
				.not("school_name", "is", null);

			if (error) throw error;

			const uniqueSchools = [
				...new Set(data.map((d) => d.school_name).filter(Boolean)),
			] as string[];
			return uniqueSchools.sort();
		},
	});
}

export function useNotesBySubcategory(subcategoryId: string) {
	return useQuery({
		queryKey: ["notes", "subcategory", subcategoryId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("notes")
				.select(
					`
          *,
          teacher:profiles(*),
          subcategory:subcategories(
            *,
            category:categories(*)
          )
        `,
				)
				.eq("subcategory_id", subcategoryId)
				.order("created_at", { ascending: false });

			if (error) throw error;
			return data as Note[];
		},
		enabled: !!subcategoryId,
	});
}
