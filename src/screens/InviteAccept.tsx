import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Calendar, CircleCheck, Loader2, MailX, MapPin, UserRound } from 'lucide-react';
import { type ReactNode, useEffect, useReducer, useRef, useState } from 'react';
import { LINK_BUTTON_GHOST, LINK_BUTTON_PRIMARY, LINK_FOCUS, PublicShell } from '../components/PublicShell';
import { Banner, Button, Heading } from '../components/ui';
import { supabaseInvitesClient } from '../data/invites';
import { isValidISODate, parseISODate } from '../domain/dates';
import { useT } from '../i18n';
import { isAuthConfigured } from '../lib/auth';
import { loginHref } from '../lib/authCallback';
import { formatDate } from '../lib/format';
import { parsePreview, previewFor } from '../lib/invitePreview';
import { emailsDiffer, type InviteState, initialInviteState, inviteReducer, isBusy } from '../lib/inviteState';
import { type InvitesClient, inviteErrorKind, inviteErrorMessage, notConfiguredInvitesClient } from '../lib/invites';
import { invitePath, paths } from '../lib/paths';
import { signOut, useSession } from '../lib/session';
import { roleLabel } from '../lib/workspaces';

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

function Badge({ children, tone }: { children: ReactNode; tone: 'soft' | 'warn' | 'ok' }) {
  const tones = { soft: 'bg-soft text-ink', warn: 'bg-minus/10 text-minus', ok: 'bg-plus/10 text-plus' };
  return (
    <span className={`inline-flex size-12 items-center justify-center rounded-full ${tones[tone]}`}>{children}</span>
  );
}

/** Pagina `/invite/:token` pentru ecranul de rutare: citește tokenul din adresă. */
export function InviteRoute() {
  const { token } = useParams({ strict: false });
  // `key`: la schimbarea tokenului, pagina se montează de la zero, fără urme din invitația precedentă.
  return (
    <InviteAccept
      key={token}
      token={token ?? ''}
      client={isAuthConfigured() ? supabaseInvitesClient : notConfiguredInvitesClient}
    />
  );
}

export function InviteAccept({
  token,
  client: clientProp = notConfiguredInvitesClient,
}: {
  token: string;
  client?: InvitesClient;
}) {
  const t = useT();
  const i = t.invite;
  const [preview] = useState(readPreview);
  const client = preview?.client ?? clientProp;
  const [state, dispatch] = useReducer(
    inviteReducer,
    undefined,
    (): InviteState => (preview ? { ...preview.state, token } : initialInviteState('loading', null, token)),
  );
  const { status, info, errorKind } = state;
  const busy = isBusy(state);
  const signedOut = useSession((s) => s.status === 'signedOut');
  const sessionEmail = useSession((s) => s.user?.email ?? null);
  const navigate = useNavigate();

  // Fiecare cerere are un număr; rezultatele unei cereri înlocuite sunt ignorate de reducer.
  const requestSeq = useRef(0);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` repornește verificarea la „Încercați din nou"; previzualizarea are deja starea ei.
  useEffect(() => {
    if (preview) return;
    const id = ++requestSeq.current;
    dispatch({ type: 'load', id, token });
    client.inspect(token).then(
      (result) => dispatch({ type: 'loaded', id, info: result }),
      (error: unknown) => dispatch({ type: 'failed', id, kind: inviteErrorKind(error) }),
    );
  }, [client, token, preview, attempt]);

  // Conectat cu alt cont decât cel invitat: acceptarea ar fi refuzată, deci se oferă schimbarea contului.
  const wrongAccount = errorKind === 'wrongAccount' || emailsDiffer(sessionEmail, info?.email ?? null);

  async function switchAccount() {
    await signOut();
    void navigate({ href: loginHref(invitePath(token)) });
  }

  function act(type: 'accept' | 'decline') {
    if (busy || status !== 'valid') return;
    // Fără cont conectat nu se poate accepta: după conectare, omul revine aici.
    if (type === 'accept' && signedOut) {
      void navigate({ href: loginHref(invitePath(token)) });
      return;
    }
    const id = ++requestSeq.current;
    dispatch({ type, id, token });
    (type === 'accept' ? client.accept(token) : client.decline(token)).then(
      () => dispatch({ type: 'done', id }),
      (error: unknown) => dispatch({ type: 'failed', id, kind: inviteErrorKind(error) }),
    );
  }

  const name = info?.workspaceName ?? '';
  const announce =
    status === 'loading'
      ? i.loading
      : status === 'accepting'
        ? i.accepting
        : status === 'declining'
          ? i.declining
          : status === 'accepted'
            ? i.accepted.title(name)
            : status === 'declined'
              ? i.declined.title
              : '';

  return (
    <PublicShell
      headerAction={
        <Link
          to={paths.login}
          className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 text-[13px] font-medium text-ink hover:bg-sunken ${LINK_FOCUS}`}
        >
          {i.signIn}
        </Link>
      }
    >
      <div className="w-full max-w-[28rem]">
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
        <section
          aria-labelledby="invite-title"
          aria-busy={status === 'loading' || busy}
          className="rounded-2xl border border-line bg-surface p-6 shadow-sm md:p-8"
        >
          {status === 'loading' && <Loading />}

          {(status === 'valid' || busy) && info && (
            <div className="flex flex-col gap-5 text-center">
              <div className="flex justify-center">
                <span
                  aria-hidden="true"
                  className="inline-flex size-12 items-center justify-center rounded-full bg-warm font-serif text-lg font-semibold text-ink"
                >
                  {info.inviterName.slice(0, 1).toUpperCase() || <UserRound size={20} />}
                </span>
              </div>
              <div>
                <p className={EYEBROW}>{i.eyebrow}</p>
                <Heading as="h1" id="invite-title" size="lg" className="mt-2 max-md:text-[1.6rem] md:text-[1.7rem]">
                  {i.title(info.inviterName, info.workspaceName)}
                </Heading>
                <p className="mt-2 text-sm text-muted">{i.lead}</p>
              </div>

              {errorKind && <Banner tone="warn">{inviteErrorMessage(errorKind, t)}</Banner>}
              {!errorKind && wrongAccount && <Banner tone="warn">{inviteErrorMessage('wrongAccount', t)}</Banner>}

              <div className="flex items-center justify-between gap-3 rounded-xl bg-sunken p-4 text-left">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{i.roleTitle}</p>
                  <p className="mt-1 text-[13px] text-ink">{t.workspaces.roleHints[info.role]}</p>
                </div>
                <span className="whitespace-nowrap rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-ink">
                  {roleLabel(info.role, t)}
                </span>
              </div>

              <Facts date={info.date} city={info.city} />

              <div className="flex flex-col gap-2">
                <Button
                  className="w-full"
                  disabled={busy}
                  aria-busy={status === 'accepting'}
                  onClick={() => act('accept')}
                >
                  {status === 'accepting' ? (
                    <>
                      <Spinner />
                      {i.accepting}
                    </>
                  ) : (
                    i.accept
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  disabled={busy}
                  aria-busy={status === 'declining'}
                  onClick={() => act('decline')}
                >
                  {status === 'declining' ? (
                    <>
                      <Spinner />
                      {i.declining}
                    </>
                  ) : (
                    i.decline
                  )}
                </Button>
                {wrongAccount && (
                  <Button variant="ghost" className="w-full" disabled={busy} onClick={() => void switchAccount()}>
                    {i.switchAccount}
                  </Button>
                )}
              </div>
              {signedOut && <p className="text-xs text-muted">{i.signInHint(info.email)}</p>}
              {info.email && <p className="text-xs text-muted">{i.sentTo(info.email)}</p>}
            </div>
          )}

          {(status === 'expired' || status === 'used') && (
            <Message
              icon={<MailX size={22} aria-hidden="true" />}
              tone="warn"
              eyebrow={status === 'expired' ? i.expired.eyebrow : i.used.eyebrow}
              title={status === 'expired' ? i.expired.title : i.used.title}
              body={status === 'expired' ? i.expired.body(name) : i.used.body(name)}
              actions={
                <>
                  <Link to={paths.login} className={`${LINK_BUTTON_PRIMARY} w-full`}>
                    {i.signIn}
                  </Link>
                  <Link to={paths.landing} className={`${LINK_BUTTON_GHOST} w-full`}>
                    {i.backHome}
                  </Link>
                </>
              }
            />
          )}

          {status === 'error' && (
            <Message
              icon={<MailX size={22} aria-hidden="true" />}
              tone="warn"
              eyebrow={i.failed.eyebrow}
              title={i.failed.title}
              banner={errorKind ? inviteErrorMessage(errorKind, t) : undefined}
              actions={
                <>
                  {errorKind !== 'notConfigured' && (
                    <Button className="w-full" onClick={() => setAttempt((n) => n + 1)}>
                      {i.retry}
                    </Button>
                  )}
                  <Link to={paths.landing} className={`${LINK_BUTTON_GHOST} w-full`}>
                    {i.backHome}
                  </Link>
                </>
              }
            />
          )}

          {status === 'accepted' && (
            <Message
              icon={<CircleCheck size={22} aria-hidden="true" />}
              tone="ok"
              eyebrow={i.accepted.eyebrow}
              title={i.accepted.title(name)}
              body={i.accepted.body}
              actions={
                <Link to={paths.workspaces} className={`${LINK_BUTTON_PRIMARY} w-full`}>
                  {i.accepted.cta}
                </Link>
              }
            />
          )}

          {status === 'declined' && (
            <Message
              icon={<MailX size={22} aria-hidden="true" />}
              tone="soft"
              eyebrow={i.declined.eyebrow}
              title={i.declined.title}
              body={i.declined.body(name)}
              actions={
                <Link to={paths.landing} className={`${LINK_BUTTON_GHOST} w-full`}>
                  {i.backHome}
                </Link>
              }
            />
          )}
        </section>
      </div>
    </PublicShell>
  );
}

function Loading() {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <Heading as="h1" id="invite-title" size="md">
        {t.invite.loading}
      </Heading>
      <div aria-hidden="true" className="h-3 w-40 animate-pulse rounded-full bg-sunken motion-reduce:animate-none" />
      <div aria-hidden="true" className="h-3 w-28 animate-pulse rounded-full bg-sunken motion-reduce:animate-none" />
    </div>
  );
}

function Facts({ date, city }: { date: string | null; city: string | null }) {
  const dateText = date && isValidISODate(date) ? formatDate(parseISODate(date)) : '';
  const place = city?.trim() ?? '';
  if (!dateText && !place) return null;
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[13px] text-muted">
      {dateText && (
        <li className="flex items-center gap-1.5">
          <Calendar size={14} aria-hidden="true" />
          {dateText}
        </li>
      )}
      {place && (
        <li className="flex items-center gap-1.5">
          <MapPin size={14} aria-hidden="true" />
          {place}
        </li>
      )}
    </ul>
  );
}

function Message({
  icon,
  tone,
  eyebrow,
  title,
  body,
  banner,
  actions,
}: {
  icon: ReactNode;
  tone: 'soft' | 'warn' | 'ok';
  eyebrow: string;
  title: string;
  body?: string;
  banner?: string;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <Badge tone={tone}>{icon}</Badge>
      <div>
        <p className={EYEBROW}>{eyebrow}</p>
        <Heading as="h1" id="invite-title" size="lg" className="mt-2 max-md:text-[1.6rem] md:text-[1.7rem]">
          {title}
        </Heading>
        {body && <p className="mt-2 text-sm text-muted">{body}</p>}
      </div>
      {banner && <Banner tone="warn">{banner}</Banner>}
      <div className="flex w-full flex-col gap-2">{actions}</div>
    </div>
  );
}
