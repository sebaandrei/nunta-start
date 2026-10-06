import { useNavigate } from '@tanstack/react-router';
import { Plus, Trash2 } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { MembersPanel } from '../components/MembersPanel';
import { PageHeader } from '../components/PageHeader';
import {
  Banner,
  Button,
  Card,
  CommitInput,
  Dialog,
  Field,
  FieldGroup,
  Heading,
  IconButton,
  NumberInput,
  Segmented,
} from '../components/ui';
import { useSettings } from '../data/hooks';
import { useDeleteWedding, useWeddingMutation } from '../data/weddingMutations';
import { isValidISODate } from '../domain/dates';
import { CURRENCIES, type GodparentPair, MAX_GODPARENT_PAIRS } from '../domain/schema';
import { useT } from '../i18n';
import { currencySymbol } from '../lib/format';
import { useLocale } from '../lib/locale';
import { paths } from '../lib/paths';
import { THEME_MODES, useTheme } from '../lib/theme';
import { useWedding } from '../lib/wedding';

export function Settings() {
  const t = useT();
  const { id: weddingId, wedding, canEdit } = useWedding();
  const settings = useSettings();
  const updateWedding = useWeddingMutation(weddingId);
  const deleteWedding = useDeleteWedding(weddingId);
  const navigate = useNavigate();
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const mode = useTheme((s) => s.mode);
  const setMode = useTheme((s) => s.setMode);
  const [confirming, setConfirming] = useState(false);
  const [rateEmpty, setRateEmpty] = useState(false);
  const rateHintId = useId();
  const rateErrorId = useId();
  const downloadHintId = useId();
  const readOnly = !canEdit('settings');
  const isOwner = wedding.role === 'owner';
  const godparents = settings.godparents;

  const setGodparents = (next: GodparentPair[]) => updateWedding({ godparents: next });
  const changeGodparent = (index: number, patch: Partial<GodparentPair>) =>
    setGodparents(godparents.map((pair, i) => (i === index ? { ...pair, ...patch } : pair)));

  return (
    <>
      <PageHeader
        eyebrow={t.pages.settings.eyebrow}
        title={t.pages.settings.title}
        subtitle={t.pages.settings.subtitle}
      />
      {readOnly && <Banner className="mb-5">{t.settings.readOnly}</Banner>}
      <div className="grid items-start gap-5 lg:grid-cols-3">
        <Card className="p-5 md:p-6 lg:col-span-3">
          <CardHeading title={t.settings.detailsTitle} hint={t.settings.detailsHint} />
          <fieldset disabled={readOnly} className="m-0 mt-5 min-w-0 space-y-5 border-0 p-0">
            <Field label={t.settings.weddingDateLabel}>
              <CommitInput
                type="date"
                value={settings.weddingDate}
                validate={isValidISODate}
                onCommit={(date) => updateWedding({ date })}
              />
            </Field>
            <Field label={t.settings.city}>
              <CommitInput
                value={settings.city}
                placeholder={t.settings.cityPlaceholder}
                autoComplete="off"
                onCommit={(city) => updateWedding({ city })}
              />
            </Field>

            <FieldGroup label={t.settings.coupleTitle}>
              <div className="grid gap-3 sm:grid-cols-2">
                {[t.settings.partner1, t.settings.partner2].map((label, i) => (
                  <Field key={label} label={label}>
                    <CommitInput
                      value={settings.names[i]}
                      validate={(name) => name.trim() !== ''}
                      onCommit={(name) => updateWedding(i === 0 ? { partner1: name } : { partner2: name })}
                    />
                  </Field>
                ))}
              </div>
            </FieldGroup>

            <FieldGroup label={t.settings.godparentsTitle}>
              <ul className="space-y-3">
                {godparents.map((pair, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: pairs have no id; the index is their identity.
                  <li key={i} className="flex items-end gap-2">
                    <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                      <Field label={t.settings.godmother}>
                        <CommitInput
                          value={pair.godmother}
                          placeholder={t.settings.godmotherPlaceholder}
                          onCommit={(godmother) => changeGodparent(i, { godmother })}
                        />
                      </Field>
                      <Field label={t.settings.godfather}>
                        <CommitInput
                          value={pair.godfather}
                          placeholder={t.settings.godfatherPlaceholder}
                          onCommit={(godfather) => changeGodparent(i, { godfather })}
                        />
                      </Field>
                    </div>
                    <IconButton
                      label={t.settings.removeGodparents(i + 1)}
                      onClick={() => setGodparents(godparents.filter((_, j) => j !== i))}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </IconButton>
                  </li>
                ))}
              </ul>
              <Button
                variant="secondary"
                className={godparents.length > 0 ? 'mt-3' : undefined}
                disabled={godparents.length >= MAX_GODPARENT_PAIRS}
                onClick={() => setGodparents([...godparents, { godmother: '', godfather: '' }])}
              >
                <Plus size={16} aria-hidden="true" />
                {t.settings.addGodparents}
              </Button>
            </FieldGroup>
          </fieldset>
        </Card>

        <Card className="p-5 md:p-6 lg:col-span-2">
          <CardHeading title={t.settings.prefsTitle} hint={t.settings.prefsHint} />
          <div className="mt-2 divide-y divide-line">
            <PrefRow label={t.settings.language} hint={t.settings.languageHint}>
              <Segmented
                label={t.settings.language}
                value={locale}
                onChange={setLocale}
                options={[
                  { value: 'ro', label: 'Română' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </PrefRow>
            <PrefRow label={t.settings.appearance} hint={t.settings.appearanceHint}>
              <Segmented
                label={t.settings.appearance}
                value={mode}
                onChange={setMode}
                options={THEME_MODES.map((m) => ({ value: m, label: t.settings.themes[m] }))}
              />
            </PrefRow>
            <PrefRow label={t.settings.displayLabel} hint={t.settings.displayHint}>
              <fieldset disabled={readOnly} className="contents">
                <Segmented
                  label={t.settings.displayLabel}
                  value={settings.displayCurrency}
                  onChange={(c) => updateWedding({ displayCurrency: c })}
                  options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                />
              </fieldset>
            </PrefRow>
            <PrefRow label={t.settings.rateLabel} hint={t.settings.rateHint} hintId={rateHintId}>
              <fieldset
                disabled={readOnly}
                className="m-0 flex min-w-0 items-center gap-2 border-0 p-0 text-sm text-muted"
              >
                <span className="whitespace-nowrap">{t.calc.ratePrefix}</span>
                <NumberInput
                  deferred
                  aria-label={t.settings.rateLabel}
                  aria-describedby={rateEmpty ? `${rateHintId} ${rateErrorId}` : rateHintId}
                  aria-invalid={rateEmpty}
                  min={0.01}
                  className="w-24"
                  value={settings.eurRate}
                  onChange={(v) => {
                    setRateEmpty(v === null);
                    if (v !== null && v > 0) updateWedding({ eurRate: v });
                  }}
                />
                <span>{currencySymbol('RON')}</span>
              </fieldset>
              {rateEmpty && (
                <p id={rateErrorId} role="alert" className="mt-1 text-xs text-minus">
                  {t.settings.rateError}
                </p>
              )}
            </PrefRow>
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <CardHeading title={t.settings.dataTitle} hint={t.settings.dataHint} />
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-sm font-medium">{t.settings.downloadTitle}</p>
            <p id={downloadHintId} className="mt-1 text-xs text-muted">
              {t.settings.downloadHint}
            </p>
            <Button className="mt-3 w-full" disabled aria-describedby={downloadHintId}>
              {t.settings.downloadButton}
            </Button>
          </div>
          {isOwner && (
            <div className="mt-4 rounded-xl border border-minus/30 bg-minus/10 p-4">
              <p className="text-sm font-medium">{t.settings.deleteTitle}</p>
              <p className="mt-1 text-xs text-muted">{t.settings.deleteHint}</p>
              <Button variant="danger" className="mt-3 w-full" onClick={() => setConfirming(true)}>
                {t.settings.deleteButton}
              </Button>
            </div>
          )}
        </Card>
      </div>

      <MembersPanel selfName={settings.names[0]} onLeft={() => void navigate({ to: paths.workspaces })} />

      {isOwner && (
        <Dialog
          open={confirming}
          onClose={() => setConfirming(false)}
          title={t.settings.dialogTitle}
          actions={
            <>
              <Button variant="ghost" autoFocus onClick={() => setConfirming(false)}>
                {t.settings.cancel}
              </Button>
              <Button
                variant="dangerSolid"
                disabled={deleteWedding.isPending}
                onClick={() =>
                  deleteWedding.mutate(undefined, {
                    onSuccess: () => void navigate({ to: paths.workspaces }),
                    onSettled: () => setConfirming(false),
                  })
                }
              >
                {t.settings.deleteButton}
              </Button>
            </>
          }
        >
          {t.settings.dialogBody(wedding.name)}
        </Dialog>
      )}
    </>
  );
}

function CardHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <Heading size="md">{title}</Heading>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </div>
  );
}

function PrefRow({
  label,
  hint,
  hintId,
  children,
}: {
  label: string;
  hint: string;
  hintId?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      </div>
      <div className="max-w-full">{children}</div>
    </div>
  );
}
