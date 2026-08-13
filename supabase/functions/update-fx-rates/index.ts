// supabase/functions/update-fx-rates/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackFn } from "../_shared/telemetry.ts";

const API_URL =
  "https://api.apilayer.com/currency_data/live?source=PKR&currencies=USD,PKR,CAD,JPY,CNY,EUR,GBP,SAR";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

Deno.serve(
  trackFn("update-fx-rates", async (req) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    try {
      // ------------------------------------------------------------
      // 1. Read ALL API tracking rows.
      // Service role bypasses RLS.
      // ------------------------------------------------------------
      const { data: apiRows, error: apiRowsError } = await supabase
        .from("apilayer_api_track")
        .select('id, "API", count')
        .order("created_at", { ascending: true });

      if (apiRowsError) {
        throw new Error(
          `Failed to read API tracking table: ${apiRowsError.message}`
        );
      }

      if (!apiRows || apiRows.length === 0) {
        throw new Error(
          "No API keys are configured in apilayer_api_track."
        );
      }

      // ------------------------------------------------------------
      // 2. Select the API key.
      //
      // Prefer a key that has already been used (count > 0).
      // If both counts are 0, use the first available key.
      //
      // Never use a key whose count has reached 100.
      // ------------------------------------------------------------
      const availableRows = apiRows.filter((row) => {
        const count = Number(row.count ?? 0);
        return count < 100 && row.API;
      });

      if (availableRows.length === 0) {
        throw new Error(
          "All API keys have reached the maximum count of 100."
        );
      }

      const usedRows = availableRows.filter(
        (row) => Number(row.count ?? 0) > 0
      );

      const selectedRow =
        usedRows.length > 0 ? usedRows[0] : availableRows[0];

      const currentCount = Number(selectedRow.count ?? 0);
      const newCount = currentCount + 1;

      // ------------------------------------------------------------
      // 3. Increment the selected key's usage BEFORE calling API.
      // ------------------------------------------------------------
      const { error: incrementError } = await supabase
        .from("apilayer_api_track")
        .update({
          count: newCount,
        })
        .eq("id", selectedRow.id);

      if (incrementError) {
        throw new Error(
          `Failed to increment API usage: ${incrementError.message}`
        );
      }

      // ------------------------------------------------------------
      // 4. Read the API key.
      //
      // The "API" column holds the actual apilayer key.
      // ------------------------------------------------------------
      const apiKey = selectedRow.API?.trim();

      if (!apiKey) {
        throw new Error("Selected API row has an empty API identifier.");
      }

      // ------------------------------------------------------------
      // 5. Fetch FX rates using the selected API key.
      // ------------------------------------------------------------
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          apikey: apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Currency API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.success || !data.quotes) {
        throw new Error("Invalid response from currency API");
      }

      // ------------------------------------------------------------
      // 6. Update fx_rates exactly as before.
      // ------------------------------------------------------------
      const { data: updatedRow, error: fxError } = await supabase
        .from("fx_rates")
        .update({
          rates: data.quotes,
          fetched_at: new Date().toISOString(),
        })
        .eq("base_currency", "PKR")
        .select()
        .single();

      if (fxError) {
        throw fxError;
      }

      // ------------------------------------------------------------
      // 7. Return success.
      // ------------------------------------------------------------
      return json({
        success: true,
        api: apiKey,
        api_count: newCount,
        saved: updatedRow,
        api_response: data,
      });
    } catch (error) {
      return json(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  })
);