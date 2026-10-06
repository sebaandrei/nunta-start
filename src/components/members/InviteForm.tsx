import { Loader2, Send } from 'lucide-react';
import { type FormEvent, useId, useState } from 'react';
import { type Invitation, type InviteIssue, type Member, type Role, validateInvite } from '../../domain/members';
import { useT } from '../../i18n';
import { Button, Card, Field, Heading, Select, TextInput } from '../ui';

export function InviteForm({
  roles,
  members,
  pending,
  disabled,
  onInvite,
}: {
  roles: Role[];
  members: Member[];
  pending: Invitation[];
  disabled: boolean;
  /** Rezolvă `true` dacă invitația a fost trimisă (câmpul se golește), `false` dacă a eșuat. */
  onInvite: (email: string, role: Role) => Promise<boolean>;
}) {
  const t = useT();
  const m = t.members;
  const errorId = useId();
  const [email, setEmail] = useState('');
  const [chosen, setChosen] = useState<Role>('helper');
  const [issue, setIssue] = useState<InviteIssue | null>(null);
  const [sending, setSending] = useState(false);
  const role = roles.includes(chosen) ? chosen : roles[0];
  const off = disabled || roles.length === 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (off || sending || !role) return;
    const problem = validateInvite(email, members, pending);
    setIssue(problem);
    if (problem) return;
    setSending(true);
    const sent = await onInvite(email.trim(), role);
    setSending(false);
    if (sent) setEmail('');
  }

  return (
    <Card className="p-5 md:p-6">
      <Heading size="md">{m.inviteTitle}</Heading>
      <p className="mt-1 text-sm text-muted">{m.inviteHint}</p>
      <form noValidate onSubmit={submit} className="mt-5 space-y-4">
        <Field label={m.emailLabel}>
          <TextInput
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            disabled={off}
            placeholder={m.emailPlaceholder}
            aria-invalid={issue !== null}
            aria-describedby={issue ? errorId : undefined}
            onChange={(e) => {
              setEmail(e.target.value);
              setIssue(null);
            }}
          />
        </Field>
        {issue && (
          <p id={errorId} role="alert" className="-mt-2 text-xs text-minus">
            {m.emailErrors[issue]}
          </p>
        )}
        <Field label={m.roleLabel}>
          <Select value={role ?? ''} disabled={off} onChange={(e) => setChosen(e.target.value as Role)}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {m.roles[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" className="w-full" disabled={off || sending}>
          {sending ? (
            <Loader2 size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Send size={16} aria-hidden="true" />
          )}
          {sending ? m.sending : m.send}
        </Button>
      </form>
    </Card>
  );
}
