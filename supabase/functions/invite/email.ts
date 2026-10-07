// The invitation email. Plain TypeScript with no Deno APIs, so Vitest can import it.

export type EmailLocale = 'ro' | 'en';

export interface InviteEmailInput {
  locale: EmailLocale;
  inviterName: string;
  weddingName: string;
  role: string;
  link: string;
  days: number;
}

const ROLES: Record<EmailLocale, Record<string, string>> = {
  ro: { partner: 'Partener', planner: 'Planner', helper: 'Ajutor', viewer: 'Cititor' },
  en: { partner: 'Partner', planner: 'Planner', helper: 'Helper', viewer: 'Viewer' },
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function parseEmailLocale(raw: unknown): EmailLocale {
  return raw === 'en' ? 'en' : 'ro';
}

export function inviteEmail(input: InviteEmailInput): { subject: string; html: string; text: string } {
  const { locale, link, days } = input;
  const inviter = input.inviterName.trim() || (locale === 'ro' ? 'Cineva' : 'Someone');
  const role = ROLES[locale][input.role] ?? input.role;
  const copy =
    locale === 'ro'
      ? {
          subject: `${inviter} v-a invitat în „${input.weddingName}"`,
          lead: `${inviter} v-a invitat să planificați împreună nunta „${input.weddingName}", cu rolul ${role}.`,
          cta: 'Deschide invitația',
          note: `Linkul este valabil ${days} de zile și poate fi folosit o singură dată. Dacă nu vă așteptați la această invitație, ignorați mesajul.`,
        }
      : {
          subject: `${inviter} invited you to "${input.weddingName}"`,
          lead: `${inviter} invited you to plan the wedding "${input.weddingName}" together, as ${role}.`,
          cta: 'Open the invitation',
          note: `The link is valid for ${days} days and works once. If you weren't expecting this invitation, you can ignore this message.`,
        };
  const text = `${copy.lead}\n\n${copy.cta}: ${link}\n\n${copy.note}\n`;
  const html = `<p>${escapeHtml(copy.lead)}</p>
<p><a href="${escapeHtml(link)}">${escapeHtml(copy.cta)}</a></p>
<p style="color:#666;font-size:13px">${escapeHtml(copy.note)}</p>`;
  return { subject: copy.subject, html, text };
}
