import { Link } from '@tanstack/react-router';
import { type ReactNode, useEffect } from 'react';
import { PublicLayout } from '../components/PublicLayout';
import { Button, cx, Heading } from '../components/ui';
import { useT } from '../i18n';
import { paths } from '../lib/paths';
import { pageTitle, useDocumentTitle } from '../lib/useDocumentTitle';
import { reportError } from '../observability';

const LINK_BUTTON =
  'inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function StatePage({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <PublicLayout nav={false}>
      <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 py-16 md:px-8 md:py-24">
        {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{eyebrow}</p>}
        <Heading as="h1" size="lg" className="text-balance text-[2rem] md:text-[2.5rem]">
          {title}
        </Heading>
        <p className="text-base leading-relaxed text-muted">{body}</p>
        <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">{children}</div>
      </div>
    </PublicLayout>
  );
}

/** `errorComponent` al router-ului: mesaj prietenos, raportare la Faro, reîncărcare și întoarcere acasă. */
export function RouteError({ error }: { error: unknown }) {
  const t = useT();
  useEffect(() => reportError(error), [error]);
  useDocumentTitle(pageTitle(t.errors.page.title, t.appName));
  return (
    <StatePage title={t.errors.page.title} body={t.errors.page.body}>
      <Button className="px-5 text-sm font-semibold md:min-h-11" onClick={() => window.location.reload()}>
        {t.errors.page.reload}
      </Button>
      {/* Navigare completă: pornește aplicația de la zero, fără starea care a stricat ruta. */}
      <a href="/" className={cx(LINK_BUTTON, 'border border-line bg-surface text-ink hover:bg-sunken')}>
        {t.errors.page.home}
      </a>
    </StatePage>
  );
}

/** `notFoundComponent` din ruta rădăcină: adrese necunoscute. */
export function NotFound() {
  const t = useT();
  useDocumentTitle(pageTitle(t.errors.notFound.title, t.appName));
  return (
    <StatePage eyebrow={t.errors.notFound.code} title={t.errors.notFound.title} body={t.errors.notFound.body}>
      <Link to="/" className={cx(LINK_BUTTON, 'bg-accent text-accent-ink hover:opacity-90')}>
        {t.errors.notFound.home}
      </Link>
    </StatePage>
  );
}

/** Adresă de nuntă la care nu am acces (nu există sau nu sunt membru): același stil ca „nu a fost găsită". */
export function NoAccess() {
  const t = useT();
  useDocumentTitle(pageTitle(t.errors.noAccess.title, t.appName));
  return (
    <StatePage eyebrow={t.errors.noAccess.code} title={t.errors.noAccess.title} body={t.errors.noAccess.body}>
      <Link to={paths.workspaces} className={cx(LINK_BUTTON, 'bg-accent text-accent-ink hover:opacity-90')}>
        {t.errors.noAccess.picker}
      </Link>
    </StatePage>
  );
}
