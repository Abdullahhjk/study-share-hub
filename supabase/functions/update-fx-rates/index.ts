// supabase/functions/update-fx-rates/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackFn } from "../_shared/telemetry.ts";

const API_KEY = "u2bDtKc89JOPkHSKFinEnVN38toUfpyr";

Deno.serve(trackFn("update-fx-rates", async () => {
  try {
    const response = await fetch(
      "https://api.apilayer.com/currency_data/live?source=PKR&currencies=USD,PKR,CAD,JPY,CNY,EUR,GBP,SAR",
      {
        method: "GET",
        headers: {
          apikey: API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Currency API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.success || !data.quotes) {
      throw new Error("Invalid response from currency API");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: updatedRow, error } = await supabase
      .from("fx_rates")
      .update({
        rates: data.quotes,
        fetched_at: new Date().toISOString(),
      })
      .eq("base_currency", "PKR")
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        saved: updatedRow,
        api_response: data,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}));
