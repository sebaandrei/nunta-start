import { useRef, useState } from 'react';
import {
  Button,
  Card,
  cx,
  Field,
  FieldGroup,
  NumberInput,
  Segmented,
  TextInput,
  type InputVariant,
} from '../components/ui';
import {
  convert,
  hasAmounts,
  lineRemaining,
  lineTotal,
  selectedGuests,
  summarizePayments,
  summarizeScenario,
  type Rates,
  type ScenarioSummary,
} from '../domain/budget';
import { CURRENCIES, type BudgetLine, type Currency, type Money } from '../domain/schema';
import { currencySymbol, formatMoney, formatSignedMoney } from '../lib/format';
import { useAppData, useStore } from '../store';
import { t } from '../text';

export function Calculator() {
  const data = useAppData();
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

  return (
    <div className="space-y-5">
      <Card className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <FieldGroup label={t.calc.scenarios}>
          <div className="flex flex-wrap items-center gap-1.5">
            {budget.scenarios.map((g, i) => (
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
                    ×
                  </button>
                )}
              </div>
            ))}
            {budget.scenarios.length < 4 && (
              <Button variant="ghost" className="px-2.5" title={t.calc.addScenario} aria-label={t.calc.addScenario} onClick={addScenario}>
                +
              </Button>
            )}
          </div>
        </FieldGroup>
        <MoneyField label={t.calc.gift} value={budget.giftPerGuest} onChange={(m) => updateBudget({ giftPerGuest: m })} />
        <MoneyField label={t.calc.family} value={budget.familyGift} onChange={(m) => updateBudget({ familyGift: m })} />
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
            <span>lei</span>
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

      {budget.scenarios.length > 1 && (
        <Segmented
          className="sm:hidden"
          label={t.calc.scenarios}
          value={budget.selected}
          onChange={selectScenario}
          options={budget.scenarios.map((g, i) => ({ value: i, label: String(g) }))}
        />
      )}
      <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
        {summaries.map((s, i) => (
          <ScenarioCard
            key={i}
            summary={s}
            currency={rates.currency}
            selected={i === budget.selected}
            giftMissing={giftMissing}
            onSelect={() => selectScenario(i)}
          />
        ))}
      </div>

      <div className="space-y-1 text-sm leading-relaxed text-muted">
        <p>
          <span className="font-semibold text-ink">{t.calc.typesExplain.fixed}</span> = {t.calc.typesExplain.fixedText}
        </p>
        <p>
          <span className="font-semibold text-ink">{t.calc.typesExplain.perGuest}</span> ={' '}
          {t.calc.typesExplain.perGuestText}
        </p>
      </div>

      <LinesTable lines={budget.lines} guests={guests} rates={rates} totals={payments} />
      <LinesCards lines={budget.lines} guests={guests} rates={rates} totals={payments} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            const id = addLine();
            requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-line-name="${id}"]`)?.select());
          }}
        >
          {t.calc.addLine}
        </Button>
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

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: currencySymbol(c) }));

function CurrencySwitch({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <Segmented label={t.calc.currency} className="shrink-0" value={value} onChange={onChange} options={CURRENCY_OPTIONS} />
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
  const money = (v: number) => formatMoney(v, currency);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cx(
        'rounded-xl border bg-surface px-4 py-3.5 text-left transition-colors hover:border-accent/60',
        selected ? 'border-2 border-accent' : 'hidden border-line sm:block',
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {t.calc.scenario(summary.guests)}
        {selected && ` · ${t.calc.selected}`}
      </p>
      {giftMissing ? (
        <p className="my-1 text-2xl font-semibold tabular-nums">{money(summary.total)}</p>
      ) : (
        <p className={cx('my-1 text-2xl font-semibold tabular-nums', summary.balance >= 0 ? 'text-plus' : 'text-minus')}>
          {formatSignedMoney(summary.balance, currency)}
        </p>
      )}
      <p className="text-xs leading-relaxed text-muted">
        {giftMissing
          ? t.calc.perGuest(money(summary.perGuest))
          : t.calc.totalAndPerGuest(money(summary.total), money(summary.perGuest))}
        <br />
        {t.calc.breakEven(money(summary.breakEvenGift))}
      </p>
    </button>
  );
}

interface LinesProps {
  lines: BudgetLine[];
  guests: number;
  rates: Rates;
  totals: { total: number; paid: number; remaining: number };
}

function useLineActions() {
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
      <span className="w-12 shrink-0 text-xs text-muted">
        {line.quantity.kind === 'perGuest' && t.calc.perGuestSuffix}
      </span>
    </div>
  );
}

const TYPE_OPTIONS: { value: BudgetLine['quantity']['kind']; label: string }[] = [
  { value: 'fixed', label: t.calc.typeFixed },
  { value: 'perGuest', label: t.calc.typePerGuest },
];

/** Fix (cu câte bucăți, implicit 1) sau Pe invitat. */
function TypeInputs({ line, variant }: LineFieldProps) {
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
        options={TYPE_OPTIONS}
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
      <span className="w-6 shrink-0 text-xs text-muted">{currencySymbol(line.currency)}</span>
    </div>
  );
}

function RemoveLineButton({ line, className }: { line: BudgetLine; className?: string }) {
  const { remove } = useLineActions();
  return (
    <button
      type="button"
      title={t.calc.removeLine}
      aria-label={t.calc.removeLine}
      className={cx('rounded-md px-2 py-1 text-faint hover:bg-sunken hover:text-minus', className)}
      onClick={() => remove(line)}
    >
      ×
    </button>
  );
}

function LinesTable({ lines, guests, rates, totals }: LinesProps) {
  const cur = rates.currency;
  return (
    <Card className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="bg-sunken/60 text-left text-[11px] uppercase tracking-wider text-muted">
          <tr>
            <th className="px-3 py-2 font-semibold">{t.calc.colLine}</th>
            <th className="w-[12.5rem] px-2 py-2 font-semibold">{t.calc.colType}</th>
            <th className="w-56 px-2 py-2 font-semibold">{t.calc.colPrice}</th>
            <th className="w-28 px-3 py-2 text-right font-semibold">{t.calc.colTotal(guests)}</th>
            <th className="w-32 px-3 py-2 text-right font-semibold">{t.calc.colPaid}</th>
            <th className="w-28 px-3 py-2 text-right font-semibold">{t.calc.colRest}</th>
            <th className="w-9" />
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="group border-t border-line align-top hover:bg-sunken/30">
              <td className="px-1 py-1.5">
                <NameInputs line={line} variant="inline" />
              </td>
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
              <td className="px-3 pb-1.5 pt-[11px] text-right tabular-nums">
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
            <td className="px-3 py-2.5">{t.calc.total}</td>
            <td />
            <td />
            <td className="px-3 py-2.5 text-right">{formatMoney(totals.total, cur)}</td>
            <td className="px-3 py-2.5 text-right">{formatMoney(totals.paid, cur)}</td>
            <td className="px-3 py-2.5 text-right">{formatMoney(totals.remaining, cur)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}

function LinesCards({ lines, guests, rates, totals }: LinesProps) {
  const cur = rates.currency;
  return (
    <div className="space-y-3 md:hidden">
      {lines.map((line) => (
        <Card key={line.id} className="space-y-3 p-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <NameInputs line={line} variant="box" />
            </div>
            <RemoveLineButton line={line} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* FieldGroup, nu Field: un <label> în jurul switcherului ar apăsa „Fix" la click pe etichetă. */}
            <FieldGroup label={t.calc.colType} className="col-span-2">
              <TypeInputs line={line} variant="box" />
            </FieldGroup>
            <Field label={t.calc.colPrice} className="col-span-2">
              <PriceInputs line={line} variant="box" />
            </Field>
            <Field label={t.calc.colPaid}>
              <PaidInput line={line} variant="box" />
            </Field>
            <div className="text-right text-xs leading-relaxed text-muted">
              <p>
                {t.calc.colTotal(guests)}:{' '}
                <span className="font-semibold text-ink">{inDisplay(lineTotal(line, guests), line, rates)}</span>
              </p>
              <p>
                {t.calc.colRest}: <span className="text-ink">{inDisplay(lineRemaining(line, guests), line, rates)}</span>
              </p>
            </div>
          </div>
        </Card>
      ))}
      <Card className="flex flex-wrap justify-between gap-2 bg-sunken/60 p-3 text-sm font-semibold tabular-nums">
        <span>
          {t.calc.total}: {formatMoney(totals.total, cur)}
        </span>
        <span className="text-muted">
          {t.calc.colPaid} {formatMoney(totals.paid, cur)} · {t.calc.colRest} {formatMoney(totals.remaining, cur)}
        </span>
      </Card>
    </div>
  );
}
