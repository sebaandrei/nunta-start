import { useEffect, useState } from 'react';
import { useT } from '../../i18n';
import { Button, Dialog, Field, TextInput } from '../ui';

/** Dialog cu un singur câmp: numele unei pagini noi sau noul nume al uneia existente. */
export function NameDialog({
  open,
  title,
  submitLabel,
  initial = '',
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  initial?: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [name, setName] = useState(initial);
  useEffect(() => {
    if (open) setName(initial);
  }, [open, initial]);
  const valid = name.trim() !== '';
  const submit = () => {
    if (!valid) return;
    onSubmit(name.trim());
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.collections.cancel}
          </Button>
          <Button disabled={!valid} onClick={submit}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <Field label={t.collections.pageName}>
        <TextInput
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </Field>
    </Dialog>
  );
}
