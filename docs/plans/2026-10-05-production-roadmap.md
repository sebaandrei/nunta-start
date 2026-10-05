# Nunta Start → production SaaS: implementation plan

Date: 2026-10-05
Status: draft, built from the architecture interview. Supersedes the "no accounts, no server" principle of the [v1 design](../superpowers/specs/2026-10-05-nunta-start-design.md).

## 1. Decisions (from the interview)

| Topic | Decision |
|---|---|
| Product | Public multi-tenant SaaS, always free, donations only (GitHub Sponsors / Buy Me a Coffee) |
| Budget | **$0/month** for infra (hard cap $5). Domain already owned: `thedevopsguy.ro` |
| URL | `https://nunta.thedevopsguy.ro` (Cloudflare Pages custom domain); email from `mail.thedevopsguy.ro` |
| Tenancy | One **wedding** = one workspace. A user can belong to several weddings (planners) |
| Roles | Couple (2), planner, family/godparents, guests (RSVP via link, no account) |
| Collaboration | Real-time while online. No offline mode |
| Client | Responsive web app (desktop + phone browsers). No PWA install, no native apps |
| Backend | Supabase free tier, EU region (Frankfurt) |
| Auth | Google OAuth + email magic link |
| Frontend | Keep Vite + React SPA; add TanStack Router + TanStack Query + supabase-js |
| Hosting | Cloudflare Pages free (SPA rewrites, security headers, commercial use allowed) |
| Modules | Existing: Tasks, Budget. New: Guest list + RSVP, Seating + OPIS, Vendors + payments, Day-of timeline |
| Notifications | Weekly email digest + in-app activity feed. No push |
| i18n | Romanian first, code i18n-ready |
| Migration | None. localStorage mode is removed; fresh start |
| GDPR | EU hosting, privacy policy + terms, self-service export and account deletion, no trackers |
| Quality bar | Playwright E2E, pgTAP RLS tests, Sentry, uptime monitoring, nightly backups |
| Team | Solo + AI, phased MVP |

## 2. Current state (assessment)

- ~3.2k LOC, Vite 8 / React 19 / TS 7 / Zustand / Zod 4 / Tailwind 4 / Vitest. Clean.
- `src/domain/` (budget, tasks, dates) is pure and tested. **Reused as-is**; this is the most valuable code in the repo.
- `src/store.ts` mixes domain mutations with localStorage persistence. **Replaced** by TanStack Query + Supabase mutations; Zustand stays for UI state only.
- `src/storage/` (localStorage, backup reminder) is **deleted**. The JSON export moves to a "Download my data" GDPR export.
- Navigation is hash tabs (`#acasa`, ...). It moves to real routes.
- `src/text.ts` is a single Romanian dictionary. It's a good base for i18n.
- No lint, no E2E, no error tracking, and deployment goes to GitHub Pages.

## 3. Target architecture

```
Browser (React SPA, Cloudflare Pages)
  ├─ TanStack Router      routes: /w/:weddingId/{tasks,budget,guests,seating,vendors,timeline,activity,settings}
  ├─ TanStack Query       server cache, optimistic mutations
  ├─ supabase-js          auth, PostgREST, RPC, Realtime
  └─ src/domain           pure calc (budget, stages, OPIS sort), unchanged

Supabase (free, eu-central-1)
  ├─ Auth                 Google + magic link (custom SMTP: Resend)
  ├─ Postgres             all data, RLS on every table, triggers → activity_log
  ├─ Realtime             private broadcast channel per wedding (`wedding:<id>`)
  ├─ Storage              vendor contracts / attachments (private bucket, RLS)
  ├─ Edge Functions       send-digest, rsvp (public), invite-accept
  └─ pg_cron + pg_net     weekly digest, keep-alive, retention purge

Third party (all free tiers)
  Resend (email) · Sentry (errors) · UptimeRobot (uptime) · Cloudflare Turnstile (bot check on RSVP/login)
  Cloudflare R2 (encrypted nightly DB dumps)
```

### Why this shape
- **SPA instead of SSR.** Everything sits behind a login, so SEO only matters for the landing page, which can be a prerendered static route. Static hosting stays $0 forever.
- **Business logic stays client-side in `src/domain`.** Invariants that must hold go into Postgres as constraints and RLS rules. There's no custom API server to run or pay for.
- **Broadcast-from-database instead of `postgres_changes`.** It scales better on the free tier, and authorization goes through RLS on `realtime.messages`.

## 4. Data model

All tables have `id uuid pk default gen_random_uuid()`, `wedding_id uuid not null` (except where noted), `created_at`, `updated_at`, `updated_by uuid`. Money is `numeric(12,2)` + `currency` enum (`EUR`, `RON`). Never float.

**Tenancy & identity**
- `profiles` (id = auth.users.id, display_name, locale, email_digest bool)
- `weddings` (name, wedding_date, partner1_name, partner2_name, eur_rate, display_currency, deleted_at)
- `wedding_members` (wedding_id, user_id, role, unique(wedding_id,user_id))
- `invitations` (wedding_id, email, role, token_hash, expires_at, accepted_at, invited_by)

**Existing modules**
- `tasks` (template_key, title, category, assignee `p1|p2|both`, status, days_before, manual_date, details, note, position)
- `budget_settings` (wedding_id pk, gift_per_guest + currency, family_gift + currency, selected_scenario_id)
- `budget_scenarios` (guests int > 0, position) with a trigger enforcing 1–4 per wedding
- `budget_lines` (name, unit_price, currency, qty_kind `per_guest|fixed`, qty_count, note, vendor_id null, position)

**New modules**
- `households` (name, side `p1|p2|both`, rsvp_token_hash, rsvp_status, rsvp_answered_at, notes): the "family" unit from the sheets
- `guests` (household_id, first_name, last_name, age_group `adult|child`, diet `standard|vegetarian|vegan|fasting|allergy|other`, diet_note, attending `unknown|yes|no`, table_id null, seat_no null)
- `seating_tables` (number, name, kind `prezidiu|regular|kids`, capacity)
- `vendors` (name, category, contact_name, phone, email, website, notes)
- `vendor_files` (vendor_id, storage_path, filename, size)
- `payments` (vendor_id null, budget_line_id null, amount, currency, due_date, paid_at null, note)
- `timeline_events` (starts_at time, ends_at time null, title, location, responsible, vendor_id null, notes, position)
- `activity_log` (actor_id, entity, entity_id, action `insert|update|delete`, summary jsonb, created_at). Written by triggers and kept for 180 days.

**Change from v1:** `budget_lines.paid` is gone. Paid = `sum(payments where paid_at is not null)`, and "remaining" comes from the payments schedule. `src/domain/budget.ts` gets the line's payments instead of a single number.

### Roles and permissions

| Capability | owner | partner | planner | helper | viewer | guest (token) |
|---|---|---|---|---|---|---|
| Read all wedding data | ✓ | ✓ | ✓ | ✓ | ✓ | own household only |
| Edit tasks, timeline | ✓ | ✓ | ✓ | ✓ | – | – |
| Edit guests, seating | ✓ | ✓ | ✓ | ✓ | – | own RSVP only |
| Edit budget, vendors, payments | ✓ | ✓ | ✓ | – | – | – |
| Invite / remove members | ✓ | ✓ | ✓ (helper/viewer) | – | – | – |
| Delete wedding, transfer ownership | ✓ | – | – | – | – | – |

The creator is `owner`. The second partner joins through an invitation as `partner`. Family and godparents join as `helper` or `viewer`.

### RLS pattern
- `private.member_role(wedding_id) returns role`: `security definer`, `stable`, reads `wedding_members` for `(select auth.uid())`. It's indexed on `(user_id, wedding_id)`.
- Every table gets select/insert/update/delete policies that call `private.has_role(wedding_id, array[...])`.
- Guests never touch tables directly. The `rsvp` Edge Function (Turnstile-protected) handles them: it looks up the household by `sha256(token)` and updates only that household's guests.
- The `service_role` key exists only in Edge Function secrets, never in the client.

## 5. Real-time collaboration

- An `AFTER INSERT/UPDATE/DELETE` trigger on every wedding table calls `realtime.broadcast_changes('wedding:' || wedding_id, ...)`.
- RLS on `realtime.messages` allows `select` only to members of that wedding (private channels).
- The client subscribes once per open wedding and patches the matching TanStack Query cache entry. Presence on the same channel shows who's online ("Ana is editing the guest list").
- **Conflicts:** writes send only the changed columns (`PATCH`), so two people editing different fields of a row don't clash. If two people edit the same field, the last write wins, and the activity feed shows what happened. That's acceptable for 2–5 collaborators.
- **Mutations:** updates are optimistic and roll back on error with a toast. Ordering lists use a fractional `position` (numeric) so reordering touches one row.

## 6. Module notes

- **Tasks:** the template JSON is seeded per wedding on creation (RPC `create_wedding`). Stage logic stays in `src/domain/tasks.ts`.
- **Budget:** same calculator UI. Scenario cards read the live guest count from the guest list as an extra "Actual" scenario, which closes the loop the v1 spec deferred.
- **Guest list + RSVP:** CSV import (WeddingWire export + generic CSV with column mapping). Each household gets an RSVP link, `/r/<token>`. It's a public page with no account: it shows the household members, attending yes/no, diet and a note. The couple shares links via WhatsApp or SMS by copying them; no SMS gateway, which would cost money.
- **Seating + OPIS:** drag-and-drop table assignment on desktop (`dnd-kit`), and a per-guest "pick table" sheet on phone. The OPIS is generated client-side as a PDF (`@react-pdf/renderer`). It contains the alphabetical index, special menus per table and kids per table, using the Romanian collation from `Intl.Collator('ro')`. There's no server PDF rendering.
- **Vendors + payments:** contacts, contract uploads (Storage, 10 MB/file limit), installment schedule. "Upcoming payments" appears on the home screen and in the digest.
- **Day-of timeline:** an ordered schedule. A read-only share link (`/t/<token>`) can go to vendors and nași. It prints well (CSS `@media print`).
- **Activity feed:** `/w/:id/activity`, paginated from `activity_log`, with an "unread since last visit" badge.
- **Email digest:** `pg_cron` runs Mondays 08:00 Europe/Bucharest. It calls `pg_net`, which calls the `send-digest` Edge Function, which emails through Resend. The email lists tasks due in the next 14 days, overdue tasks, payments due, and new RSVPs. Members can opt out per profile. The send is spread over weekdays if the daily cap is near (see §10).

## 7. Frontend changes

- **Routing:** TanStack Router with typed params. Routes: `/login`, `/w` (wedding picker), `/w/new`, `/w/:id/...`, `/invite/:token`, `/r/:token`, `/t/:token`, `/privacy`, `/terms`.
- **State:** TanStack Query for server data. Zustand only for UI (filters, open panels).
- **i18n:** keep a typed dictionary, but split it per locale (`src/i18n/ro.ts`, a `Messages` type, `useT()`). Formatting goes through `Intl` with the active locale. Task and budget templates live under `content/<locale>/`. No library is needed until a second language actually ships.
- **Responsive:** mobile-first Tailwind. Below `md`, tables become cards and navigation moves to a bottom tab bar. Touch targets are at least 44px. Tested at 360px width.
- **Accessibility:** WCAG 2.2 AA. Use semantic HTML, keep focus on optimistic updates, and run `@axe-core/playwright` in E2E.
- **Lint/format:** Biome (one tool, fast), run in CI.
- **Performance budget:** initial JS under 200 KB gzip, route-level code splitting. The PDF library loads lazily on the OPIS screen only.

## 8. Environments, CI/CD, operations

| Env | Supabase | Frontend |
|---|---|---|
| local | `supabase start` (Docker) | `vite dev` |
| staging | free project #2 | Cloudflare Pages preview (every PR) |
| prod | free project #1 | Cloudflare Pages production (`main`) |

The free plan allows exactly 2 active projects, so that's staging + prod.

**GitHub Actions** (free for public repos):
1. `ci.yml` on PR runs: Biome → `tsc` → Vitest → `supabase start` + `supabase db reset` + `supabase test db` (pgTAP RLS suite) → Playwright E2E against local stack → build.
2. `deploy.yml` on `main` runs: `supabase db push` to staging, then deploys to production behind a GitHub Environment manual approval (`supabase db push` prod + Cloudflare Pages deploy). Migrations are forward-only and written to stay backward compatible for one release.
3. `backup.yml` runs nightly: `supabase db dump` (schema + data) → `age`-encrypted → Cloudflare R2 (free 10 GB), with 30 dailies kept. This also generates daily activity, which prevents the free-tier pause.
4. `keepalive.yml` runs every 3 days as a cheap REST ping to both projects (belt and braces for staging).
5. CodeQL + Dependabot (free on public repos).

**Restore drill:** before launch, and then quarterly, restore the latest dump into staging and run the E2E suite. Document the steps in `docs/runbooks/restore.md`.

**Observability:** Sentry (React SDK, source maps uploaded in CI, PII scrubbing on, `sendDefaultPii: false`). UptimeRobot watches the landing page plus a `health` RPC. Supabase advisors (security + performance lints) run in CI via `supabase db lint`.

**Security:**
- RLS on every table, and the CI lint fails if a table lacks RLS.
- CSP and security headers via Cloudflare `_headers`.
- Turnstile on magic-link and RSVP.
- Supabase auth rate limits configured.
- Invitation and RSVP tokens are 128-bit random, stored hashed, and invitations expire after 14 days.
- Storage buckets are private, with signed URLs.

## 9. GDPR basics

- Data in the EU (Frankfurt). Sub-processors listed in the privacy policy: Supabase, Cloudflare, Resend, Sentry.
- Privacy policy and terms in Romanian at `/privacy` and `/terms`. Get one legal read before launch.
- **Export:** "Download my data" produces JSON of all weddings the user owns (it reuses the v1 export idea).
- **Delete account:** removes membership. If the user is the last owner, the wedding is soft-deleted and hard-purged after 30 days by `pg_cron`.
- **Guests:** the RSVP page shows a one-line notice about who collects the data and why, with a link to the privacy policy. Collect only what's needed (no birthdays, no addresses unless the user adds them).
- **Retention:** offer to delete a wedding's guest data 12 months after the wedding date (email prompt to the owner).
- **No consent banner needed:** there are only essential cookies and storage (the auth session) and no analytics. Document this in the policy.

## 10. Free-tier limits and upgrade triggers

| Service | Free limit | Our expected use | Upgrade trigger |
|---|---|---|---|
| Supabase DB | 500 MB | ~0.5–1 MB per wedding → ~500+ active weddings | DB > 400 MB → purge old weddings, then Pro ($25) |
| Supabase MAU | 50k | far below | – |
| Supabase Realtime | 200 concurrent conns, 2M msgs/mo | ~2–5 per active wedding | > 150 concurrent |
| Supabase Storage | 1 GB | contracts only, 10 MB cap | > 800 MB → per-wedding quota |
| Supabase pause | after 7 days idle | prevented by backup + keepalive jobs | – |
| Resend | 3,000/mo, **100/day** | 1 digest/member/week + magic links | > 80/day → spread digest over 5 days; then Brevo free (300/day) as a second provider |
| Cloudflare Pages | unlimited bandwidth, 500 builds/mo | – | – |
| Sentry | 5k errors/mo | – | sample rate down |
| R2 | 10 GB | ~30 compressed dumps | – |

Donations are meant to cover the step to Supabase Pro ($25/mo) if the app grows past the free tier.

## 11. Phased delivery

> Task-level breakdown, sprint dates and status tracking: [UPDATE_PLAN.md](../../UPDATE_PLAN.md). Re-estimated there at ~24 weeks (12 sprints).

These are part-time solo + AI estimates. Each phase ends deployable to prod.

### Phase 0: Foundations (week 1)
- Decide repo ownership and domain (see §12). Move hosting to Cloudflare Pages.
- Add Biome, TanStack Router, the i18n split of `text.ts`, and Sentry.
- Create the Supabase staging + prod projects (EU). Run `supabase init`, set up local Docker, add CI skeleton jobs.
- **Exit:** the current app is unchanged for users, served from Cloudflare with real routes, and CI is green.

### Phase 1: Accounts and collaboration core (weeks 2–4)
- Auth: Google + magic link with Resend SMTP. Profiles, wedding creation (`create_wedding` RPC seeds tasks and budget), wedding picker.
- Tables: weddings, members, invitations, tasks, budget_*. RLS + pgTAP suite covering every role × table.
- Rewire Tasks and Calculator screens to TanStack Query. Remove localStorage and the backup reminder.
- Invitations: invite partner, planner, helper or viewer by email. Role management in Settings.
- Realtime broadcast + presence. The activity_log trigger exists (the feed UI comes later).
- E2E flows: sign in → create wedding → invite partner → both edit a task and see it live.
- GDPR: privacy/terms pages, export, delete account.
- **Exit (MVP launch):** two partners plan together in real time on desktop and phone.

### Phase 2: Guest list + RSVP (weeks 5–7)
- Households and guests CRUD, CSV import with column mapping, counts by side, status and diet.
- RSVP Edge Function + public `/r/:token` page + Turnstile.
- An "Actual" scenario in the budget fed by the confirmed guest count.

### Phase 3: Vendors + payments (weeks 8–9)
- Vendors, file uploads, payment schedule, link to budget lines. Migrate the `paid` logic in `src/domain/budget.ts` (update its tests, keep the v1 reference numbers).
- Upcoming payments on Home.

### Phase 4: Seating + OPIS (weeks 10–12)
- Tables, drag-and-drop on desktop, picker on phone, capacity warnings.
- OPIS / special menus / per-table PDFs (lazy-loaded).

### Phase 5: Timeline, activity feed, digest (weeks 13–14)
- Timeline CRUD + public read-only share link.
- Activity feed UI with an unread badge.
- Weekly email digest with opt-out.

### Phase 6: Hardening and public launch (weeks 15–16)
- Accessibility audit (axe + manual screen-reader pass), 360px device sweep, performance budget check.
- Restore drill, runbooks (`restore`, `rotate-secrets`, `incident`), Supabase advisors clean.
- Landing page, donation link, README rewrite, CONTRIBUTING update.

## 12. Open questions

1. ~~**Repo ownership**~~ Resolved: fork `sebaandrei/nunta-start`, with `upstream` = `cristian-preda/nunta-start`.
2. ~~**Domain**~~ Resolved: `nunta.thedevopsguy.ro`.
3. **Legal review:** who reads the Romanian privacy policy before launch?
4. **Planner experience:** is the wedding picker enough, or do planners need a cross-wedding dashboard (upcoming tasks and payments across all clients)? It's not planned, so it would come after Phase 6.

## 13. Immediate next steps

1. Answer §12.1–2.
2. Phase 0, PR 1: Cloudflare Pages + Biome + TanStack Router (keep current screens).
3. Phase 0, PR 2: Supabase project setup + first migration (`weddings`, `wedding_members`) + pgTAP harness in CI.
