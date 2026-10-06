-- Date de test pentru dezvoltarea locală (rulează la `npm run db:reset`).

-- Invite-only sign-up (NS-301): fake addresses allowed locally.
insert into public.allowed_emails (email, note) values
  ('dev1@example.test', 'local development'),
  ('dev2@example.test', 'local development');
