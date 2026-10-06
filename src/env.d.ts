interface ImportMetaEnv {
  readonly VITE_FARO_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** 'true' arată butonul Google în ecranul de conectare (implicit ascuns: doar codul pe email). */
  readonly VITE_AUTH_GOOGLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
