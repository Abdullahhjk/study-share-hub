import { createClient } from "npm:@supabase/supabase-js@2";
import { trackFn } from "../_shared/telemetry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(trackFn("image-preview-proxy", async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    let bucket: string | null = null;
    let path: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);

      bucket = url.searchParams.get("bucket");
      path = url.searchParams.get("path");
    }

    if (req.method === "POST") {
      const body = await req.json();

      bucket = body?.bucket ?? null;
      path = body?.path ?? null;
    }

    if (!bucket || !path) {
      return new Response(
        JSON.stringify({
          error: "bucket and path are required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(path);

    if (error || !data) {
      return new Response(
        JSON.stringify({
          error: error?.message ?? "File not found",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const contentType =
      data.type || "application/octet-stream";

    if (!contentType.startsWith("image/")) {
      return new Response(
        JSON.stringify({
          error: "File is not an image",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(data.stream(), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
}));