/**
 * send-push — server-side FCM v1 sender
 * Called by DB triggers (selections, payment_proofs) via pg_net.
 * Authenticates with Firebase service account JWT → OAuth2 token.
 * Looks up admin_push_tokens by tenant_id and sends a push to each.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-trigger',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PushPayload {
  tenant_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

let cachedToken: { value: string; exp: number } | null = null;

function pemToBinary(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64url(bytes: Uint8Array | string): string {
  const str = typeof bytes === 'string' ? bytes : String.fromCharCode(...bytes);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const toSign = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(toSign))
  );
  const jwt = `${toSign}.${b64url(sig)}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`oauth: ${JSON.stringify(data)}`);
  cachedToken = { value: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

async function sendOne(
  projectId: string,
  accessToken: string,
  token: string,
  p: PushPayload
): Promise<{ ok: boolean; status: number; error?: string }> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          // data-only payload → SW handles display (avoids duplicate notifications on Android)
          data: {
            title: p.title,
            body: p.body,
            url: p.url || '/admin/pedidos',
            tag: p.tag || 'fotopedido',
          },
          webpush: {
            headers: { Urgency: 'high', TTL: '3600' },
            fcm_options: { link: p.url || '/admin/pedidos' },
          },
          android: { priority: 'HIGH' },
          apns: {
            headers: { 'apns-priority': '10' },
            payload: { aps: { 'content-available': 1 } },
          },
        },
      }),
    }
  );
  if (res.ok) return { ok: true, status: res.status };
  const text = await res.text();
  return { ok: false, status: res.status, error: text };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')
    return new Response('method not allowed', { status: 405, headers: corsHeaders });

  try {
    const payload = (await req.json()) as PushPayload;
    if (!payload?.tenant_id || !payload?.title || !payload?.body) {
      return new Response(JSON.stringify({ error: 'missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const saRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!saRaw) throw new Error('FIREBASE_SERVICE_ACCOUNT not set');
    const sa = JSON.parse(saRaw) as ServiceAccount;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tokens, error } = await supabase
      .from('admin_push_tokens')
      .select('id, token')
      .eq('tenant_id', payload.tenant_id);

    if (error) throw error;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no tokens' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getAccessToken(sa);

    let sent = 0;
    const stale: string[] = [];
    await Promise.all(
      tokens.map(async (row) => {
        const r = await sendOne(sa.project_id, accessToken, row.token, payload);
        if (r.ok) {
          sent++;
        } else if (r.status === 404 || r.status === 400) {
          // UNREGISTERED / INVALID_ARGUMENT → drop the token
          stale.push(row.id);
        } else {
          console.warn('[send-push] FCM error', r.status, r.error);
        }
      })
    );

    if (stale.length > 0) {
      await supabase.from('admin_push_tokens').delete().in('id', stale);
    }

    return new Response(JSON.stringify({ sent, stale: stale.length, total: tokens.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-push] fatal', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});