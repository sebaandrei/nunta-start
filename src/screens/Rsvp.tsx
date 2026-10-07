import { Link, useParams } from '@tanstack/react-router';
import { CircleCheck, Loader2, MailX } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { PublicLayout } from '../components/PublicLayout';
import { Banner, Button, Field, Heading, Segmented, Select, TextArea } from '../components/ui';
import { supabaseRsvpClient } from '../data/rsvp';
import { DIETS } from '../domain/guests';
import { useT } from '../i18n';
import { isAuthConfigured } from '../lib/auth';
import { paths } from '../lib/paths';
import {
  notConfiguredRsvpClient,
  type RsvpClient,
  type RsvpErrorKind,
  type RsvpHousehold,
  rsvpErrorKind,
  rsvpErrorMessage,
} from '../lib/rsvp';
import { createFakeRsvpClient, parseRsvpPreview } from '../lib/rsvpPreview';
import {
  formFromHousehold,
  RSVP_NOTE_MAX,
  type RsvpForm,
  setAttending,
  setDiet,
  setNote,
  toSubmission,
  unanswered,
} from '../lib/rsvpState';
import { pageTitle, useDocumentTitle } from '../lib/useDocumentTitle';

const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-muted';

/** Previzualizarea stărilor desenate: doar în dev; în producție ramura e eliminată la build. */
function readPreview(): RsvpClient | null {
  if (!import.meta.env.DEV) return null;
  const name = parseRsvpPreview(new URLSearchParams(window.location.search).get('preview'));
  return name ? createFakeRsvpClient(name) : null;
}

/** Pagina `/r/:token`: publică, fără cont și fără meniul aplicației. */
export function RsvpRoute() {
  const { token } = useParams({ strict: false });
  // `key`: la schimbarea tokenului, pagina se montează de la zero.
  return (
    <RsvpPage
      key={token}
      token={token ?? ''}
      client={isAuthConfigured() ? supabaseRsvpClient : notConfiguredRsvpClient}
    />
  );
}

type Load =
  | { status: 'loading' }
  | { status: 'ready'; household: RsvpHousehold }
  | { status: 'error'; kind: RsvpErrorKind };

export function RsvpPage({ token, client: clientProp }: { token: string; client: RsvpClient }) {
  const t = useT();
  const r = t.rsvp;
  const [preview] = useState(readPreview);
  const client = preview ?? clientProp;
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [form, setForm] = useState<RsvpForm | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<RsvpErrorKind | null>(null);
  const [showMissing, setShowMissing] = useState(false);

  useDocumentTitle(pageTitle(r.eyebrow, t.appName));

  // Cât timp pagina e deschisă, motoarele de căutare n-o indexează (linkul e personal).
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.append(meta);
    return () => meta.remove();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` repornește încărcarea la „Încercați din nou".
  useEffect(() => {
    let cancelled = false;
    setLoad({ status: 'loading' });
    client.fetchHousehold(token).then(
      (household) => {
        if (cancelled) return;
        setForm(formFromHousehold(household));
        setLoad({ status: 'ready', household });
      },
      (error: unknown) => {
        if (!cancelled) setLoad({ status: 'error', kind: rsvpErrorKind(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [client, token, attempt]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form || sending) return;
    // TODO(NS-081): se adaugă tokenul Turnstile ca al doilea argument.
    const submission = toSubmission(form);
    if (!submission) {
      setShowMissing(true);
      return;
    }
    setShowMissing(false);
    setSendError(null);
    setSending(true);
    client.submitRsvp(token, submission).then(
      () => {
        setSending(false);
        setSent(true);
      },
      (error: unknown) => {
        setSending(false);
        const kind = rsvpErrorKind(error);
        if (kind === 'notFound') setLoad({ status: 'error', kind });
        else setSendError(kind);
      },
    );
  }

  const household = load.status === 'ready' ? load.household : null;

  return (
    <PublicLayout nav={false}>
      <div className="mx-auto w-full max-w-[32rem] px-4 py-6 md:py-12">
        <p className="sr-only" aria-live="polite">
          {load.status === 'loading' ? r.loading : sent ? r.done.title : ''}
        </p>
        <section
          aria-labelledby="rsvp-title"
          aria-busy={load.status === 'loading' || sending}
          className="rounded-2xl border border-line bg-surface p-5 shadow-sm md:p-8"
        >
          {load.status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Heading as="h1" id="rsvp-title" size="md">
                {r.loading}
              </Heading>
              <div
                aria-hidden="true"
                className="h-3 w-40 animate-pulse rounded-full bg-sunken motion-reduce:animate-none"
              />
              <div
                aria-hidden="true"
                className="h-3 w-28 animate-pulse rounded-full bg-sunken motion-reduce:animate-none"
              />
            </div>
          )}

          {load.status === 'error' && (
            <Message
              eyebrow={load.kind === 'notFound' ? r.notFound.eyebrow : r.failed.eyebrow}
              title={load.kind === 'notFound' ? r.notFound.title : r.failed.title}
              body={load.kind === 'notFound' ? r.notFound.body : undefined}
              banner={load.kind === 'notFound' ? undefined : rsvpErrorMessage(load.kind, t)}
              actions={
                load.kind === 'notFound' || load.kind === 'notConfigured' ? null : (
                  <Button className="w-full" onClick={() => setAttempt((n) => n + 1)}>
                    {r.retry}
                  </Button>
                )
              }
            />
          )}

          {household && form && sent && (
            <Message
              ok
              eyebrow={r.done.eyebrow}
              title={r.done.title}
              body={r.done.body}
              actions={
                <Button variant="ghost" className="w-full" onClick={() => setSent(false)}>
                  {r.done.edit}
                </Button>
              }
            />
          )}

          {household && form && !sent && (
            <form onSubmit={submit} noValidate className="flex flex-col gap-5">
              <div className="text-center">
                <p className={EYEBROW}>{r.eyebrow}</p>
                <Heading as="h1" id="rsvp-title" size="lg" className="mt-2 max-md:text-[1.6rem] md:text-[1.7rem]">
                  {r.title(household.householdName)}
                </Heading>
                <p className="mt-2 text-sm text-muted">{r.lead(household.weddingName)}</p>
              </div>

              <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
                <legend className="sr-only">{r.guestsLegend}</legend>
                {household.guests.map((guest) => {
                  const answer = form.answers[guest.id];
                  const missing = showMissing && answer.attending === 'unknown';
                  return (
                    <div key={guest.id} className="flex flex-col gap-3 rounded-xl bg-sunken p-4">
                      <p className="text-[15px] font-medium text-ink">
                        {guest.name}
                        {guest.ageGroup === 'child' && (
                          <span className="ml-2 text-xs font-normal text-muted">{t.guests.ageGroups.child}</span>
                        )}
                      </p>
                      <Segmented
                        label={r.attendingLabel(guest.name)}
                        className="w-full [&>button]:flex-1"
                        value={answer.attending === 'unknown' ? ('' as 'yes') : answer.attending}
                        options={[
                          { value: 'yes', label: r.attendingOptions.yes },
                          { value: 'no', label: r.attendingOptions.no },
                        ]}
                        onChange={(value) => setForm(setAttending(form, guest.id, value))}
                      />
                      {missing && (
                        <p role="alert" className="text-xs text-minus">
                          {r.unansweredHint}
                        </p>
                      )}
                      {answer.attending === 'yes' && (
                        <Field label={r.dietLabel}>
                          <Select
                            className="w-full"
                            value={answer.diet}
                            onChange={(e) => setForm(setDiet(form, guest.id, e.target.value as (typeof DIETS)[number]))}
                          >
                            {DIETS.map((diet) => (
                              <option key={diet} value={diet}>
                                {t.guests.diets[diet]}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      )}
                    </div>
                  );
                })}
              </fieldset>

              <Field label={r.noteLabel} hint={r.noteHint(RSVP_NOTE_MAX)}>
                <TextArea
                  className="w-full"
                  rows={3}
                  maxLength={RSVP_NOTE_MAX}
                  placeholder={r.notePlaceholder}
                  value={form.note}
                  onChange={(e) => setForm(setNote(form, e.target.value))}
                />
              </Field>

              {/* TODO(NS-081): aici se montează widgetul Cloudflare Turnstile (cheia vine din NS-023). */}
              <div data-turnstile-slot="" hidden />

              {showMissing && unanswered(form).length > 0 && <Banner tone="warn">{r.missing}</Banner>}
              {sendError && (
                <Banner tone="warn">{rsvpErrorMessage(sendError === 'notFound' ? 'generic' : sendError, t)}</Banner>
              )}

              <Button type="submit" className="w-full" disabled={sending} aria-busy={sending}>
                {sending ? (
                  <>
                    <Loader2 size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                    {r.submitting}
                  </>
                ) : (
                  r.submit
                )}
              </Button>

              <div className="border-t border-line pt-4 text-xs text-muted">
                <p className="font-semibold text-ink">{r.gdprTitle}</p>
                <p className="mt-1">{r.gdpr}</p>
                <Link to={paths.privacy} className="mt-1 inline-flex min-h-11 items-center text-accent hover:underline">
                  {r.gdprLink}
                </Link>
              </div>
            </form>
          )}
        </section>
      </div>
    </PublicLayout>
  );
}

function Message({
  ok,
  eyebrow,
  title,
  body,
  banner,
  actions,
}: {
  ok?: boolean;
  eyebrow: string;
  title: string;
  body?: string;
  banner?: string;
  actions: React.ReactNode;
}) {
  const Icon = ok ? CircleCheck : MailX;
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span
        className={`inline-flex size-12 items-center justify-center rounded-full ${ok ? 'bg-plus/10 text-plus' : 'bg-minus/10 text-minus'}`}
      >
        <Icon size={22} aria-hidden="true" />
      </span>
      <div>
        <p className={EYEBROW}>{eyebrow}</p>
        <Heading as="h1" id="rsvp-title" size="lg" className="mt-2 max-md:text-[1.6rem] md:text-[1.7rem]">
          {title}
        </Heading>
        {body && <p className="mt-2 text-sm text-muted">{body}</p>}
      </div>
      {banner && <Banner tone="warn">{banner}</Banner>}
      {actions && <div className="flex w-full flex-col gap-2">{actions}</div>}
    </div>
  );
}
