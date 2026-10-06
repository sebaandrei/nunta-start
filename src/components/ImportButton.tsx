import { type ComponentProps, type ReactNode, useRef } from 'react';
import { type BackupError, parseBackup } from '../storage/storage';
import { useStore } from '../store';
import { Button } from './ui';

/** Alege un fișier de copie, îl validează și, după confirmare, înlocuiește datele. */
export function ImportButton({
  children,
  variant = 'ghost',
  className,
  confirmMessage,
  onImported,
  onError,
}: {
  children: ReactNode;
  variant?: ComponentProps<typeof Button>['variant'];
  className?: string;
  confirmMessage?: string;
  onImported?: () => void;
  onError: (error: BackupError) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const replaceData = useStore((s) => s.replaceData);

  async function load(file: File) {
    const result = parseBackup(await file.text());
    if (!result.ok) {
      onError(result.error);
      return;
    }
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    replaceData(result.data);
    onImported?.();
  }

  return (
    <>
      <Button variant={variant} className={className} onClick={() => input.current?.click()}>
        {children}
      </Button>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void load(file);
        }}
      />
    </>
  );
}
