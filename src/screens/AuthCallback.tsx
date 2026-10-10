import { Link, useRouter } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PublicLayout } from '../components/PublicLayout';
import { Heading } from '../components/ui';
import { useT } from '../i18n';
import { loginHref, parseCallback, takeNext } from '../lib/authCallback';
import { paths } from '../lib/paths';
import { type SessionLike, setSession } from '../lib/session';

type Outcome = 'ok' | 'expired' | 'error';

const EXPIRED_CODES = new Set(['otp_expired', 'flow_state_expired', 'flow_state_not_found', 'validation_failed']);

function finish(session: SessionLike): Outcome {
  setSession(session);
  return 'ok';
}

async function complete(): Promise<Outcome> {
  const params = parseCallback(window.location.search, window.location.hash);
  if (params.kind === 'expired' || params.kind === 'error') return params.kind;
  const { auth } = (await import('../lib/supabase')).getSupabase();
  // getSession() așteaptă inițializarea clientului, care citește singur codul sau tokenul din adresă.
  const first = await auth.getSession();
  if (first.data.session) return finish(first.data.session);
  if (params.kind !== 'code') return 'error';
  const { data, error } = await auth.exchangeCodeForSession(params.code);
  if (data.session) return finish(data.session);
  const code = (error as { code?: string } | null)?.code ?? '';
  return EXPIRED_CODES.has(code) || error?.name === 'AuthPKCECodeVerifierMissingError' ? 'expired' : 'error';
}

// O singură finalizare per încărcare de pagină (StrictMode rulează efectul de două ori; codul se folosește o dată).
let attempt: Promise<Outcome> | null = null;

/** Ruta /auth/callback: termină conectarea după autentificarea externă (Google) și duce omul mai departe. */
export function AuthCallback() {
  const t = useT();
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    attempt ??= complete().catch((): Outcome => 'error');
    let live = true;
    attempt.then((outcome) => {
      if (!live) return;
      if (outcome === 'ok') router.history.replace(takeNext());
      else if (outcome === 'expired') router.history.replace(loginHref('', 'expired'));
      else setFailed(true);
    });
    return () => {
      live = false;
    };
  }, [router]);

  const c = t.auth.callback;
  return (
    <PublicLayout nav={false}>
      <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 py-16 md:px-8 md:py-24">
        {failed ? (
          <>
            <Heading as="h1" size="lg" className="text-balance text-[2rem]">
              {c.errorTitle}
            </Heading>
            <p className="text-base leading-relaxed text-muted">{c.errorBody}</p>
            <Link
              to={paths.login}
              className="inline-flex min-h-11 items-center rounded-xl bg-accent-solid px-5 text-sm font-semibold text-on-accent"
            >
              {c.back}
            </Link>
          </>
        ) : (
          <div role="status" aria-busy="true" className="flex items-center gap-3 text-muted">
            <Loader2 size={20} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            <span>{c.connecting}</span>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
