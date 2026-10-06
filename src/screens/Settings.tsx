import { useNavigate } from '@tanstack/react-router';
import { Plus, Trash2 } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { ImportButton } from '../components/ImportButton';
import { PageHeader } from '../components/PageHeader';
import {
  Button,
  Card,
  Dialog,
  Field,
  FieldGroup,
  Heading,
  IconButton,
  NumberInput,
  Segmented,
  TextInput,
} from '../components/ui';
import { isValidISODate } from '../domain/dates';

import { CURRENCIES, MAX_GODPARENT_PAIRS } from '../domain/schema';
import { useT } from '../i18n';
import { downloadBackup } from '../lib/backup';
import { currencySymbol } from '../lib/format';
import { useLocale } from '../lib/locale';
import { THEME_MODES, useTheme } from '../lib/theme';
import { daysSinceBackup } from '../storage/storage';
import { useAppData, useStore } from '../store';

export function Settings() {
  const t = useT();
  const data = useAppData();
  const updateSettings = useStore((s) => s.updateSettings);
  const setCity = useStore((s) => s.setCity);
  const addGodparents = useStore((s) => s.addGodparents);
  const updateGodparents = useStore((s) => s.updateGodparents);
  const removeGodparents = useStore((s) => s.removeGodparents);
  const markExported = useStore((s) => s.markExported);
  const reset = useStore((s) => s.reset);
  const navigate = useNavigate();
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const mode = useTheme((s) => s.mode);
  const setMode = useTheme((s) => s.setMode);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [rateEmpty, setRateEmpty] = useState(false);
  const rateHintId = useId();
  const rateErrorId = useId();
  const { settings } = data;
  const godparents = settings.godparents;

  return (
    <>
      <PageHeader
        eyebrow={t.pages.settings.eyebrow}
        title={t.pages.settings.title}
        subtitle={t.pages.settings.subtitle}
      />
      <div className="grid items-start gap-5 lg:grid-cols-3">
        <Card className="p-5 md:p-6 lg:col-span-3">
          <CardHeading title={t.settings.detailsTitle} hint={t.settings.detailsHint} />
          <div className="mt-5 space-y-5">
            <Field label={t.settings.weddingDateLabel}>
              <TextInput
                type="date"
                value={settings.weddingDate}
                onChange={(e) => isValidISODate(e.target.value) && updateSettings({ weddingDate: e.target.value })}
              />
            </Field>
            <Field label={t.settings.city}>
              <TextInput
                value={settings.city}
                placeholder={t.settings.cityPlaceholder}
                autoComplete="off"
                onChange={(e) => setCity(e.target.value)}
              />
            </Field>

            <FieldGroup label={t.settings.coupleTitle}>
              <div className="grid gap-3 sm:grid-cols-2">
                {[t.settings.partner1, t.settings.partner2].map((label, i) => (
                  <Field key={label} label={label}>
                    <TextInput
                      value={settings.names[i]}
                      onChange={(e) => {
                        const names: [string, string] = [...settings.names];
                        names[i] = e.target.value;
                        updateSettings({ names });
                      }}
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
                        <TextInput
                          value={pair.godmother}
                          placeholder={t.settings.godmotherPlaceholder}
                          onChange={(e) => updateGodparents(i, { godmother: e.target.value })}
                        />
                      </Field>
                      <Field label={t.settings.godfather}>
                        <TextInput
                          value={pair.godfather}
                          placeholder={t.settings.godfatherPlaceholder}
                          onChange={(e) => updateGodparents(i, { godfather: e.target.value })}
                        />
                      </Field>
                    </div>
                    <IconButton label={t.settings.removeGodparents(i + 1)} onClick={() => removeGodparents(i)}>
                      <Trash2 size={18} aria-hidden="true" />
                    </IconButton>
                  </li>
                ))}
              </ul>
              <Button
                variant="secondary"
                className={godparents.length > 0 ? 'mt-3' : undefined}
                disabled={godparents.length >= MAX_GODPARENT_PAIRS}
                onClick={addGodparents}
              >
                <Plus size={16} aria-hidden="true" />
                {t.settings.addGodparents}
              </Button>
            </FieldGroup>
          </div>
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
              <Segmented
                label={t.settings.displayLabel}
                value={settings.displayCurrency}
                onChange={(c) => updateSettings({ displayCurrency: c })}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              />
            </PrefRow>
            <PrefRow label={t.settings.rateLabel} hint={t.settings.rateHint} hintId={rateHintId}>
              <div className="flex items-center gap-2 text-sm text-muted">
                <span className="whitespace-nowrap">{t.calc.ratePrefix}</span>
                <NumberInput
                  aria-label={t.settings.rateLabel}
                  aria-describedby={rateEmpty ? `${rateHintId} ${rateErrorId}` : rateHintId}
                  aria-invalid={rateEmpty}
                  min={0.01}
                  className="w-24"
                  value={settings.eurRate}
                  onChange={(v) => {
                    setRateEmpty(v === null);
                    if (v !== null && v > 0) updateSettings({ eurRate: v });
                  }}
                />
                <span>{currencySymbol('RON')}</span>
              </div>
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
          <p className="mt-3 text-xs text-muted">{t.settings.lastBackup(daysSinceBackup(data.meta, new Date()))}</p>
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-sm font-medium">{t.settings.downloadTitle}</p>
            <p className="mt-1 text-xs text-muted">{t.settings.downloadHint}</p>
            <Button
              className="mt-3 w-full"
              onClick={() => {
                downloadBackup(data, markExported);
                setMessage(null);
              }}
            >
              {t.settings.downloadButton}
            </Button>
            <div className="mt-2">
              <ImportButton
                variant="link"
                className="min-h-11 md:min-h-8"
                confirmMessage={t.settings.confirmImport}
                onImported={() => setMessage({ tone: 'ok', text: t.settings.imported })}
                onError={(error) => setMessage({ tone: 'error', text: `${t.backupErrors[error]} ${t.backupKept}` })}
              >
                {t.settings.importLink}
              </ImportButton>
            </div>
            {message && (
              <p role="status" className={`mt-2 text-sm ${message.tone === 'error' ? 'text-minus' : 'text-plus'}`}>
                {message.text}
              </p>
            )}
          </div>
          <div className="mt-4 rounded-xl border border-minus/30 bg-minus/10 p-4">
            <p className="text-sm font-medium">{t.settings.deleteTitle}</p>
            <p className="mt-1 text-xs text-muted">{t.settings.deleteHint}</p>
            <Button variant="danger" className="mt-3 w-full" onClick={() => setConfirming(true)}>
              {t.settings.deleteButton}
            </Button>
          </div>
        </Card>
      </div>

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
              onClick={() => {
                setConfirming(false);
                void navigate({ to: '/' });
                reset();
              }}
            >
              {t.settings.deleteButton}
            </Button>
          </>
        }
      >
        {t.settings.dialogBody}
      </Dialog>
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
