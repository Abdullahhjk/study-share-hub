import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PlatformSettingsRow = Database["public"]["Tables"]["platform_settings"]["Row"];

export function usePlatformSettings(userId?: string) {
  return useQuery({
    queryKey: ["platform-settings", userId],
    queryFn: async (): Promise<PlatformSettingsRow | null> => {
      if (!userId) return null;
      const { data: role, error: roleErr } = await supabase
        .from("user_roles")
        .select("settings_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (roleErr) throw roleErr;
      if (!role?.settings_id) return null;

      const { data: ps, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("id", role.settings_id)
        .maybeSingle();
      if (error) throw error;
      return ps ?? null;
    },
    enabled: !!userId,
  });
}

export function commissionAsFraction(commissionPercent: number): number {
  return commissionPercent / 100;
}

export const DEFAULT_COMMISSION_PERCENT = 12.0;
