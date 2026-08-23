import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackFn } from "../_shared/telemetry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(trackFn("ai-enhance-notification", async (req) => {
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (!roleRow || !["admin", "coadmin"].includes(roleRow.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { title, message, template, subReason, featureJson, customInstructions } = body;

    const COHERE_API_KEY = Deno.env.get("COHERE_API_KEY");
    if (!COHERE_API_KEY) throw new Error("Missing COHERE_API_KEY");

    const isFeature = !!featureJson;

    const userPrompt = isFeature
      ? `
You are a feature creator for a SaaS platform's upcoming features page.

${customInstructions ? `\nCustom instructions from the admin: ${customInstructions}\n` : ""}

Input Feature JSON (use this as a starting reference — you may rewrite anything):
${JSON.stringify(featureJson, null, 2)}

You MUST return the exact same JSON structure. Each field is explained below:

---
FIELD RULES:

1. "title" (string)
   - Write a clear, compelling, and concise title from scratch based on the feature concept.
   - You have full freedom to rewrite.

2. "category" (string)
   - Choose freely. Common examples: "Teachers", "Students", "General", "Parents", "Security", "Performance", "UI/UX", "Mobile", "Analytics", "Gamification", "Notifications".

3. "icon_name" (string — pick from this EXACT list ONLY; never invent new ones):
   Rocket, Sparkles, Trophy, MessageSquare, Globe, Bell, Clock, BookOpen, Users, Shield, Zap, Star, Settings, Heart, Flag, Award, Lightbulb, Target, Share2, Lock, Eye, Palette, Gift, Layers, Code, Database, Cloud, Link, Compass, GraduationCap, Search, RefreshCw, CheckCircle, Mail, Calendar, Monitor, Smartphone, Download, FileText, BarChart, TrendingUp, UserPlus, BookMarked

4. "target_date" (string — either empty "" or "YYYY-MM-DD" format)
   - You may set or clear it freely.

5. "status" (string — one of these EXACT values only):
   "planned", "in-development", "testing", "completed", "deployed"

6. "description" (array — each item must be ONE of these 3 types exactly)

   TYPE A — text block (for paragraphs):
     { "type": "text", "content": "string — full paragraph text" }

   TYPE B — list block (for bullet points):
     { "type": "list", "items": ["item 1", "item 2", ...] }

   TYPE C — table block (for structured data):
     {
       "type": "table",
       "headers": ["Col1", "Col2", ...],
       "rows": [["cell1", "cell2"], ["cell3", "cell4"], ...]
     }

   IMPORTANT for description:
   - Only these 3 block types are allowed: "text", "list", "table".
   - Do NOT add any other keys to a block.
   - You may add, remove, or reorder blocks freely.
   - You may change any block's "type" freely.
   - Write the content from scratch — be professional, clear, and engaging.
---
GENERAL RULES:
- Do not invent false information.
- Use clear, concise, professional language.
- Do NOT wrap the JSON in markdown code blocks or backticks.
- Return ONLY raw valid JSON with no formatting, no backticks, no code fences.
- You MUST return exactly the same top-level keys (title, category, icon_name, target_date, status, description).
`
      : `
You are generating a high-quality admin notification for a SaaS platform.
Notifications support rich formatting: the "message" field MUST be written in GitHub-flavored Markdown with LaTeX math support (rendered with KaTeX).

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
- Make the title short, strong, and attention-grabbing (plain text, no markdown in the title).
- Preserve important numbers, discounts, dates, deadlines, rewards, or platform terms exactly.
- Do not use excessive hype, emojis, or marketing spam language.
- Do not invent false information.

MARKDOWN RULES for "message" (mandatory):
- Structure the content using Markdown. Separate paragraphs with a blank line (\n\n). Never emit one giant wall of text.
- Use **bold** for key facts (amounts, deadlines, statuses) and bullet lists ("- item") for enumerations when there are 2+ related points.
- Use "> " blockquotes sparingly to highlight critical warnings or calls-to-action.
- You may use headings (### small heading) only if the message is long enough to warrant sections.
- LaTeX math is allowed and encouraged ONLY where it genuinely helps (formulas, equations, rates, calculations):
  - Inline math: $E = mc^2$
  - Display/block math: $$\\int_0^1 x^2 dx = \\frac{1}{3}$$
  - Never wrap LaTeX in code fences; write valid KaTeX-compatible commands.
- If the message has no mathematical content, do NOT force any LaTeX — clean Markdown alone is fine.
- Escape nothing manually; return literal newline characters inside the JSON string.

Do NOT wrap the JSON in markdown code blocks or backticks.
Return ONLY raw valid JSON with no formatting, no backticks, no code fences.

Output Format:
{"title":"...","message":"..."}
`;

    const systemContent = isFeature
      ? "Return ONLY raw JSON that matches the input feature structure. No markdown, no backticks, no code fences. Pure JSON only."
      : 'Return ONLY raw JSON: {"title":"...","message":"..."}. The "message" value must be rich Markdown (with LaTeX only when math is involved). No wrapping code fences around the JSON itself.';

    const resp = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COHERE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "command-a-03-2025",
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = await resp.json();
    const text = data?.message?.content?.[0]?.text ?? "{}";

    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = isFeature
          ? { error: "Invalid AI output", raw: cleaned }
          : { title: "Error", message: "Invalid AI output" };
      }
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
}));
