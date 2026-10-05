import { type ReactNode, useState } from 'react';
import { ImportButton } from '../components/ImportButton';
import { Button, Card, Field, FieldGroup, NumberInput, Segmented, TextInput } from '../components/ui';
import { isValidISODate } from '../domain/dates';
import { CURRENCIES } from '../domain/schema';
import { downloadBackup } from '../lib/backup';
import { daysSinceBackup } from '../storage/storage';
import { useAppData, useStore } from '../store';
import { t } from '../text';

export function Settings() {
  const data = useAppData();
  const updateSettings = useStore((s) => s.updateSettings);
  const markExported = useStore((s) => s.markExported);
  const reset = useStore((s) => s.reset);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const { settings } = data;

  return (
    <div className="space-y-5">
      <Card className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t.settings.weddingDate}>
          <TextInput
            type="date"
            value={settings.weddingDate}
            onChange={(e) => isValidISODate(e.target.value) && updateSettings({ weddingDate: e.target.value })}
          />
        </Field>
        <FieldGroup label={t.settings.names}>
          <div className="grid grid-cols-2 gap-1.5">
            {settings.names.map((name, i) => (
              <TextInput
                // biome-ignore lint/suspicious/noArrayIndexKey: names is a fixed pair; the index is its identity.
                key={i}
                aria-label={`${t.settings.names} ${i + 1}`}
                value={name}
                onChange={(e) => {
                  const names: [string, string] = [...settings.names];
                  names[i] = e.target.value;
                  updateSettings({ names });
                }}
              />
            ))}
          </div>
        </FieldGroup>
        <FieldGroup label={t.settings.rate}>
          <div className="flex items-center gap-1.5 text-sm text-muted">
            <span className="whitespace-nowrap">{t.calc.ratePrefix}</span>
            <NumberInput
              aria-label={t.settings.rate}
              min={0.01}
              className="w-24"
              value={settings.eurRate}
              onChange={(v) => v !== null && v > 0 && updateSettings({ eurRate: v })}
            />
            <span>lei</span>
          </div>
        </FieldGroup>
        <FieldGroup label={t.settings.display}>
          <Segmented
            label={t.settings.display}
            value={settings.displayCurrency}
            onChange={(c) => updateSettings({ displayCurrency: c })}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          />
        </FieldGroup>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 bg-sunken/60 px-4 py-2.5">
          <h2 className="text-sm font-semibold">{t.settings.backup}</h2>
          <span className="text-xs text-muted">{t.settings.lastBackup(daysSinceBackup(data.meta, new Date()))}</span>
        </div>
        <Row text={t.settings.backupExplain}>
          <Button
            onClick={() => {
              downloadBackup(data, markExported);
              setMessage(null);
            }}
          >
            {t.settings.download}
          </Button>
        </Row>
        <Row text={t.settings.importExplain}>
          <ImportButton
            confirmMessage={t.settings.confirmImport}
            onImported={() => setMessage({ tone: 'ok', text: t.settings.imported })}
            onError={(error) => setMessage({ tone: 'error', text: `${t.backupErrors[error]} ${t.backupKept}` })}
          >
            {t.settings.import}
          </ImportButton>
        </Row>
        {message && (
          <p
            role="status"
            className={`border-t border-line px-4 py-2.5 text-sm ${message.tone === 'error' ? 'text-minus' : 'text-plus'}`}
          >
            {message.text}
          </p>
        )}
        <Row text={<span className="text-muted">{t.settings.resetExplain}</span>}>
          <Button
            variant="danger"
            onClick={() => {
              if (!window.confirm(t.settings.confirmReset)) return;
              window.location.hash = '';
              reset();
            }}
          >
            {t.settings.reset}
          </Button>
        </Row>
      </Card>
    </div>
  );
}

function Row({ text, children }: { text: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm first:border-t-0">
      <span className="min-w-0 flex-1 basis-64">{text}</span>
      {children}
    </div>
  );
}
