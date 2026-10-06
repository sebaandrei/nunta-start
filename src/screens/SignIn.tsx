import { Link } from '@tanstack/react-router';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';
import { type FormEvent, useEffect, useReducer, useRef, useState } from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Banner, Button, Card, Heading, TextInput } from '../components/ui';
import { useT } from '../i18n';
import {
  type AuthClient,
  authErrorKind,
  authErrorMessage,
  formatCountdown,
  notConfiguredAuthClient,
  validateEmail,
} from '../lib/auth';
import { parsePreview, previewFor } from '../lib/authPreview';
import { initialSignInState, signInReducer } from '../lib/signInState';

const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-muted';

/** Previzualizarea stărilor desenate: doar în dev; în producție ramura e eliminată la build. */
function readPreview() {
  if (!import.meta.env.DEV) return null;
  const name = parsePreview(new URLSearchParams(window.location.search).get('preview'));
  return name ? previewFor(name) : null;
}

function Spinner() {
  return <Loader2 size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />;
}

export function SignIn({
  client: clientProp = notConfiguredAuthClient,
  showGoogle = import.meta.env.VITE_AUTH_GOOGLE === 'true',
}: {
  client?: AuthClient;
  /** Google rămâne implementat, dar ascuns până când aplicația nu mai e doar pe invitație. */
  showGoogle?: boolean;
}) {
  const t = useT();
  const a = t.auth;
  const [preview] = useState(readPreview);
  const client = preview?.client ?? clientProp;

  const [state, dispatch] = useReducer(signInReducer, undefined, () => {
    if (preview) return preview.state;
    const expired = new URLSearchParams(window.location.search).get('error') === 'expired';
    return initialSignInState(expired ? 'expired' : 'idle');
  });
  const { status, email, fieldError, errorKind, resendIn, resending } = state;
  const sending = status === 'sending';
  const showSent = status === 'sent' || (sending && resending);
  const expired = status === 'expired';

  useEffect(() => {
    if (fieldError) document.getElementById('signin-email')?.focus();
  }, [fieldError]);

  // Numărătoarea inversă a butonului „Retrimite".
  const counting = status === 'sent' && resendIn > 0;
  useEffect(() => {
    if (!counting) return;
    const id = setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => clearInterval(id);
  }, [counting]);

  // Fiecare cerere are un număr; rezultatele unei cereri înlocuite sunt ignorate de reducer.
  const requestSeq = useRef(0);

  function run(id: number, request: Promise<void>, onDone: () => void) {
    request.then(onDone, (error: unknown) => dispatch({ type: 'failed', id, kind: authErrorKind(error) }));
  }

  function sendLink(event: 'submit' | 'resend') {
    if (sending) return;
    const id = ++requestSeq.current;
    dispatch({ type: event, id });
    if (event === 'submit' && validateEmail(email)) return;
    run(id, client.sendMagicLink(email.trim()), () => dispatch({ type: 'succeeded', id }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    sendLink('submit');
  }

  function onGoogle() {
    if (sending) return;
    const id = ++requestSeq.current;
    dispatch({ type: 'google', id });
    // Clientul real redirecționează spre Google; la reușită nu avem ce arăta, pagina se schimbă.
    run(id, client.signInWithGoogle(), () => {});
  }

  const announce = sending ? a.announce.sending : status === 'sent' ? a.announce.sent : '';

  return (
    <AuthLayout>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <Card className="p-6 shadow-sm md:p-8">
        {showSent ? (
          <SentView
            email={email}
            resendIn={resendIn}
            busy={sending}
            onResend={() => sendLink('resend')}
            onOther={() => dispatch({ type: 'useOther' })}
          />
        ) : (
          <div className="flex flex-col gap-5">
            {expired && (
              <Banner tone="warn">
                <div>
                  <p className="font-semibold">{a.expired.bannerTitle}</p>
                  <p className="mt-0.5 text-muted">{a.expired.bannerBody}</p>
                </div>
              </Banner>
            )}
            {status === 'error' && errorKind === 'notInvited' && (
              <Banner tone="warn">
                <div>
                  <p className="font-semibold">{a.notInvited.title}</p>
                  <p className="mt-0.5 text-muted">{authErrorMessage(errorKind, t)}</p>
                </div>
              </Banner>
            )}
            {status === 'error' && errorKind && errorKind !== 'notInvited' && (
              <Banner tone="warn">{authErrorMessage(errorKind, t)}</Banner>
            )}

            <div>
              <p className={EYEBROW}>{expired ? a.expired.eyebrow : a.form.eyebrow}</p>
              <Heading as="h1" size="lg" className="mt-2 md:text-[1.9rem]">
                {expired ? a.expired.title : a.form.title}
              </Heading>
              <p className="mt-2 text-sm text-muted">{expired ? a.expired.lead : a.form.lead}</p>
            </div>

            {!expired && showGoogle && (
              <>
                <Button variant="ghost" className="w-full" onClick={onGoogle} disabled={sending}>
                  <span
                    aria-hidden="true"
                    className="inline-flex size-5 items-center justify-center rounded-full border border-line text-[11px] font-bold"
                  >
                    G
                  </span>
                  {a.form.google}
                </Button>
                <div className="flex items-center gap-3" aria-hidden="true">
                  <span className="h-px flex-1 bg-line" />
                  <span className={EYEBROW}>{a.form.divider}</span>
                  <span className="h-px flex-1 bg-line" />
                </div>
              </>
            )}

            <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="signin-email"
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted"
                >
                  {a.form.emailLabel}
                </label>
                <TextInput
                  id="signin-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder={a.form.emailPlaceholder}
                  value={email}
                  readOnly={sending}
                  aria-invalid={fieldError ? true : undefined}
                  aria-describedby={fieldError ? 'signin-email-error' : 'signin-helper'}
                  onChange={(e) => dispatch({ type: 'edit', email: e.target.value })}
                />
                {fieldError && (
                  <p id="signin-email-error" className="mt-1.5 text-xs font-medium text-minus">
                    {a.fieldErrors[fieldError]}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={sending} aria-busy={sending}>
                {sending ? (
                  <>
                    <Spinner />
                    {a.form.sending}
                  </>
                ) : expired ? (
                  a.expired.submit
                ) : (
                  a.form.submit
                )}
              </Button>
              {expired ? (
                <Button variant="link" className="min-h-11 self-center" onClick={() => dispatch({ type: 'useOther' })}>
                  {a.sent.other}
                </Button>
              ) : (
                <p id="signin-helper" className="text-center text-xs text-muted">
                  {a.form.helper}
                </p>
              )}
            </form>

            {!expired && <p className="text-center text-xs text-muted">{a.form.inviteOnly}</p>}

            <div className="flex items-start gap-3 rounded-xl bg-sunken p-4">
              <ShieldCheck size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
              <div>
                <p className="text-[13px] font-semibold">{a.form.privacyTitle}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{a.form.privacyBody}</p>
              </div>
            </div>

            <p className="text-center text-[11px] leading-relaxed text-muted">
              {a.form.termsBefore}
              <Link to="/terms" className="underline underline-offset-2 hover:text-ink">
                {a.form.terms}
              </Link>
              {a.form.termsAnd}
              <Link to="/privacy" className="underline underline-offset-2 hover:text-ink">
                {a.form.privacy}
              </Link>
              {a.form.termsAfter}
            </p>
          </div>
        )}
      </Card>
    </AuthLayout>
  );
}

function SentView({
  email,
  resendIn,
  busy,
  onResend,
  onOther,
}: {
  email: string;
  resendIn: number;
  busy: boolean;
  onResend: () => void;
  onOther: () => void;
}) {
  const t = useT();
  const s = t.auth.sent;
  return (
    <div className="flex flex-col gap-5">
      <span
        aria-hidden="true"
        className="inline-flex size-12 items-center justify-center rounded-2xl bg-soft text-accent"
      >
        <Mail size={22} />
      </span>
      <div>
        <p className={EYEBROW}>{s.eyebrow}</p>
        <Heading as="h1" size="lg" className="mt-2 md:text-[1.9rem]">
          {s.title}
        </Heading>
        <p className="mt-2 text-sm text-muted">
          {s.before}
          <strong className="font-semibold break-all text-ink">{email.trim()}</strong>
          {s.after}
        </p>
      </div>
      <p className="rounded-xl bg-sunken p-4 text-xs leading-relaxed text-muted">{s.tip}</p>
      <Button
        variant="secondary"
        className="w-full"
        disabled={busy || resendIn > 0}
        aria-busy={busy}
        onClick={onResend}
      >
        {busy && <Spinner />}
        {resendIn > 0 ? s.resendIn(formatCountdown(resendIn)) : s.resend}
      </Button>
      <Button variant="link" className="min-h-11 self-center" onClick={onOther} disabled={busy} aria-disabled={busy}>
        {s.other}
      </Button>
    </div>
  );
}
