import { LogOut, Trash2 } from 'lucide-react';
import { canLeave, canRemove, initials, type Member, manageableRoles, type Role } from '../../domain/members';
import { useT } from '../../i18n';
import { Button, IconButton, Select, Tag } from '../ui';

export function MemberRow({
  member,
  actor,
  members,
  busy,
  onChangeRole,
  onRemove,
  onLeave,
}: {
  member: Member;
  actor: Member;
  members: Member[];
  /** Un schimb de rol pentru acest membru e în curs: selectul rămâne vizibil, dar blocat. */
  busy: boolean;
  onChangeRole: (member: Member, role: Role) => void;
  onRemove: (member: Member) => void;
  onLeave: () => void;
}) {
  const t = useT();
  const m = t.members;
  const editable = canRemove(actor, member);
  const leavable = member.isSelf && canLeave(member, members);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 md:px-6">
      <span
        aria-hidden="true"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-warm text-sm font-semibold text-warm-ink"
      >
        {initials(member.name)}
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <span className="truncate">{member.name}</span>
          {member.isSelf && <Tag tone="soft">{m.you}</Tag>}
        </p>
        {member.email && <p className="truncate text-xs text-muted">{member.email}</p>}
      </div>
      <div className="flex w-full items-center gap-2 pl-[52px] md:w-auto md:pl-0">
        {editable ? (
          <>
            <Select
              aria-label={m.roleFor(member.name)}
              className="min-w-0 flex-1 md:w-36 md:flex-none"
              value={member.role}
              disabled={busy}
              aria-busy={busy}
              onChange={(e) => onChangeRole(member, e.target.value as Role)}
            >
              {manageableRoles(actor).map((role) => (
                <option key={role} value={role}>
                  {m.roles[role]}
                </option>
              ))}
            </Select>
            <IconButton label={m.removeMember(member.name)} onClick={() => onRemove(member)}>
              <Trash2 size={18} aria-hidden="true" />
            </IconButton>
          </>
        ) : (
          <>
            <Tag tone="soft">{m.roles[member.role]}</Tag>
            {leavable && (
              <Button variant="ghost" onClick={onLeave}>
                <LogOut size={16} aria-hidden="true" />
                {m.leave}
              </Button>
            )}
          </>
        )}
      </div>
    </li>
  );
}
