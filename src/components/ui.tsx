import {
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import type { Status } from '../domain/schema';
import { decimalDisplay, decimalText, parseDecimal } from '../lib/format';
import { t } from '../text';

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

const BUTTON_VARIANTS = {
  primary: 'bg-accent text-accent-ink hover:opacity-90',
  ghost: 'border border-line bg-surface text-ink hover:bg-sunken',
  danger: 'border border-line bg-surface text-minus hover:bg-sunken',
  link: 'px-0 py-0 text-accent underline-offset-2 hover:underline',
};

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_VARIANTS }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

const inputBase =
  'border text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20';

export type InputVariant = 'box' | 'inline';

const INPUT_VARIANTS: Record<InputVariant, string> = {
  box: 'rounded-lg border-line bg-surface px-2.5 py-1.5',
  /** Arată ca text; chenarul apare la hover și la editare. */
  inline: 'rounded-md border-transparent bg-transparent px-2 py-1 hover:border-line focus:bg-surface',
};

/** Câmpurile sunt pe toată lățimea, dacă nu primesc o lățime proprie (w-…). */
function inputClasses(className?: string, extra?: string, variant: InputVariant = 'box'): string {
  const hasWidth = /(^|\s)w-/.test(className ?? '');
  return cx(inputBase, INPUT_VARIANTS[variant], !hasWidth && 'w-full', extra, className);
}

export function TextInput({
  className,
  variant,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { variant?: InputVariant }) {
  return <input className={inputClasses(className, undefined, variant)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={inputClasses(className, 'resize-y leading-relaxed')} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputClasses(className, 'pr-7')} {...props} />;
}

/** Câmp numeric cu virgulă zecimală. Golul înseamnă null. Textul invalid nu modifică valoarea. */
export function NumberInput({
  value,
  onChange,
  min,
  integer,
  variant,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min'> & {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  integer?: boolean;
  variant?: InputVariant;
}) {
  // Cât nu e editat, numărul are separator de mii („4.500"); la editare, nu („4500").
  const [text, setText] = useState(decimalDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(decimalDisplay(value));
  }, [value, focused]);

  return (
    <input
      inputMode={integer ? 'numeric' : 'decimal'}
      className={inputClasses(className, 'tabular-nums', variant)}
      value={text}
      onFocus={() => {
        setFocused(true);
        setText(decimalText(value));
      }}
      onBlur={() => {
        setFocused(false);
        setText(decimalDisplay(value));
      }}
      onChange={(e) => {
        setText(e.target.value);
        const parsed = parseDecimal(e.target.value);
        if (parsed === undefined) return;
        if (parsed !== null && min !== undefined && parsed < min) return;
        if (parsed !== null && integer && !Number.isInteger(parsed)) return;
        onChange(parsed);
      }}
      {...props}
    />
  );
}

/** Etichetă deasupra unui singur câmp. */
export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** Etichetă pentru un grup de câmpuri sau butoane. */
export function FieldGroup({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className={cx('block', className)}>
      <span id={id} className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </div>
  );
}

export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('inline-flex max-w-full overflow-x-auto rounded-lg border border-line bg-surface p-0.5', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              active ? 'bg-sunken text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx('rounded-xl border border-line bg-surface', className)}>{children}</section>;
}

export function Banner({
  tone = 'info',
  children,
  className,
}: {
  tone?: 'info' | 'warn';
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'warn' ? 'alert' : 'status'}
      className={cx(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm',
        tone === 'warn' ? 'border-minus/30 bg-minus/10 text-ink' : 'border-line bg-sunken text-ink',
        className,
      )}
    >
      {children}
    </div>
  );
}

const STATUS_STYLES: Record<Status, string> = {
  todo: 'border-line text-muted',
  doing: 'border-accent text-accent',
  done: 'border-plus text-plus',
};

export function StatusPill({ status, onClick }: { status: Status; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={t.statusHint}
      className={cx(
        'w-[5.25rem] shrink-0 rounded-full border px-2 py-0.5 text-center text-xs font-medium transition-colors hover:bg-sunken',
        STATUS_STYLES[status],
      )}
    >
      {t.status[status]}
    </button>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-md bg-sunken px-1.5 py-0.5 text-[11px] font-medium text-muted">{children}</span>
  );
}
