import { ROLES } from '../../domain/members';
import { useT } from '../../i18n';
import { Card, Heading } from '../ui';

export function RoleLegend() {
  const m = useT().members;
  return (
    <Card className="p-5 md:p-6">
      <Heading size="sm">{m.legendTitle}</Heading>
      <dl className="mt-4 space-y-3">
        {ROLES.map((role) => (
          <div key={role}>
            <dt className="text-sm font-medium">{m.roles[role]}</dt>
            <dd className="text-xs text-muted">{m.roleHints[role]}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
