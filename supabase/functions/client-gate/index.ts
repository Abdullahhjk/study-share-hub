import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, message, template, subReason } = await req.json();

    const COHERE_API_KEY = "AsM83I063fkfyqh4W6elRS0FxP71E7VdwxUlfZR6";
    if (!COHERE_API_KEY) throw new Error("Missing COHERE_API_KEY");

    const userPrompt = `
You are generating a high-quality admin notification for a SaaS platform.

Context:
- Template Type: ${template || "Custom"}
- Sub-reason: ${subReason || "n/a"}

Input Draft:
- Title: ${title || "(empty)"}
- Message: ${message || "(empty)"}

Requirements:
- Rewrite and improve both the title and message.
- Maintain the original intent and meaning.
- Use clear, concise, professional language.
- Make the notification sound trustworthy and polished.
- Remove awkward phrasing, repetition, grammar mistakes, and filler.
- Keep the tone platform-appropriate and user-friendly.
- Make the title short, strong, and attention-grabbing.
- Make the message structured, readable, and engaging.
- Preserve important numbers, discounts, dates, rewards, or platform terms.
- Do not use excessive hype, emojis, markdown, or marketing spam language.
- Do not invent false information.
- Return ONLY valid JSON.

Output Format:
{
  "title": "Improved notification title",
  "message": "Improved notification message"
}
`;

    const resp = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COHERE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "command-a-03-2025",
        messages: [
          {
            role: "system",
            content:
              'Return ONLY JSON: {"title":"...","message":"..."}',
          },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = await resp.json();

    const text = data?.message?.content?.[0]?.text ?? "{}";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { title: "Error", message: "Invalid AI output" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});