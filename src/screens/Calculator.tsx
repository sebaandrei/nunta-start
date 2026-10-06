import { Plus, Wallet, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import {
  Banner,
  Button,
  Card,
  cx,
  EmptyState,
  Field,
  FieldGroup,
  Heading,
  type InputVariant,
  NumberInput,
  ProgressBar,
  Segmented,
  StatCard,
  TextInput,
} from '../components/ui';
import { useWeddingAppData } from '../data/hooks';
import {
  convert,
  hasAmounts,
  lineRemaining,
  lineTotal,
  type Rates,
  type ScenarioSummary,
  selectedGuests,
  summarizePayments,
  summarizeScenario,
} from '../domain/budget';
import { type BudgetLine, CURRENCIES, type Currency, type Money } from '../domain/schema';
import { useT } from '../i18n';
import { lineView } from '../lib/budgetView';
import { currencyOptions, currencySymbol, formatMoney, formatSignedMoney } from '../lib/format';
import { useLocale } from '../lib/locale';
import { useStore } from '../store';

export function Calculator() {
  const t = useT();
  // Citire de pe server; scrierile (NS-043) încă nu sunt gata, deci ecranul e doar pentru vizualizare.
  const data = useWeddingAppData();
  const { budget, settings } = data;
  const updateBudget = useStore((s) => s.updateBudget);
  const updateSettings = useStore((s) => s.updateSettings);
  const setScenario = useStore((s) => s.setScenario);
  const addScenario = useStore((s) => s.addScenario);
  const removeScenario = useStore((s) => s.removeScenario);
  const selectScenario = useStore((s) => s.selectScenario);
  const addLine = useStore((s) => s.addLine);
  const clearAmounts = useStore((s) => s.clearAmounts);

  const rates: Rates = { eurRate: settings.eurRate, currency: settings.displayCurrency };
  const guests = selectedGuests(budget);
  const summaries = budget.scenarios.map((g) => summarizeScenario(budget, g, rates));
  const payments = summarizePayments(budget, guests, rates);
  const giftMissing = budget.giftPerGuest.amount === null;

  const onAddLine = () => {
    const id = addLine();
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-line-name="${id}"]`)?.select());
  };

  return (
    <>
      <PageHeader
        title={t.pages.budget.title}
        subtitle={t.pages.budget.subtitle}
        action={
          <Button disabled onClick={onAddLine}>
            <Plus size={16} aria-hidden="true" />
            {t.calc.addExpense}
          </Button>
        }
      />
      <Banner className="mb-6">{t.readOnlySoon}</Banner>
      <fieldset disabled className="m-0 min-w-0 border-0 p-0">
        <div className="space-y-6 md:space-y-8">
          <Card className="grid gap-4 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-[1.3fr_1.3fr_1fr_auto]">
            <FieldGroup label={t.calc.scenarios} className="sm:col-span-2 lg:col-span-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {budget.scenarios.map((g, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: scenarios are plain numbers without ids until NS-029.
                  <div key={i} className="flex items-center">
                    <NumberInput
                      integer
                      min={1}
                      aria-label={`${t.calc.scenarios} ${i + 1}`}
                      className="w-[4.5rem] text-center"
                      value={g}
                      onChange={(v) => v !== null && setScenario(i, v)}
                    />
                    {budget.scenarios.length > 1 && (
                      <button
                        type="button"
                        title={t.calc.removeScenario}
                        aria-label={t.calc.removeScenario}
                        className="px-1 text-faint hover:text-minus"
                        onClick={() => removeScenario(i)}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
                {budget.scenarios.length < 4 && (
                  <Button
                    variant="ghost"
                    className="px-2.5"
                    title={t.calc.addScenario}
                    aria-label={t.calc.addScenario}
                    onClick={addScenario}
                  >
                    <Plus size={16} aria-hidden="true" />
                  </Button>
                )}
              </div>
            </FieldGroup>
            <MoneyField
              label={t.calc.gift}
              value={budget.giftPerGuest}
              onChange={(m) => updateBudget({ giftPerGuest: m })}
            />
            <MoneyField
              label={t.calc.family}
              value={budget.familyGift}
              onChange={(m) => updateBudget({ familyGift: m })}
            />
            <FieldGroup label={t.calc.rate}>
              <div className="flex items-center gap-1.5 text-sm text-muted">
                <span className="whitespace-nowrap">{t.calc.ratePrefix}</span>
                <NumberInput
                  aria-label={t.calc.rate}
                  min={0.01}
                  className="w-20"
                  value={settings.eurRate}
                  onChange={(v) => v !== null && v > 0 && updateSettings({ eurRate: v })}
                />
                <span>{currencySymbol('RON')}</span>
              </div>
            </FieldGroup>
            <FieldGroup label={t.calc.display}>
              <Segmented
                label={t.calc.display}
                value={settings.displayCurrency}
                onChange={(c) => updateSettings({ displayCurrency: c })}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              />
            </FieldGroup>
          </Card>

          {giftMissing && <p className="text-sm text-muted">{t.calc.giftMissing}</p>}

          {budget.lines.length === 0 ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <StatCard label={t.calc.costTotal} value={formatMoney(0, rates.currency)} />
                <StatCard label={t.calc.colPaid} value={formatMoney(0, rates.currency)} />
                <StatCard label={t.calc.estimatedBalance} value="—" />
              </div>
              <EmptyState
                icon={Wallet}
                title={t.calc.emptyTitle}
                className="py-12"
                action={
                  <Button onClick={onAddLine}>
                    <Plus size={16} aria-hidden="true" />
                    {t.calc.addExpense}
                  </Button>
                }
              >
                {t.calc.emptyText}
              </EmptyState>
            </>
          ) : (
            <>
              <section aria-label={t.calc.compareTitle} className="space-y-3">
                <div>
                  <Heading size="md">{t.calc.compareTitle}</Heading>
                  <p className="mt-1 text-sm text-muted">{t.calc.compareHint}</p>
                </div>
                {budget.scenarios.length > 1 && (
                  <Segmented
                    className="md:hidden"
                    label={t.calc.scenarios}
                    value={budget.selected}
                    onChange={selectScenario}
                    options={budget.scenarios.map((g, i) => ({ value: i, label: String(g) }))}
                  />
                )}
                <div className="grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
                  {summaries.map((s, i) => (
                    <ScenarioCard
                      // biome-ignore lint/suspicious/noArrayIndexKey: scenarios are plain numbers without ids until NS-029.
                      key={i}
                      summary={s}
                      currency={rates.currency}
                      selected={i === budget.selected}
                      giftMissing={giftMissing}
                      onSelect={() => selectScenario(i)}
                    />
                  ))}
                </div>
              </section>

              <section aria-label={t.calc.expensesTitle} className="space-y-3">
                <Heading size="md">{t.calc.expensesTitle}</Heading>
                <div className="space-y-1 text-sm leading-relaxed text-muted">
                  <p>
                    <span className="font-semibold text-ink">{t.calc.typesExplain.fixed}</span> ={' '}
                    {t.calc.typesExplain.fixedText}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">{t.calc.typesExplain.perGuest}</span> ={' '}
                    {t.calc.typesExplain.perGuestText}
                  </p>
                </div>
                <LinesTable
                  lines={budget.lines}
                  guests={guests}
                  rates={rates}
                  totals={payments}
                  onAddLine={onAddLine}
                />
                <LinesCards
                  lines={budget.lines}
                  guests={guests}
                  rates={rates}
                  totals={payments}
                  onAddLine={onAddLine}
                />
              </section>
            </>
          )}

          <div className="flex justify-end">
            <Button
              variant="danger"
              title={t.calc.clearAmountsHint}
              disabled={!hasAmounts(budget)}
              onClick={() => window.confirm(t.calc.confirmClearAmounts) && clearAmounts()}
            >
              {t.calc.clearAmounts}
            </Button>
          </div>
        </div>
      </fieldset>
    </>
  );
}

function MoneyField({ label, value, onChange }: { label: string; value: Money; onChange: (m: Money) => void }) {
  return (
    <FieldGroup label={label}>
      <div className="flex items-center gap-1.5">
        <NumberInput
          aria-label={label}
          min={0}
          value={value.amount}
          onChange={(amount) => onChange({ ...value, amount })}
        />
        <CurrencySwitch value={value.currency} onChange={(currency) => onChange({ ...value, currency })} />
      </div>
    </FieldGroup>
  );
}

function CurrencySwitch({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  return (
    <Segmented
      label={t.calc.currency}
      className="shrink-0"
      value={value}
      onChange={onChange}
      options={currencyOptions(CURRENCIES, locale)}
    />
  );
}

function ScenarioCard({
  summary,
  currency,
  selected,
  giftMissing,
  onSelect,
}: {
  summary: ScenarioSummary;
  currency: Currency;
  selected: boolean;
  giftMissing: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  const money = (v: number) => formatMoney(v, currency);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cx(
        'rounded-2xl border px-4 py-4 text-left transition-colors hover:border-accent/60 md:px-5',
        // Pe telefon cardul ales e „hero"; acolo cifra rămâne în culoarea textului (plus/minus nu au contrast pe hero).
        selected ? 'border-accent bg-hero ring-1 ring-accent md:bg-surface' : 'hidden border-line bg-surface md:block',
      )}
    >
      <p className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        <span>{t.calc.scenario(summary.guests)}</span>
        {selected && (
          <span className="rounded-md bg-soft px-1.5 py-0.5 text-[10px] tracking-wider text-ink">
            {t.calc.selected}
          </span>
        )}
      </p>
      {giftMissing ? (
        <p className="mt-2 font-serif text-[1.75rem] leading-tight tabular-nums">{money(summary.total)}</p>
      ) : (
        <p
          className={cx(
            'mt-2 font-serif text-[1.75rem] leading-tight tabular-nums text-ink',
            summary.balance >= 0 ? 'md:text-plus' : 'md:text-minus',
          )}
        >
          {formatSignedMoney(summary.balance, currency)}
        </p>
      )}
      <p className="mt-0.5 text-xs text-muted">{giftMissing ? t.calc.costTotal : t.calc.estimatedBalance}</p>
      <div className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-muted">
        {!giftMissing && (
          <p className="flex justify-between gap-2">
            <span className="font-semibold uppercase tracking-wider">{t.calc.costTotal}</span>
            <span className="font-semibold tabular-nums text-ink">{money(summary.total)}</span>
          </p>
        )}
        <p className="tabular-nums">
          {t.calc.perPerson(money(summary.perGuest))} · {t.calc.breakEven(money(summary.breakEvenGift))}
        </p>
      </div>
    </button>
  );
}

interface LinesProps {
  lines: BudgetLine[];
  guests: number;
  rates: Rates;
  totals: { total: number; paid: number; remaining: number };
  onAddLine: () => void;
}

function useLineActions() {
  const t = useT();
  const updateLine = useStore((s) => s.updateLine);
  const removeLine = useStore((s) => s.removeLine);
  return {
    update: (line: BudgetLine, patch: Partial<BudgetLine>) => updateLine(line.id, patch),
    remove: (line: BudgetLine) => {
      const hasValues = line.unitPrice !== null || line.paid !== null;
      if (!hasValues || window.confirm(t.calc.confirmRemoveLine(line.name))) removeLine(line.id);
    },
  };
}

function inDisplay(amount: number, line: BudgetLine, rates: Rates): string {
  return formatMoney(convert(amount, line.currency, rates.currency, rates.eurRate), rates.currency);
}

/** În tabel câmpurile sunt „inline" (arată ca text); pe telefon rămân câmpuri obișnuite. */
interface LineFieldProps {
  line: BudgetLine;
  variant: InputVariant;
}

function NameInputs({ line, variant }: LineFieldProps) {
  const t = useT();
  const { update } = useLineActions();
  const [noteOpen, setNoteOpen] = useState(false);
  const noteRef = useRef<HTMLInputElement>(null);
  // În tabel, observațiile apar doar dacă există sau dacă sunt deschise din „+ observații".
  const showNote = variant === 'box' || line.note !== '' || noteOpen;
  return (
    <div className="space-y-0.5">
      <div className="relative">
        <TextInput
          variant={variant}
          data-line-name={line.id}
          aria-label={t.calc.colLine}
          placeholder={t.calc.namePlaceholder}
          className="font-medium"
          value={line.name}
          onChange={(e) => update(line, { name: e.target.value })}
        />
        {!showNote && (
          <button
            type="button"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded bg-surface px-1.5 py-0.5 text-[11px] text-muted opacity-0 hover:text-ink focus:opacity-100 group-hover:opacity-100"
            onClick={() => {
              setNoteOpen(true);
              requestAnimationFrame(() => noteRef.current?.focus());
            }}
          >
            {t.calc.addNote}
          </button>
        )}
      </div>
      {showNote && (
        <input
          ref={noteRef}
          aria-label={t.calc.notePlaceholder}
          placeholder={t.calc.notePlaceholder}
          className="w-full rounded-md border border-transparent bg-transparent px-2 py-0.5 text-xs text-muted placeholder:text-faint hover:border-line focus:border-accent focus:bg-surface focus:text-ink focus:outline-none focus:ring-2 focus:ring-accent/20"
          value={line.note}
          onChange={(e) => update(line, { note: e.target.value })}
          onBlur={() => setNoteOpen(false)}
        />
      )}
    </div>
  );
}

/** Prețul; la liniile pe invitat scrie „/ invitat" lângă el. */
function PriceInputs({ line, variant }: LineFieldProps) {
  const t = useT();
  const { update } = useLineActions();
  return (
    <div className="flex items-center gap-1.5">
      <NumberInput
        variant={variant}
        aria-label={t.calc.colPrice}
        placeholder="—"
        min={0}
        className="min-w-0 flex-1 text-right"
        value={line.unitPrice}
        onChange={(unitPrice) => update(line, { unitPrice })}
      />
      <CurrencySwitch value={line.currency} onChange={(currency) => update(line, { currency })} />
      <span className="w-11 shrink-0 text-[11px] text-muted">
        {line.quantity.kind === 'perGuest' && t.calc.perGuestSuffix}
      </span>
    </div>
  );
}

/** Fix (cu câte bucăți, implicit 1) sau Pe invitat. */
function TypeInputs({ line, variant }: LineFieldProps) {
  const t = useT();
  const { update } = useLineActions();
  return (
    <div className="flex items-center gap-1.5">
      <Segmented
        label={t.calc.colType}
        className="shrink-0"
        value={line.quantity.kind}
        onChange={(kind) => {
          if (kind === line.quantity.kind) return;
          update(line, { quantity: kind === 'perGuest' ? { kind: 'perGuest' } : { kind: 'fixed', count: 1 } });
        }}
        options={[
          { value: 'fixed', label: t.calc.typeFixed },
          { value: 'perGuest', label: t.calc.typePerGuest },
        ]}
      />
      {line.quantity.kind === 'fixed' && (
        <>
          <span className="text-sm text-muted">×</span>
          <NumberInput
            variant={variant}
            aria-label={t.calc.count}
            title={t.calc.count}
            min={0}
            className="w-12 shrink-0 text-right"
            value={line.quantity.count}
            onChange={(count) => update(line, { quantity: { kind: 'fixed', count: count ?? 0 } })}
          />
        </>
      )}
    </div>
  );
}

function PaidInput({ line, variant }: LineFieldProps) {
  const t = useT();
  const { update } = useLineActions();
  return (
    <div className="flex items-center gap-1.5">
      <NumberInput
        variant={variant}
        aria-label={t.calc.colPaid}
        placeholder="—"
        min={0}
        className="min-w-0 flex-1 text-right"
        value={line.paid}
        onChange={(paid) => update(line, { paid })}
      />
      <span className="min-w-6 shrink-0 text-xs text-muted">{currencySymbol(line.currency)}</span>
    </div>
  );
}

function RemoveLineButton({ line, className }: { line: BudgetLine; className?: string }) {
  const t = useT();
  const { remove } = useLineActions();
  return (
    <button
      type="button"
      title={t.calc.removeLine}
      aria-label={t.calc.removeLine}
      className={cx('rounded-md px-2 py-1 text-faint hover:bg-sunken hover:text-minus', className)}
      onClick={() => remove(line)}
    >
      <X size={16} aria-hidden="true" />
    </button>
  );
}

function LinesTable({ lines, guests, rates, totals, onAddLine }: LinesProps) {
  const t = useT();
  const cur = rates.currency;
  const th = 'px-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted';
  return (
    <Card className="hidden md:block">
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <caption className="sr-only">{t.calc.expensesTitle}</caption>
          <thead className="bg-sunken/60 text-left">
            <tr>
              <th scope="col" className={cx(th, 'min-w-[9.5rem] px-3')}>
                {t.calc.colLine}
              </th>
              <th scope="col" className={cx(th, 'w-[11.5rem]')}>
                {t.calc.colType}
              </th>
              <th scope="col" className={cx(th, 'w-[14rem]')}>
                {t.calc.colPrice}
              </th>
              <th scope="col" className={cx(th, 'w-28 px-3 text-right')}>
                {t.calc.colTotal(guests)}
              </th>
              <th scope="col" className={cx(th, 'w-32 px-3 text-right')}>
                {t.calc.colPaid}
              </th>
              <th scope="col" className={cx(th, 'w-28 px-3 text-right')}>
                {t.calc.colRest}
              </th>
              <th scope="col" className="w-9">
                <span className="sr-only">{t.calc.removeLine}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="group border-t border-line align-top hover:bg-sunken/30">
                <th scope="row" className="px-1 py-1.5 text-left font-normal">
                  <NameInputs line={line} variant="inline" />
                </th>
                <td className="px-2 py-1.5">
                  <TypeInputs line={line} variant="inline" />
                </td>
                <td className="px-1 py-1.5">
                  <PriceInputs line={line} variant="inline" />
                </td>
                <td className="px-3 pb-1.5 pt-[11px] text-right tabular-nums">
                  {inDisplay(lineTotal(line, guests), line, rates)}
                </td>
                <td className="px-1 py-1.5">
                  <PaidInput line={line} variant="inline" />
                </td>
                <td className="px-3 pb-1.5 pt-[11px] text-right font-semibold tabular-nums">
                  {inDisplay(lineRemaining(line, guests), line, rates)}
                </td>
                <td className="py-1.5 pr-1 text-right">
                  {/* Ștergerea apare la hover pe rând (sau la focus cu tastatura). */}
                  <RemoveLineButton line={line} className="opacity-0 focus:opacity-100 group-hover:opacity-100" />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-sunken/60 font-semibold tabular-nums">
              <th
                scope="row"
                colSpan={3}
                className="px-3 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-muted"
              >
                {t.calc.totalEstimated}
              </th>
              <td className="px-3 py-3 text-right">{formatMoney(totals.total, cur)}</td>
              <td className="px-3 py-3 text-right">{formatMoney(totals.paid, cur)}</td>
              <td className="px-3 py-3 text-right">{formatMoney(totals.remaining, cur)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-3 py-3">
        <Button variant="ghost" onClick={onAddLine}>
          {t.calc.addLine}
        </Button>
        <p className="text-xs text-muted">{t.calc.emptyNote}</p>
      </div>
    </Card>
  );
}

function LinesCards({ lines, guests, rates, totals, onAddLine }: LinesProps) {
  const t = useT();
  const cur = rates.currency;
  return (
    <ul aria-label={t.calc.expenseList} className="space-y-3 md:hidden">
      {lines.map((line) => {
        const v = lineView(line, guests, rates);
        return (
          <li key={line.id}>
            <Card className="space-y-3 p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <NameInputs line={line} variant="box" />
                </div>
                <RemoveLineButton line={line} />
              </div>
              <p className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  {t.calc.colTotal(guests)}
                </span>
                <span className="font-semibold tabular-nums">{formatMoney(v.total, cur)}</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {/* FieldGroup, nu Field: un <label> în jurul switcherului ar apăsa „Fix" la click pe etichetă. */}
                <FieldGroup label={t.calc.colType} className="col-span-2">
                  <TypeInputs line={line} variant="box" />
                </FieldGroup>
                <Field label={t.calc.colPrice} className="col-span-2">
                  <PriceInputs line={line} variant="box" />
                </Field>
                <Field label={t.calc.colPaid} className="col-span-2">
                  <PaidInput line={line} variant="box" />
                </Field>
              </div>
              <ProgressBar value={v.paidRatio * 100} label={t.calc.paidAmount(formatMoney(v.paid, cur))} />
              <p className="flex justify-between gap-2 text-xs tabular-nums text-muted">
                <span>{t.calc.paidAmount(formatMoney(v.paid, cur))}</span>
                <span className="font-semibold text-ink">{t.calc.toPay(formatMoney(v.remaining, cur))}</span>
              </p>
            </Card>
          </li>
        );
      })}
      <li>
        <Button variant="ghost" className="w-full" onClick={onAddLine}>
          {t.calc.addLine}
        </Button>
      </li>
      <li>
        <Card tone="hero" className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{t.calc.totalEstimated}</p>
          <p className="mt-1 font-serif text-[1.75rem] leading-tight tabular-nums">{formatMoney(totals.total, cur)}</p>
          <p className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs tabular-nums text-muted">
            <span>{t.calc.paidAmount(formatMoney(totals.paid, cur))}</span>
            <span>{t.calc.toPay(formatMoney(totals.remaining, cur))}</span>
          </p>
          <p className="mt-2 text-xs text-muted">{t.calc.emptyNote}</p>
        </Card>
      </li>
    </ul>
  );
}
