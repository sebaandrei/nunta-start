import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Invitation, type Member, manageableRoles, type Role, withRole } from '../domain/members';
import { useT } from '../i18n';
import { type MembersClient, MembersNotConfiguredError, notConfiguredMembersClient } from '../lib/members';
import { createFakeMembersClient, parseMembersPreview } from '../lib/membersPreview';
import { showToast } from '../lib/toast';
import { InviteForm } from './members/InviteForm';
import { MemberRow } from './members/MemberRow';
import { PendingInvites } from './members/PendingInvites';
import { RoleLegend } from './members/RoleLegend';
import { Banner, Button, Card, Dialog, Heading, Tag } from './ui';

/** Previzualizarea cu date de probă: doar în dev; în producție ramura e eliminată la build. */
function previewClient(): MembersClient | null {
  if (!import.meta.env.DEV) return null;
  const preview = parseMembersPreview(window.location.search);
  return preview ? createFakeMembersClient(preview.selfRole) : null;
}

type Status = 'loading' | 'ready' | 'unavailable' | 'error';
type Confirm = { kind: 'remove'; member: Member } | { kind: 'leave' };

export function MembersPanel({
  selfName,
  client: clientProp,
}: {
  /** Numele utilizatorului curent din setările locale, folosit cât timp colaborarea nu e disponibilă. */
  selfName: string;
  client?: MembersClient;
}) {
  const t = useT();
  const m = t.members;
  const client = useMemo(() => clientProp ?? previewClient() ?? notConfiguredMembersClient, [clientProp]);
  const [status, setStatus] = useState<Status>('loading');
  const [loaded, setLoaded] = useState<{ members: Member[]; invitations: Invitation[] }>({
    members: [],
    invitations: [],
  });
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const loadId = useRef(0);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const load = useCallback(() => {
    const id = ++loadId.current;
    setStatus('loading');
    Promise.all([client.list(), client.listInvitations()]).then(
      ([members, invitations]) => {
        if (id !== loadId.current) return;
        setLoaded({ members, invitations });
        setStatus('ready');
      },
      (error: unknown) => {
        if (id !== loadId.current) return;
        setStatus(error instanceof MembersNotConfiguredError ? 'unavailable' : 'error');
      },
    );
  }, [client]);

  useEffect(() => {
    load();
    return () => {
      loadId.current++;
    };
  }, [load]);

  // Fără server, panoul arată structura designului cu utilizatorul curent ca singur proprietar.
  const self = useMemo<Member>(
    () => ({ id: 'self', name: selfName.trim() || m.youFallback, email: '', role: 'owner', isSelf: true }),
    [selfName, m.youFallback],
  );
  const members = status === 'unavailable' || status === 'error' ? [self] : loaded.members;
  const invitations = status === 'ready' ? loaded.invitations : [];
  const actor = members.find((x) => x.isSelf) ?? self;
  const roles = manageableRoles(actor);

  const setMembers = (update: (list: Member[]) => Member[]) => setLoaded((s) => ({ ...s, members: update(s.members) }));
  const setInvitations = (update: (list: Invitation[]) => Invitation[]) =>
    setLoaded((s) => ({ ...s, invitations: update(s.invitations) }));

  async function invite(email: string, role: Role): Promise<boolean> {
    try {
      const created = await client.invite(email, role);
      setInvitations((list) => [...list, created]);
      setAnnouncement(m.announce.invited(email));
      return true;
    } catch {
      showToast(m.errors.invite);
      return false;
    }
  }

  async function cancelInvite(inv: Invitation) {
    try {
      await client.cancelInvite(inv.id);
      setInvitations((list) => list.filter((i) => i.id !== inv.id));
      setAnnouncement(m.announce.cancelled(inv.email));
    } catch {
      showToast(m.errors.cancel);
    }
  }

  /** Optimist: rolul se schimbă imediat; dacă serverul refuză, revine la cel anterior. */
  async function changeRole(target: Member, role: Role) {
    const previous = target.role;
    setMembers((list) => withRole(list, target.id, role));
    try {
      await client.changeRole(target.id, role);
      setAnnouncement(m.announce.roleChanged(target.name, m.roles[role]));
    } catch {
      setMembers((list) => withRole(list, target.id, previous));
      showToast(m.errors.changeRole);
    }
  }

  async function confirmed(action: Confirm) {
    setConfirm(null);
    if (action.kind === 'remove') {
      try {
        await client.remove(action.member.id);
        setMembers((list) => list.filter((x) => x.id !== action.member.id));
        setAnnouncement(m.announce.removed(action.member.name));
        titleRef.current?.focus();
      } catch {
        showToast(m.errors.remove);
      }
      return;
    }
    try {
      await client.leave();
      setAnnouncement(m.announce.left);
      load();
    } catch {
      showToast(m.errors.leave);
    }
  }

  const unavailable = status === 'unavailable';
  return (
    <div className="mt-5 grid items-start gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <div className="flex items-start justify-between gap-3 p-5 md:p-6">
            <div className="min-w-0">
              <Heading size="md" id="members-title">
                <span ref={titleRef} tabIndex={-1} className="outline-none">
                  {m.title}
                </span>
              </Heading>
              <p className="mt-1 text-sm text-muted">{m.hint}</p>
            </div>
            <Tag>{m.count(members.length)}</Tag>
          </div>
          {unavailable && (
            <div className="px-5 pb-4 md:px-6">
              <Banner tone="info">{m.notAvailable}</Banner>
            </div>
          )}
          {status === 'error' && (
            <div className="px-5 pb-4 md:px-6">
              <Banner tone="warn">
                <span>{m.loadError}</span>
                <Button variant="ghost" onClick={load}>
                  {m.retry}
                </Button>
              </Banner>
            </div>
          )}
          {status === 'loading' ? (
            <p className="border-t border-line px-5 py-4 text-sm text-muted md:px-6">{m.loading}</p>
          ) : (
            <ul aria-labelledby="members-title" className="divide-y divide-line border-t border-line">
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  actor={actor}
                  members={members}
                  onChangeRole={changeRole}
                  onRemove={(target) => setConfirm({ kind: 'remove', member: target })}
                  onLeave={() => setConfirm({ kind: 'leave' })}
                />
              ))}
            </ul>
          )}
          {actor.role === 'owner' && status !== 'loading' && (
            <p className="border-t border-line px-5 py-3 text-xs text-muted md:px-6">{m.ownerHint}</p>
          )}
        </Card>
        <PendingInvites
          invitations={invitations}
          now={new Date()}
          canCancel={(inv) => roles.includes(inv.role)}
          onCancel={cancelInvite}
        />
      </div>
      <div className="space-y-5">
        <InviteForm
          roles={roles}
          members={members}
          pending={invitations}
          disabled={status !== 'ready'}
          onInvite={invite}
        />
        <RoleLegend />
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === 'remove' ? m.removeTitle(confirm.member.name) : m.leaveTitle}
        actions={
          <>
            <Button variant="ghost" autoFocus onClick={() => setConfirm(null)}>
              {m.cancel}
            </Button>
            <Button variant="dangerSolid" onClick={() => confirm && void confirmed(confirm)}>
              {confirm?.kind === 'remove' ? m.removeConfirm : m.leaveConfirm}
            </Button>
          </>
        }
      >
        {confirm?.kind === 'remove' ? m.removeBody : m.leaveBody}
      </Dialog>
    </div>
  );
}
