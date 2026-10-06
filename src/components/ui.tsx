import { Info, type LucideIcon, TriangleAlert } from 'lucide-react';
import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type { Status } from '../domain/schema';
import { useT } from '../i18n';
import { decimalDisplay, decimalText, parseDecimal } from '../lib/format';

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

const BUTTON_VARIANTS = {
  primary: 'bg-accent text-accent-ink hover:opacity-90',
  secondary: 'bg-soft text-ink hover:bg-soft/70',
  ghost: 'border border-line bg-surface text-ink hover:bg-sunken',
  danger: 'border border-minus/40 bg-surface text-minus hover:bg-minus/10',
  dangerSolid: 'bg-minus text-accent-ink hover:opacity-90',
  link: 'text-accent underline-offset-2 hover:underline',
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
        'inline-flex items-center justify-center gap-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        // „link" arată ca text; celelalte au 44px înălțime pe telefon (țintă de atingere).
        variant === 'link' ? 'p-0' : 'min-h-11 rounded-xl px-4 py-1.5 md:min-h-9 md:px-3.5',
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
  box: 'min-h-11 rounded-xl border-line bg-surface px-3 py-1.5 md:min-h-9',
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
    // biome-ignore lint/a11y/noLabelWithoutControl: the input is passed as children, so the label wraps it.
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
    // biome-ignore lint/a11y/useSemanticElements: valid ARIA group; fieldset styling revisited in NS-140.
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
      className={cx('inline-flex max-w-full overflow-x-auto rounded-xl bg-sunken p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: WAI-ARIA radio pattern on buttons; revisited in NS-140.
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'min-h-11 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition-colors md:min-h-8',
              active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const CARD_TONES = {
  default: 'border-line bg-surface',
  hero: 'border-transparent bg-hero',
  warm: 'border-transparent bg-warm',
  sunken: 'border-line bg-sunken',
};

export function Card({
  className,
  tone = 'default',
  children,
}: {
  className?: string;
  tone?: keyof typeof CARD_TONES;
  children: ReactNode;
}) {
  return <section className={cx('rounded-2xl border', CARD_TONES[tone], className)}>{children}</section>;
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
  const Icon = tone === 'warn' ? TriangleAlert : Info;
  return (
    <div
      role={tone === 'warn' ? 'alert' : 'status'}
      className={cx(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm',
        tone === 'warn' ? 'border-minus/30 bg-minus/10 text-ink' : 'border-line bg-sunken text-ink',
        className,
      )}
    >
      <Icon
        size={18}
        aria-hidden="true"
        className={cx('mt-0.5 shrink-0', tone === 'warn' ? 'text-minus' : 'text-accent')}
      />
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">{children}</div>
    </div>
  );
}

const STATUS_STYLES: Record<Status, string> = {
  todo: 'border-line bg-surface text-muted hover:bg-sunken',
  doing: 'border-transparent bg-soft text-ink hover:bg-soft/70',
  done: 'border-plus/40 bg-plus/10 text-plus hover:bg-plus/20',
};

export function StatusPill({ status, onClick }: { status: Status; onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      title={t.statusHint}
      className={cx(
        'w-[5.25rem] shrink-0 rounded-full border px-2 py-1 text-center text-xs font-medium transition-colors',
        STATUS_STYLES[status],
      )}
    >
      {t.status[status]}
    </button>
  );
}

const TAG_TONES = {
  neutral: 'bg-sunken text-muted',
  soft: 'bg-soft text-ink',
  warm: 'bg-warm text-ink',
  minus: 'bg-minus/10 text-minus',
};

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof TAG_TONES }) {
  return (
    <span className={cx('whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium', TAG_TONES[tone])}>
      {children}
    </span>
  );
}

/** Buton doar cu pictogramă; eticheta e obligatorie (nume accesibil și tooltip). 44px pe telefon. */
export function IconButton({
  label,
  className,
  children,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'title'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 md:size-9',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Bară de progres accesibilă. */
export function ProgressBar({
  value,
  max = 100,
  label,
  className,
}: {
  value: number;
  max?: number;
  label: string;
  className?: string;
}) {
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max > 0 ? (clamped / max) * 100 : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
      className={cx('h-2 overflow-hidden rounded-full bg-soft', className)}
    >
      <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Titlu serif (Fraunces). */
export function Heading({
  as: Element = 'h2',
  size = 'md',
  className,
  children,
}: {
  as?: 'h1' | 'h2' | 'h3';
  size?: 'lg' | 'md' | 'sm';
  className?: string;
  children: ReactNode;
}) {
  const sizes = { lg: 'text-[2rem] leading-tight', md: 'text-xl leading-snug', sm: 'text-base leading-snug' };
  return <Element className={cx('font-serif font-medium text-ink', sizes[size], className)}>{children}</Element>;
}

/** Cifră mare cu etichetă deasupra și o linie de ajutor dedesubt. */
export function StatCard({
  label,
  value,
  helper,
  tone,
  valueClassName,
  className,
  children,
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  tone?: keyof typeof CARD_TONES;
  valueClassName?: string;
  className?: string;
  /** Între cifră și linia de ajutor (de ex. o bară de progres). */
  children?: ReactNode;
}) {
  return (
    <Card tone={tone} className={cx('p-4 md:p-5', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className={cx('mt-1.5 font-serif text-[1.75rem] leading-tight tabular-nums md:text-3xl', valueClassName)}>
        {value}
      </p>
      {children}
      {helper && <p className="mt-2 text-xs text-muted">{helper}</p>}
    </Card>
  );
}

/** Filtru ca pastilă, apăsat sau nu. */
export function FilterChip({
  selected,
  count,
  children,
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> & { selected: boolean; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(
        'inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-medium transition-colors md:min-h-8',
        selected
          ? 'border-transparent bg-soft text-ink'
          : 'border-line bg-surface text-muted hover:bg-sunken hover:text-ink',
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && <span className="tabular-nums text-muted">{count}</span>}
    </button>
  );
}

/** Stare goală: pictogramă, text și, opțional, o acțiune. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-8 text-center',
        className,
      )}
    >
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-soft text-ink">
        <Icon size={20} aria-hidden="true" />
      </span>
      <p className="font-serif text-lg">{title}</p>
      {children && <p className="max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/**
 * Dialog modal pe <dialog> nativ: focusul rămâne în el, Escape îl închide, iar la închidere
 * focusul revine pe butonul care l-a deschis (le face browserul). Click pe fundal închide.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: same
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-6 text-ink shadow-xl backdrop:bg-ink/40"
    >
      <h2 id={titleId} className="font-serif text-xl leading-snug">
        {title}
      </h2>
      <div className="mt-2 text-sm text-muted">{children}</div>
      <div className="mt-6 flex flex-wrap justify-end gap-2">{actions}</div>
    </dialog>
  );
}
