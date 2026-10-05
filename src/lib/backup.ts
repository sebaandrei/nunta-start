import type { AppData } from '../domain/schema';
import { backupFileName, serializeBackup } from '../storage/storage';
import { downloadText } from './download';

export function downloadBackup(data: AppData, markExported: () => void): void {
  const now = new Date();
  downloadText(backupFileName(data, now), serializeBackup(data, now));
  markExported();
}
