// Client gate — checks if caller's IP or fingerprint is blocked.
// Public endpoint (no JWT) — uses hashed identifiers only.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { fingerprint, action } = await req.json().catch(() => ({}));
    if (!fingerprint || typeof fingerprint !== 'string' || fingerprint.length > 256) {
      return new Response(JSON.stringify({ error: 'invalid fingerprint' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
    const salt = Deno.env.get('CLIENT_GATE_SALT') ?? 'lovable-scholar-share';
    const ipHash = await sha256(salt + ':' + ip);
    const fpHash = await sha256(salt + ':' + fingerprint);

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: blockRow } = await sb.rpc('is_client_blocked', { p_ip_hash: ipHash, p_fp_hash: fpHash });
    const blocked = Array.isArray(blockRow) && blockRow.length > 0;

    if (!blocked) {
      await sb.rpc('record_client_hit', {
        p_ip_hash: ipHash, p_fp_hash: fpHash, p_action: (action ?? 'visit').slice(0, 64),
      });
    }

    return new Response(JSON.stringify({
      blocked, reason: blocked ? blockRow[0].reason : null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
