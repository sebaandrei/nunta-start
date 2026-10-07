import { Link2, MessageCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { generateRsvpToken, rsvpUrl } from '../../data/rsvpToken';
import { useT } from '../../i18n';
import { showToast } from '../../lib/toast';
import { Button } from '../ui';

/**
 * Link de RSVP pentru o familie. Primul clic generează tokenul (serverul îl ține doar hash-uit);
 * cât timp cardul rămâne montat îl reutilizăm, ca „Copiați" și „WhatsApp" să dea același link.
 * Un clic după reîncărcarea paginii generează un token nou și invalidează linkul trimis înainte.
 */
export function RsvpLinkButtons({ householdId, householdName }: { householdId: string; householdName: string }) {
  const t = useT();
  const token = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);

  const getUrl = async (): Promise<string | null> => {
    // Tokenul nu se poate recupera: un token nou înlocuiește linkul deja trimis, deci cerem confirmarea.
    if (!token.current && !window.confirm(t.guests.rsvpConfirmNew)) return null;
    try {
      token.current ??= await generateRsvpToken(householdId);
      return rsvpUrl(token.current);
    } catch {
      showToast(t.guests.rsvpFailed);
      return null;
    }
  };

  const copy = async () => {
    setBusy(true);
    const url = await getUrl();
    setBusy(false);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      showToast(t.guests.rsvpCopied, 'info');
    } catch {
      showToast(t.guests.rsvpFailed);
    }
  };

  const whatsapp = async () => {
    // Fereastra se deschide în gestul utilizatorului; altfel blocatoarele de popup o opresc după await.
    const popup = window.open('', '_blank');
    setBusy(true);
    const url = await getUrl();
    setBusy(false);
    if (!url) {
      popup?.close();
      return;
    }
    const href = `https://wa.me/?text=${encodeURIComponent(t.guests.rsvpMessage(householdName, url))}`;
    if (popup) popup.location.href = href;
    else window.location.href = href;
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="ghost" disabled={busy} onClick={copy}>
        <Link2 size={14} aria-hidden="true" />
        {t.guests.rsvpCopyLink}
      </Button>
      <Button variant="ghost" disabled={busy} onClick={whatsapp}>
        <MessageCircle size={14} aria-hidden="true" />
        {t.guests.rsvpWhatsapp}
      </Button>
    </div>
  );
}
