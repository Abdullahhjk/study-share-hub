import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackFn } from "../_shared/telemetry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const COHERE_API_KEY = Deno.env.get("COHERE_API_KEY");

Deno.serve(trackFn("ai-build-report-email", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const { version, changelog } = await req.json();

    if (!version || !changelog) {
      return new Response(
        JSON.stringify({
          error: "Version and changelog are required",
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

    if (!COHERE_API_KEY) {
      throw new Error("Missing COHERE_API_KEY secret");
    }

    const prompt = `
You are a SaaS newsletter writer.

Return ONLY valid JSON:

{
  "subject": string,
  "html": string
}

Task:
- Improve subject line
- Write email as HTML newsletter
- Keep professional tone


HTML EXAMPLE: """
<div style=3D"max-width:600px;margin:0 auto;padding:20px;font-family:Arial,=
sans-serif;background-color:#f9f9f9;border-radius:10px">
  <header style=3D"text-align:center;padding:20px 0">
    <h1 style=3D"color:#333;font-size:28px;margin:0">Scholar Share</h1>
    <span style=3D"display:inline-block;background-color:#007bff;color:whit=
e;padding:5px 10px;border-radius:20px;font-size:14px;margin-top:10px">v1.00=
.7.8</span>
  </header>

  <section style=3D"padding:20px;background-color:white;border-radius:8px;m=
argin:20px 0">
    <p style=3D"color:#555;font-size:16px;line-height:1.6">Hi there! We=E2=
=80=99re thrilled to share the latest updates in Scholar Share v1.00.7.8. Th=
is release brings exciting new features and improvements to enhance your ex=
perience. Here=E2=80=99s what=E2=80=99s new:</p>
  </section>

  <section style=3D"padding:20px;background-color:white;border-radius:8px;m=
argin:20px 0">
    <h2 style=3D"color:#333;font-size:20px;margin-bottom:15px">What=E2=80=
=99s New in This Release</h2>
    <div style=3D"margin-bottom:20px">
      <h3 style=3D"color:#007bff;font-size:18px;margin-bottom:10px">Enhance=
d Currency Support</h3>
      <ul style=3D"color:#555;font-size:16px;line-height:1.6;padding-left:2=
0px">
        <li>Added support for <strong>8 new currencies</strong> with a hand=
y dropdown in the header.</li>
        <li>Auto-detect your currency based on your location (with a confir=
mation dialog for peace of mind).</li>
        <li>Seamless database sync for a smoother experience.</li>
      </ul>
    </div>
    <div style=3D"margin-bottom:20px">
      <h3 style=3D"color:#007bff;font-size:18px;margin-bottom:10px">Improve=
d Admin Feedback Page</h3>
      <ul style=3D"color:#555;font-size:16px;line-height:1.6;padding-left:2=
0px">
        <li>Fixed the archived column bug for better organization.</li>
        <li>Added status-based filtering (new/reviewed/archived) and search=
 functionality.</li>
        <li>Integrated the FeedbackTab into the AdminDashboard for easier a=
ccess.</li>
      </ul>
    </div>
    <div style=3D"margin-bottom:20px">
      <h3 style=3D"color:#007bff;font-size:18px;margin-bottom:10px">Updated=
 Settings Dialog</h3>
      <ul style=3D"color:#555;font-size:16px;line-height:1.6;padding-left:2=
0px">
        <li>Settings are now grouped into card-based sections with icons fo=
r easier navigation.</li>
        <li>Added currency dropdown and auto-detect toggles for personalize=
d preferences.</li>
      </ul>
    </div>
    <div>
      <h3 style=3D"color:#007bff;font-size:18px;margin-bottom:10px">General=
 Improvements</h3>
      <ul style=3D"color:#555;font-size:16px;line-height:1.6;padding-left:2=
0px">
        <li>Introduced a <strong>CurrencyProvider</strong> for reactive pri=
cing updates.</li>
        <li>Generated 47 new database types for better data handling.</li>
        <li>Made minor responsive improvements across the app for a smoothe=
r experience.</li>
      </ul>
    </div>
  </section>

  <section style=3D"padding:20px;background-color:white;border-radius:8px;m=
argin:20px 0;text-align:center">
    <p style=3D"color:#555;font-size:16px;line-height:1.6">We hope you enjo=
y these updates as much as we do! Your feedback helps us keep improving Scho=
lar Share.</p>
    <p style=3D"color:#555;font-size:16px;line-height:1.6;margin-top:20px">=
=E2=80=94 Scholar Share team</p>
  </section>

  <footer style=3D"text-align:center;padding:20px 0;font-size:14px;color:#8=
88">
    <p>If you no longer wish to receive these emails, you can <a href=3D"ht=
 tps://scholar-share.netlify.app/unsubscribe" style=3D"color:#007bff;text-dec=
oration:none">unsubscribe here</a>.</p>
  </footer>
</div>
"""

Version: ${version}
Changelog: ${changelog}
`;

    const cohereResponse = await fetch(
      "https://api.cohere.com/v2/chat",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${COHERE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "command-a-03-2025",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!cohereResponse.ok) {
      const errorText = await cohereResponse.text();

      throw new Error(
        `Cohere API Error (${cohereResponse.status}): ${errorText}`
      );
    }

    const aiData = await cohereResponse.json();

    console.log(
      "Cohere response:",
      JSON.stringify(aiData, null, 2)
    );

    const aiText =
      aiData?.message?.content?.[0]?.text ||
      aiData?.text ||
      "";

    if (!aiText) {
      throw new Error("No text returned from Cohere");
    }

    let result;

    try {
      result = JSON.parse(aiText.replace("```json", "").replace("```", ""));
    } catch {
      throw new Error(
        `AI did not return valid JSON.\n\n${aiText}`
      );
    }

    if (!result.subject || !result.html) {
      throw new Error(
        "AI response missing subject or html field"
      );
    }

    return new Response(
      JSON.stringify({
        subject: result.subject,
        html: result.html,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : String(error),
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