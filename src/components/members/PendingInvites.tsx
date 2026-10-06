import { Mail } from 'lucide-react';
import { type Invitation, invitationAge } from '../../domain/members';
import { useT } from '../../i18n';
import { Button, Card, Heading, Tag } from '../ui';

export function PendingInvites({
  invitations,
  canCancel,
  now,
  onCancel,
}: {
  invitations: Invitation[];
  canCancel: (invitation: Invitation) => boolean;
  now: Date;
  onCancel: (invitation: Invitation) => void;
}) {
  const t = useT();
  const m = t.members;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 p-5 md:p-6">
        <div className="min-w-0">
          <Heading size="md">{m.pendingTitle}</Heading>
          <p className="mt-1 text-sm text-muted">{m.pendingHint}</p>
        </div>
        <Tag>{m.pendingCount(invitations.length)}</Tag>
      </div>
      {invitations.length === 0 ? (
        <p className="border-t border-line px-5 py-4 text-sm text-muted md:px-6">{m.pendingEmpty}</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {invitations.map((inv) => {
            const { sentDays, expiresDays } = invitationAge(inv, now);
            return (
              <li key={inv.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 md:px-6">
                <span
                  aria-hidden="true"
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-line text-muted"
                >
                  <Mail size={18} />
                </span>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted">
                    {sentDays === 0 ? m.sentToday : m.sentDaysAgo(sentDays)} · {m.expiresIn(expiresDays)}
                  </p>
                </div>
                <div className="flex w-full items-center gap-2 pl-[52px] md:w-auto md:pl-0">
                  <Tag tone="soft">{m.roles[inv.role]}</Tag>
                  {canCancel(inv) && (
                    <Button variant="ghost" aria-label={m.cancelInviteFor(inv.email)} onClick={() => onCancel(inv)}>
                      {m.cancelInvite}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
