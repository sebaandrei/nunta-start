import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { ImportButton } from '../components/ImportButton';
import { Banner, Button, Card, cx, Heading, Segmented, TextInput } from '../components/ui';
import { parseISODate } from '../domain/dates';
import {
  fieldIds,
  firstInvalidStep,
  nextStep,
  type OnboardingErrors,
  type OnboardingField,
  type OnboardingValues,
  prevStep,
  STEPS,
  type StepId,
  stepIndex,
  summarize,
  toStartInput,
  validateStep,
} from '../domain/onboardingSteps';
import { useT } from '../i18n';
import { downloadText } from '../lib/download';
import { formatLongDate, formatNumber } from '../lib/format';
import { useLocale } from '../lib/locale';
import type { BackupError } from '../storage/storage';
import { useStore } from '../store';

const FIELD_IDS = {
  name1: 'onb-name1',
  name2: 'onb-name2',
  date: 'onb-date',
  guests: 'onb-guests',
} as const;

/** Etichetă, câmp și eroare legate între ele (aria-invalid, aria-describedby). */
function FormField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode;
}) {
  const ids = fieldIds(id);
  const describedBy = [error ? ids.error : null, hint ? ids.hint : null].filter(Boolean).join(' ');
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-ink">
        {label}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy || undefined })}
      {error && (
        <p id={ids.error} className="mt-1 text-xs text-minus">
          {error}
        </p>
      )}
      {hint && (
        <p id={ids.hint} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

function Stepper({ current, labels, label }: { current: StepId; labels: readonly string[]; label: string }) {
  const index = stepIndex(current);
  return (
    <ol aria-label={label} className="flex items-start">
      {STEPS.map((step, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <li
            key={step}
            aria-current={active ? 'step' : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
          >
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cx(
                  'absolute right-1/2 top-4 -z-0 h-0.5 w-full -translate-y-1/2',
                  i <= index ? 'bg-accent' : 'bg-line',
                )}
              />
            )}
            <span
              className={cx(
                'relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-sm font-semibold',
                done && 'border-accent bg-accent text-accent-ink',
                active && 'border-accent bg-surface text-ink',
                !done && !active && 'border-line bg-sunken text-muted',
              )}
            >
              {done ? <Check aria-hidden="true" className="size-4" /> : i + 1}
            </span>
            <span className={cx('text-xs sm:text-[13px]', active ? 'font-semibold text-ink' : 'text-muted')}>
              {labels[i]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function Onboarding() {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const start = useStore((s) => s.start);
  const corruptRaw = useStore((s) => s.corruptRaw);
  const [step, setStep] = useState<StepId>('about');
  const [values, setValues] = useState<OnboardingValues>({ name1: '', name2: '', date: '', city: '', guests: '' });
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const [importError, setImportError] = useState<BackupError | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the focus must move whenever the step changes.
  useEffect(() => {
    if (mounted.current) headingRef.current?.focus();
    mounted.current = true;
  }, [step]);

  const index = stepIndex(step);
  const ob = t.onboarding;
  const err = (field: OnboardingField) => (errors[field] ? ob.errors[errors[field]] : undefined);
  const set = (patch: Partial<OnboardingValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([field]) => !(field in patch))));
  };

  function go(to: StepId) {
    setErrors({});
    setStep(to);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (step === 'done') {
      const bad = firstInvalidStep(values);
      if (bad) return go(bad);
      start(toStartInput(values));
      return;
    }
    const found = validateStep(step, values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const first = (['name1', 'name2', 'date', 'guests'] as const).find((f) => found[f]);
      if (first) document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }
    go(nextStep(step));
  }

  const summary = summarize(values);
  const summaryRows: [string, string][] = [
    [ob.summaryNames, summary.names],
    [ob.summaryDate, formatLongDate(parseISODate(summary.date), locale)],
    [ob.summaryCity, summary.city ?? ob.notSet],
    [ob.summaryGuests, summary.guests === null ? ob.notSet : formatNumber(summary.guests, locale)],
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <p className="flex items-center gap-2.5 font-semibold text-ink">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-lg bg-accent font-serif text-accent-ink"
          >
            N
          </span>
          {t.appName}
        </p>
        <Segmented
          label={t.settings.language}
          value={locale}
          onChange={setLocale}
          options={[
            { value: 'ro', label: 'Română' },
            { value: 'en', label: 'English' },
          ]}
        />
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 pb-10 sm:py-6">
        {corruptRaw && (
          <Banner tone="warn">
            <span>{ob.corrupt}</span>
            <Button variant="ghost" onClick={() => downloadText('nunta-start-date-vechi.json', corruptRaw)}>
              {ob.corruptDownload}
            </Button>
          </Banner>
        )}

        <Card className="p-5 sm:p-8">
          <Stepper current={step} labels={ob.steps} label={ob.stepper} />
          <form noValidate onSubmit={submit} className="mt-7">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {ob.stepOf(index + 1, STEPS.length)}
            </p>
            <Heading as="h1" size="lg" className="mt-1 outline-none">
              <span ref={headingRef} tabIndex={-1} className="outline-none">
                {ob.stepTitles[index]}
              </span>
            </Heading>
            <p className="mt-2 text-sm leading-relaxed text-muted">{ob.stepIntros[index]}</p>

            <div className="mt-6 space-y-4">
              {step === 'about' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField id="onb-name1" label={`${ob.names} 1`} error={err('name1')}>
                    {(p) => (
                      <TextInput
                        {...p}
                        autoComplete="off"
                        placeholder={ob.namePlaceholder1}
                        value={values.name1}
                        onChange={(e) => set({ name1: e.target.value })}
                      />
                    )}
                  </FormField>
                  <FormField id="onb-name2" label={`${ob.names} 2`} error={err('name2')}>
                    {(p) => (
                      <TextInput
                        {...p}
                        autoComplete="off"
                        placeholder={ob.namePlaceholder2}
                        value={values.name2}
                        onChange={(e) => set({ name2: e.target.value })}
                      />
                    )}
                  </FormField>
                </div>
              )}

              {step === 'wedding' && (
                <>
                  <FormField id="onb-date" label={ob.date} hint={ob.dateHint} error={err('date')}>
                    {(p) => (
                      <TextInput
                        {...p}
                        type="date"
                        value={values.date}
                        onChange={(e) => set({ date: e.target.value })}
                      />
                    )}
                  </FormField>
                  <FormField id="onb-city" label={ob.city}>
                    {(p) => (
                      <TextInput
                        {...p}
                        autoComplete="off"
                        placeholder={ob.cityPlaceholder}
                        value={values.city}
                        onChange={(e) => set({ city: e.target.value })}
                      />
                    )}
                  </FormField>
                  <FormField id="onb-guests" label={ob.guestsLabel} hint={ob.guestsShort} error={err('guests')}>
                    {(p) => (
                      <TextInput
                        {...p}
                        inputMode="numeric"
                        autoComplete="off"
                        value={values.guests}
                        onChange={(e) => set({ guests: e.target.value })}
                        placeholder={ob.guestsPlaceholder}
                      />
                    )}
                  </FormField>
                </>
              )}

              {step === 'done' && (
                <dl className="divide-y divide-line rounded-xl border border-line">
                  {summaryRows.map(([label, value]) => (
                    <div key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 px-4 py-3 text-sm">
                      <dt className="text-muted">{label}</dt>
                      <dd className="min-w-0 break-words font-medium text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            <div className="mt-7 flex items-center justify-between gap-3">
              {index > 0 ? (
                <Button variant="secondary" onClick={() => go(prevStep(step))}>
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  {ob.back}
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit">
                {step === 'done' ? ob.create : ob.next}
                {step !== 'done' && <ArrowRight aria-hidden="true" className="size-4" />}
              </Button>
            </div>
          </form>
        </Card>

        <div className="flex flex-col items-center gap-2 text-center">
          <ImportButton onError={setImportError}>{ob.import}</ImportButton>
          {importError && <p className="text-sm text-minus">{t.backupErrors[importError]}</p>}
        </div>
      </main>
    </div>
  );
}
