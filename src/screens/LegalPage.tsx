import { useEffect } from 'react';
import { PublicLayout } from '../components/PublicLayout';
import { Banner, cx, Heading } from '../components/ui';
import { LEGAL_UPDATED } from '../content/legal/contact';
import { legalEn } from '../content/legal/en';
import { legalRo } from '../content/legal/ro';
import type { LegalContent } from '../content/legal/types';
import { useT } from '../i18n';
import { useLocale } from '../lib/locale';

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const CONTENT = { ro: legalRo, en: legalEn };

/** Cât timp o pagină e montată, cere motoarelor de căutare să n-o indexeze (textele sunt proiecte). */
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.append(meta);
    return () => meta.remove();
  }, []);
}

/** Pagină juridică publică: titlu, data, cuprins (desktop) și secțiuni, dintr-un fișier de conținut. */
export function LegalPage({ doc }: { doc: keyof LegalContent }) {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  useNoIndex();

  const sections = CONTENT[locale][doc];
  const title = doc === 'privacy' ? t.legal.privacyTitle : t.legal.termsTitle;
  const intro = doc === 'privacy' ? t.legal.privacyIntro : t.legal.termsIntro;
  const updated = new Date(LEGAL_UPDATED).toLocaleDateString(locale === 'ro' ? 'ro-RO' : 'en-GB', {
    dateStyle: 'long',
    timeZone: 'UTC',
  });

  useEffect(() => {
    document.title = `${title} · ${t.appName}`;
  }, [title, t.appName]);

  return (
    <PublicLayout>
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-8 md:px-8 md:py-12 lg:grid-cols-[14rem_minmax(0,45rem)] lg:justify-center">
        <nav aria-label={t.legal.toc} className="hidden lg:block">
          <div className="sticky top-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{t.legal.toc}</p>
            <ol className="mt-3 space-y-1 text-sm">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={cx(
                      'flex min-h-9 items-center gap-2 rounded-lg px-2 text-muted hover:text-ink hover:underline',
                      FOCUS_RING,
                    )}
                  >
                    <span className="tabular-nums text-faint">{i + 1}.</span>
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <article className="min-w-0">
          <Banner tone="warn" className="mb-8">
            <span>{t.legal.draft}</span>
          </Banner>
          <Heading as="h1" size="lg" className="text-balance text-[2rem] md:text-[2.5rem]">
            {title}
          </Heading>
          <p className="mt-2 text-sm text-muted">
            {t.legal.updated}: {updated}
          </p>
          <p className="mt-4 text-base leading-relaxed">{intro}</p>
          <div className="mt-8 space-y-8">
            {sections.map((s, i) => (
              <section key={s.id} aria-labelledby={`legal-${s.id}`} id={s.id} className="scroll-mt-6">
                <Heading as="h2" id={`legal-${s.id}`}>
                  {i + 1}. {s.heading}
                </Heading>
                {s.paragraphs.map((p) => (
                  <p key={p} className="mt-3 break-words text-[15px] leading-relaxed text-ink/90">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </article>
      </div>
    </PublicLayout>
  );
}
