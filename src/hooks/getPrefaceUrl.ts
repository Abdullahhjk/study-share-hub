import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePrefaceUrl() {
  return useQuery({
    queryKey: ["preface-url"],
    queryFn: () => {
      // getPublicUrl is synchronous and does not return an error object
      const { data } = supabase.storage
        .from("documents")
        .getPublicUrl("Preface.docx");

      if (!data?.publicUrl) {
        throw new Error("Failed to generate public URL");
      }

      return data.publicUrl;
    },
  });
}
