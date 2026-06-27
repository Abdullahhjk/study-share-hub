// supabase/functions/email-template/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type EmailType = "confirm" | "reset" | "magic" | "newsletter";

interface AuthEmailRequest {
  type: "confirm" | "reset" | "magic";
  link: string;
  email: string;
}

interface NewsletterRequest {
  type: "newsletter";
  content: string;
  subject?: string;
}

type EmailRequest = AuthEmailRequest | NewsletterRequest;

const ALLOWED_ORIGINS = [
  "https://scholar-share.netlify.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
});

const APP_NAME = "Scholar Share";
const APP_URL = "https://scholar-share.netlify.app";

const TEMPLATE_CONFIG = {
  confirm: {
    title: "Verify Your Account",
    heading: "Confirm your email address",
    description:
      "Click the button below to verify your account and start using Scholar Share.",
    button: "Verify Account",
    color: "#4CAF50",
  },

  reset: {
    title: "Reset Your Password",
    heading: "Password reset request",
    description:
      "Click the button below to reset your password securely.",
    button: "Reset Password",
    color: "#FF9800",
  },

  magic: {
    title: "Your Magic Login Link",
    heading: "Sign in instantly",
    description:
      "Click the button below to securely sign in to your Scholar Share account.",
    button: "Login with Magic Link",
    color: "#2196F3",
  },
} as const;

const NEWSLETTER_CONFIG = {
  title: "Scholar Share Newsletter",
  color: "#4CAF50",
} as const;

function generateNewsletterHTML(
  content: string,
  subject?: string,
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${subject || NEWSLETTER_CONFIG.title}</title>
</head>
<body style="
  margin:0;
  padding:0;
  background:#f4f4f4;
  font-family:Arial,Helvetica,sans-serif;
">

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="padding:40px 16px;"
>
<tr>
<td align="center">

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    max-width:600px;
    background:#ffffff;
    border-radius:16px;
    overflow:hidden;
    box-shadow:0 4px 20px rgba(0,0,0,0.08);
  "
>

<tr>
<td
  style="
    background:${NEWSLETTER_CONFIG.color};
    padding:32px 24px;
    text-align:center;
  "
>

<img
  src="https://scholar-share.netlify.app/preview.png"
  alt="Scholar Share"
  width="72"
  height="72"
  style="
    display:block;
    margin:0 auto 16px auto;
    border-radius:16px;
    background:#ffffff;
  "
/>

<h1
  style="
    margin:0;
    color:#ffffff;
    font-size:28px;
    font-weight:700;
  "
>
  ${APP_NAME}
</h1>

</td>
</tr>

<tr>
<td
  style="
    padding:40px 32px;
    color:#333333;
  "
>
  ${content}
</td>
</tr>

<tr>
<td
  style="
    padding:32px;
    background:#fafafa;
    border-top:1px solid #eeeeee;
  "
>

<p
  style="
    margin:0 0 20px 0;
    font-size:13px;
    line-height:1.7;
    color:#666666;
    text-align:center;
  "
>
  You received this email because you subscribed to Scholar Share updates.
  <br/>
  <a
    href="${APP_URL}/unsubscribe"
    style="
      color:${NEWSLETTER_CONFIG.color};
      text-decoration:none;
      font-weight:600;
    "
  >
    Unsubscribe
  </a>
</p>

<p
  style="
    margin:0 0 20px 0;
    font-size:13px;
    color:#666666;
    text-align:center;
  "
>
  Built by Abdullah Waqas •
  <a
    href="mailto:abdwaq67@gmail.com"
    style="
      color:${NEWSLETTER_CONFIG.color};
      text-decoration:none;
      font-weight:600;
    "
  >
    Support
  </a>
</p>

<p
  style="
    margin:0;
    font-size:13px;
    text-align:center;
  "
>

<a
  href="${APP_URL}"
  style="
    color:${NEWSLETTER_CONFIG.color};
    text-decoration:none;
    margin:0 8px;
  "
>
  Go to App
</a>

|

<a
  href="${APP_URL}/terms"
  style="
    color:${NEWSLETTER_CONFIG.color};
    text-decoration:none;
    margin:0 8px;
  "
>
  Terms
</a>

|

<a
  href="${APP_URL}/privacy"
  style="
    color:${NEWSLETTER_CONFIG.color};
    text-decoration:none;
    margin:0 8px;
  "
>
  Privacy
</a>

</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>`;
}

function generateEmailHTML({
  type,
  link,
  email,
}: AuthEmailRequest): string {
  const config = TEMPLATE_CONFIG[type];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${config.title}</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f4f4f4;
  font-family:Arial,Helvetica,sans-serif;
">

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="padding:40px 16px;"
>
<tr>
<td align="center">

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    max-width:600px;
    background:#ffffff;
    border-radius:16px;
    overflow:hidden;
    box-shadow:0 4px 20px rgba(0,0,0,0.08);
  "
>

<tr>
<td
  style="
    background:${config.color};
    padding:32px 24px;
    text-align:center;
  "
>

<img
  src="https://scholar-share.netlify.app/preview.png"
  alt="Scholar Share"
  width="72"
  height="72"
  style="
    display:block;
    margin:0 auto 16px auto;
    border-radius:16px;
    background:#ffffff;
  "
/>

<h1
  style="
    margin:0;
    color:#ffffff;
    font-size:28px;
    font-weight:700;
  "
>
  ${APP_NAME}
</h1>

</td>
</tr>

<tr>
<td
  style="
    padding:40px 32px;
    color:#333333;
  "
>

<p
  style="
    margin:0 0 16px 0;
    font-size:16px;
    line-height:1.6;
  "
>
  ${email}
</p>

<h2
  style="
    margin:0 0 16px 0;
    font-size:24px;
    color:#111111;
  "
>
  ${config.heading}
</h2>

<p
  style="
    margin:0 0 32px 0;
    font-size:16px;
    line-height:1.7;
    color:#555555;
  "
>
  ${config.description}
</p>

<table
  cellpadding="0"
  cellspacing="0"
  border="0"
  align="center"
  style="margin:32px auto;"
>
<tr>
<td align="center">

<a
  href="${link}"
  target="_blank"
  style="
    background:${config.color};
    color:#ffffff;
    text-decoration:none;
    padding:16px 32px;
    border-radius:10px;
    font-size:16px;
    font-weight:700;
    display:inline-block;
  "
>
  ${config.button}
</a>

</td>
</tr>
</table>

<p
  style="
    margin:0;
    font-size:14px;
    line-height:1.7;
    color:#777777;
  "
>
  If the button above does not work, copy and paste this link into your browser:
</p>

<p
  style="
    margin:12px 0 0 0;
    font-size:14px;
    line-height:1.7;
    color:${config.color};
    word-break:break-all;
  "
>
  ${link}
</p>

</td>
</tr>

<tr>
<td
  style="
    padding:32px;
    background:#fafafa;
    border-top:1px solid #eeeeee;
  "
>

<p
  style="
    margin:0 0 20px 0;
    font-size:13px;
    line-height:1.7;
    color:#666666;
    text-align:center;
  "
>
  If you did not request this email, please ignore and do not send anyone this link.
</p>

<p
  style="
    margin:0 0 20px 0;
    font-size:13px;
    color:#666666;
    text-align:center;
  "
>
  Built by Abdullah Waqas •
  <a
    href="mailto:abdwaq67@gmail.com"
    style="
      color:${config.color};
      text-decoration:none;
      font-weight:600;
    "
  >
    Support
  </a>
</p>

<p
  style="
    margin:0;
    font-size:13px;
    text-align:center;
  "
>

<a
  href="${APP_URL}"
  style="
    color:${config.color};
    text-decoration:none;
    margin:0 8px;
  "
>
  Go to App
</a>

|

<a
  href="${APP_URL}/terms"
  style="
    color:${config.color};
    text-decoration:none;
    margin:0 8px;
  "
>
  Terms
</a>

|

<a
  href="${APP_URL}/privacy"
  style="
    color:${config.color};
    text-decoration:none;
    margin:0 8px;
  "
>
  Privacy
</a>

</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
}

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    if (req.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405, headers },
      );
    }

    const body: EmailRequest = await req.json();

    if (body.type === "newsletter") {
      if (!body.content) {
        return Response.json(
          { error: "Missing required field: content" },
          { status: 400, headers },
        );
      }

      const html = generateNewsletterHTML(body.content, body.subject);

      return Response.json(
        { success: true, html },
        { headers },
      );
    }

    if (!body.link || !body.email) {
      return Response.json(
        { error: "Missing required fields: type, link, email" },
        { status: 400, headers },
      );
    }

    if (!(body.type in TEMPLATE_CONFIG)) {
      return Response.json(
        { error: "Invalid email type" },
        { status: 400, headers },
      );
    }

    const html = generateEmailHTML(body);

    return Response.json(
      { success: true, html },
      { headers },
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
      { status: 500, headers },
    );
  }
});