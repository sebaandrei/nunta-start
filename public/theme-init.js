// Rulează sincron în <head>, înainte de prima pictare, ca să nu apară tema greșită.
// Ține în sincron cu THEME_KEY și parseThemeMode din src/lib/theme.ts.
try {
  const mode = localStorage.getItem('nunta-start:theme');
  if (mode === 'light' || mode === 'dark') {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }
} catch (_) {
  // Stocare indisponibilă: rămâne tema sistemului.
}
