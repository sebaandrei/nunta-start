import { useState } from 'react';
import { ImportButton } from '../components/ImportButton';
import { Banner, Button, Field, FieldGroup, NumberInput, TextInput } from '../components/ui';
import { isValidISODate } from '../domain/dates';
import { useT } from '../i18n';
import { downloadText } from '../lib/download';
import type { BackupError } from '../storage/storage';
import { useStore } from '../store';

export function Onboarding() {
  const t = useT();
  const start = useStore((s) => s.start);
  const corruptRaw = useStore((s) => s.corruptRaw);
  const [date, setDate] = useState('');
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [guests, setGuests] = useState<number | null>(null);
  const [importError, setImportError] = useState<BackupError | null>(null);

  const canStart = isValidISODate(date) && name1.trim() !== '' && name2.trim() !== '';

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <p className="font-serif text-sm italic text-accent">{t.appName}</p>
      <h1 className="mt-1 font-serif text-4xl leading-tight">{t.onboarding.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">{t.tagline}</p>

      {corruptRaw && (
        <Banner tone="warn" className="mt-6">
          <span>{t.onboarding.corrupt}</span>
          <Button variant="ghost" onClick={() => downloadText('nunta-start-date-vechi.json', corruptRaw)}>
            {t.onboarding.corruptDownload}
          </Button>
        </Banner>
      )}

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (canStart) start({ weddingDate: date, names: [name1.trim(), name2.trim()], guests });
        }}
      >
        <Field label={t.onboarding.date} hint={t.onboarding.dateHint}>
          <TextInput type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <FieldGroup label={t.onboarding.names}>
          <div className="grid grid-cols-2 gap-2">
            <TextInput
              aria-label={`${t.onboarding.names} 1`}
              placeholder={t.onboarding.namePlaceholder1}
              value={name1}
              onChange={(e) => setName1(e.target.value)}
            />
            <TextInput
              aria-label={`${t.onboarding.names} 2`}
              placeholder={t.onboarding.namePlaceholder2}
              value={name2}
              onChange={(e) => setName2(e.target.value)}
            />
          </div>
        </FieldGroup>
        <Field label={t.onboarding.guests} hint={t.onboarding.guestsHint}>
          <NumberInput
            integer
            min={1}
            value={guests}
            onChange={setGuests}
            placeholder={t.onboarding.guestsPlaceholder}
          />
        </Field>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" disabled={!canStart}>
            {t.onboarding.start}
          </Button>
          <ImportButton onError={setImportError}>{t.onboarding.import}</ImportButton>
        </div>
        {importError && <p className="text-sm text-minus">{t.backupErrors[importError]}</p>}
      </form>
    </main>
  );
}
