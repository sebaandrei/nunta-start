import type { ReactNode } from 'react';
import { useT } from '../i18n';
import { Skeleton } from './ui';

/** Învelișul comun: un singur anunț pentru cititoarele de ecran, blocurile sunt ascunse. */
function Loading({ children, className }: { children: ReactNode; className?: string }) {
  const t = useT();
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{t.loading}</span>
      {children}
    </div>
  );
}

/** Ecranul Acasă în așteptare: titlu, banda cu numărătoarea inversă, trei cifre și lista. */
export function HomeSkeleton() {
  return (
    <Loading className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4 max-w-sm" />
        <Skeleton className="h-4 w-1/2 max-w-xs" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <ListRows rows={4} />
    </Loading>
  );
}

/** O listă în așteptare (sarcini, buget). */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Loading>
      <ListRows rows={rows} />
    </Loading>
  );
}

function ListRows({ rows }: { rows: number }) {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
      {Array.from({ length: rows }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
        <div key={i} className="flex items-center gap-3 p-4">
          <Skeleton className="size-5 shrink-0 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

/** Căderea implicită a router-ului cât se încarcă o rută: centrată, fără meniu. */
export function PendingPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
      <ListSkeleton />
    </div>
  );
}
