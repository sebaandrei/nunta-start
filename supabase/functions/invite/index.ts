// NS-050: creates an invitation (the create_invitation RPC runs as the caller, so the role rules and
// RLS apply) and emails the one-time link through Resend. The plain token never goes back to the browser.
//
// Secrets (supabase secrets set): RESEND_API_KEY, INVITE_FROM (e.g. "Nunta Start <invitatii@example.ro>"),
// SITE_URL (the app origin, no trailing slash). INVITE_DEV_LOG=1 logs the link instead of emailing it (local only).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { inviteEmail, parseEmailLocale } from './email.ts';

const ROLES = ['partner', 'planner', 'helper', 'viewer'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

/** Postgres error codes raised by create_invitation, as HTTP statuses. */
function statusOf(code: string | undefined): number {
  switch (code) {
    case '42501':
      return 403;
    case '22023':
      return 400;
    case '23505':
      return 409;
    case 'P0001':
      return 429;
    default:
      return 500;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'sign in required' }, 401);

  let body: { weddingId?: unknown; email?: unknown; role?: unknown; locale?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }
  const { weddingId, email, role } = body;
  if (
    typeof weddingId !== 'string' ||
    !UUID.test(weddingId) ||
    typeof email !== 'string' ||
    typeof role !== 'string' ||
    !ROLES.includes(role)
  ) {
    return json({ error: 'invalid input' }, 400);
  }

  const siteUrl = Deno.env.get('SITE_URL')?.replace(/\/$/, '');
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const devLog = Deno.env.get('INVITE_DEV_LOG') === '1';
  const from = Deno.env.get('INVITE_FROM');
  if (!siteUrl || (!devLog && (!apiKey || !from))) return json({ error: 'email is not configured' }, 500);

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: auth } },
  });

  const { data, error } = await supabase.rpc('create_invitation', {
    p_wedding_id: weddingId,
    p_email: email,
    p_role: role,
  });
  if (error || !data)
    return json({ error: error?.message ?? 'could not create the invitation' }, statusOf(error?.code));

  const invitation = data as {
    id: string;
    token: string;
    email: string;
    role: string;
    createdAt: string;
    expiresAt: string;
    weddingName: string;
    inviterName: string;
  };
  const link = `${siteUrl}/invite/${invitation.token}`;
  const mail = inviteEmail({
    locale: parseEmailLocale(body.locale),
    inviterName: invitation.inviterName,
    weddingName: invitation.weddingName,
    role: invitation.role,
    link,
    days: Math.round((Date.parse(invitation.expiresAt) - Date.parse(invitation.createdAt)) / 86_400_000),
  });

  // An invitation whose email never left must not stay pending: the owner would see it but nobody has the link.
  const undo = async () => {
    await supabase.from('invitations').delete().eq('id', invitation.id);
  };

  if (devLog) {
    console.log(`[invite] ${invitation.email}: ${link}`);
  } else {
    let sent = false;
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [invitation.email], subject: mail.subject, html: mail.html, text: mail.text }),
      });
      sent = res.ok;
      if (!res.ok) console.error('[invite] Resend refused', res.status, await res.text());
    } catch (e) {
      console.error('[invite] Resend unreachable', e);
    }
    if (!sent) {
      await undo();
      return json({ error: 'the email could not be sent' }, 502);
    }
  }

  return json({
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      created_at: invitation.createdAt,
      expires_at: invitation.expiresAt,
    },
  });
});
