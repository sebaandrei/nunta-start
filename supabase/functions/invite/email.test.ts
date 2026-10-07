import { describe, expect, it } from 'vitest';
import { escapeHtml, inviteEmail, parseEmailLocale } from './email';

const base = {
  inviterName: 'Ana',
  weddingName: 'Ana & Mihai',
  role: 'planner',
  link: 'https://x.ro/invite/abc',
  days: 14,
};

describe('inviteEmail', () => {
  it('writes the Romanian email with the link in both parts', () => {
    const mail = inviteEmail({ ...base, locale: 'ro' });
    expect(mail.subject).toContain('Ana');
    expect(mail.text).toContain('https://x.ro/invite/abc');
    expect(mail.html).toContain('href="https://x.ro/invite/abc"');
    expect(mail.text).toContain('Planner');
    expect(mail.text).toContain('14 de zile');
  });

  it('writes the English email', () => {
    const mail = inviteEmail({ ...base, locale: 'en', role: 'viewer' });
    expect(mail.subject).toBe('Ana invited you to "Ana & Mihai"');
    expect(mail.text).toContain('as Viewer');
  });

  it('escapes names in the HTML so a wedding name cannot inject markup', () => {
    const mail = inviteEmail({ ...base, locale: 'en', weddingName: '<script>alert(1)</script>' });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
  });

  it('does not break on an empty inviter name', () => {
    expect(inviteEmail({ ...base, locale: 'ro', inviterName: '  ' }).subject).toContain('Cineva');
  });
});

describe('helpers', () => {
  it('escapes the five HTML characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });

  it('defaults an unknown locale to Romanian', () => {
    expect(parseEmailLocale('fr')).toBe('ro');
    expect(parseEmailLocale('en')).toBe('en');
  });
});
