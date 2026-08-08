// supabase/functions/send-emails/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { trackFn } from "../_shared/telemetry.ts";

const ACTIVEPIECES_WEBHOOK_URL = Deno.env.get(
  "ACTIVEPIECES_WEBHOOK_URL",
);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY",
);

if (!ACTIVEPIECES_WEBHOOK_URL) {
  throw new Error("Missing ACTIVEPIECES_WEBHOOK_URL secret");
}

const allowedOrigins = [
  "https://scholar-share.netlify.app",
  "http://localhost:8080",
];

function getCorsHeaders(origin: string | null) {
  const isAllowed = origin && allowedOrigins.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed
      ? origin
      : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":
      "POST, OPTIONS",
  };
}

async function getEmailTemplate(
  type: string,
  link: string,
  email: string,
): Promise<{ html: string }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for template generation",
    );
  }

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/email-template`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ type, link, email }),
    },
  );

  if (!response.ok) {
    const err = await response.text().catch(() => "Unknown error");
    throw new Error(
      `email-template returned ${response.status}: ${err}`,
    );
  }

  const data = await response.json();

  if (!data?.html) {
    throw new Error("email-template returned no html");
  }

  return { html: data.html };
}

function getSubjectForType(type: string): string {
  switch (type) {
    case "confirm":
      return "Verify your Scholar Share account";
    case "reset":
      return "Reset your Scholar Share password";
    case "magic":
      return "Your Scholar Share magic login link";
    default:
      return "Scholar Share";
  }
}

serve(trackFn("send-emails", async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return Response.json(
        {
          success: false,
          error: "Method not allowed",
        },
        {
          status: 405,
          headers: corsHeaders,
        },
      );
    }

    const body = await req.json();

    let html: string;
    let subject: string;
    let emails: string[];

    if (body.html && body.subject && Array.isArray(body.emails)) {
      html = body.html;
      subject = body.subject;
      emails = body.emails;
    } else if (body.type && body.link && body.email) {
      const template = await getEmailTemplate(
        body.type,
        body.link,
        body.email,
      );

      html = template.html;
      subject = getSubjectForType(body.type);
      emails = [body.email];
    } else {
      return Response.json(
        {
          success: false,
          error:
            "Invalid payload. Use { html, subject, emails[] } (newsletter) or { type, link, email } (auth).",
        },
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    if (
      !html ||
      !subject ||
      !Array.isArray(emails) ||
      emails.length === 0
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Invalid payload. Required: html, subject, emails[]",
        },
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    const response = await fetch(ACTIVEPIECES_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        html,
        subject,
        emails,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return Response.json(
        {
          success: false,
          status: response.status,
          error:
            data || "Failed to invoke ActivePieces webhook",
        },
        {
          status: response.status,
          headers: corsHeaders,
        },
      );
    }

    return Response.json(
      {
        success: true,
        data,
      },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
}));