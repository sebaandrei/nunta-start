import { Link } from '@tanstack/react-router';
import { ChevronRight, Heart, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LINK_BUTTON_PRIMARY, LINK_FOCUS, PublicShell } from '../components/PublicShell';
import { SignOutIconButton } from '../components/ShellControls';
import { Banner, Button, EmptyState, Heading } from '../components/ui';
import { weddingsClient } from '../data/workspacesClient';
import { useT } from '../i18n';
import { paths, routes } from '../lib/paths';
import { dateAndCity, roleLabel, type Workspace, type WorkspacesClient, workspaceInitials } from '../lib/workspaces';

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; list: Workspace[] };

const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-muted';
const CARD =
  'group flex min-h-16 w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left shadow-sm transition-colors hover:bg-sunken md:gap-4';

function PulseRow() {
  return <div className="h-[4.5rem] animate-pulse rounded-2xl bg-sunken motion-reduce:animate-none" />;
}

/** Rolul ca text (nu doar culoare). */
function RoleBadge({ role }: { role: Workspace['role'] }) {
  const t = useT();
  return (
    <span className="whitespace-nowrap rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-ink">
      <span className="sr-only">{t.workspaces.roleLabel}: </span>
      {roleLabel(role, t)}
    </span>
  );
}

function WorkspaceCard({ ws }: { ws: Workspace }) {
  const t = useT();
  const name = ws.name || t.workspaces.unnamed;
  const meta = dateAndCity(ws.date, ws.city);
  return (
    <Link
      to={routes.home}
      params={{ weddingId: ws.id }}
      aria-label={t.workspaces.open(name)}
      className={`${CARD} ${LINK_FOCUS}`}
    >
      <span
        aria-hidden="true"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-warm text-[13px] font-semibold text-ink"
      >
        {workspaceInitials(name) || <Heart size={16} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">{name}</span>
        {meta && <span className="mt-0.5 block text-[13px] text-muted">{meta}</span>}
      </span>
      <RoleBadge role={ws.role} />
      <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-muted" />
    </Link>
  );
}

export function Workspaces({ client = weddingsClient }: { client?: WorkspacesClient }) {
  const t = useT();
  const w = t.workspaces;
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` repornește încărcarea la „Încercați din nou".
  useEffect(() => {
    let current = true;
    setLoad({ status: 'loading' });
    client.list().then(
      (list) => current && setLoad({ status: 'ready', list }),
      () => current && setLoad({ status: 'error' }),
    );
    return () => {
      current = false;
    };
  }, [client, attempt]);

  const list = load.status === 'ready' ? load.list : [];
  const announce = load.status === 'loading' ? w.loading : '';

  return (
    <PublicShell headerAction={<SignOutIconButton />}>
      <div className="w-full max-w-[34rem]">
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
        <p className={EYEBROW}>{w.eyebrow}</p>
        <Heading as="h1" size="lg" className="mt-2 md:text-[2rem]">
          {w.title}
        </Heading>
        <p className="mt-2 text-sm text-muted">{w.lead}</p>

        <div className="mt-6" aria-busy={load.status === 'loading'}>
          {load.status === 'loading' && (
            <div className="flex flex-col gap-3" aria-hidden="true">
              <PulseRow />
              <PulseRow />
            </div>
          )}

          {load.status === 'error' && (
            <Banner tone="warn">
              <span>{w.loadError}</span>
              <Button variant="ghost" onClick={() => setAttempt((n) => n + 1)}>
                {w.retry}
              </Button>
            </Banner>
          )}

          {load.status === 'ready' && list.length === 0 && (
            <EmptyState
              icon={Heart}
              title={w.emptyTitle}
              action={
                <Link to={paths.newWedding} className={LINK_BUTTON_PRIMARY}>
                  <Plus size={16} aria-hidden="true" />
                  {w.createTitle}
                </Link>
              }
            >
              {w.emptyBody}
            </EmptyState>
          )}

          {load.status === 'ready' && list.length > 0 && (
            <>
              <ul aria-label={w.listLabel} className="flex flex-col gap-3">
                {list.map((ws) => (
                  <li key={ws.id}>
                    <WorkspaceCard ws={ws} />
                  </li>
                ))}
              </ul>
              <Link
                to={paths.newWedding}
                aria-describedby="workspaces-create-note"
                className={`mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-sunken ${LINK_FOCUS}`}
              >
                <Plus size={16} aria-hidden="true" />
                {w.createTitle}
              </Link>
              <p id="workspaces-create-note" className="mt-2 text-center text-xs text-muted">
                {w.createExistingNote}
              </p>
            </>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
