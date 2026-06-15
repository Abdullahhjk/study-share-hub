import { supabase } from "@/integrations/supabase/client";

const functionsBaseUrl = (supabase.functions as unknown as { url: string }).url;

export function proxyImageUrl(url: string | null): string | null {
  if (!url) return null;

  // Parse bucket & path from Supabase Storage URLs like:
  // https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  // https://<project>.supabase.co/storage/v1/object/<bucket>/<path>
  const match = url.match(/\/storage\/v1\/object\/(?:public\/|sign\/)?([^/]+)\/(.+)/);
  if (!match) return null;

  const bucket = match[1];
  const path = match[2].split("?")[0];
  return `${functionsBaseUrl}/image-preview-proxy?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`;
}
