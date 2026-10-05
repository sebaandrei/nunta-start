# Nunta Start: update plan (sprint backlog)

> This is the trackable task breakdown of [the production roadmap](docs/plans/2026-10-05-production-roadmap.md). The roadmap explains the **why** and the architecture; this file holds the **what** and the **when**.

**Product:** a multi-tenant wedding planner. Couples, planners and family collaborate in real time.
**URL:** `https://nunta.thedevopsguy.ro`
**Stack:** Vite + React SPA · TanStack Router/Query · Supabase free (EU) · Cloudflare Pages · Resend · Sentry
**Budget:** $0/month infrastructure (cap $5)

---

## How to use this file

- **Task IDs** (`NS-###`) are stable. Put them in commit messages and PR titles (`NS-042: tasks queries`).
- **Branch names** follow `<task_type>/<short-name>`, e.g. `feat/tasks-queries`, `fix/rsvp-token`, `chore/repo-home`, `ci/backup-job`, `docs/runbooks`. Types: `feat`, `fix`, `chore`, `ci`, `docs`, `refactor`, `test`.
- **Estimates** are in points: 1 pt ≈ 1 focused hour with AI assistance.
- **Status:** ⬜ todo · 🟨 in progress · ✅ done · ⛔ blocked · ➡️ moved to a later sprint. Update the cell in the PR that finishes the task.
- **Priority:** **P0** is the sprint goal (must ship), **P1** should ship, **P2** is a stretch to cut first.
- **Done when** is the acceptance check. A task isn't done until that line is true *and* the Definition of Done below holds.

### Capacity assumptions

| Item | Value |
|---|---|
| Team | 1 developer + AI |
| Sprint length | 2 weeks (Mon → Fri of the next week) |
| Time available | ~15 h/week → 30 h/sprint |
| Planned load | 80% → **24 pts/sprint** (less in holiday sprints) |
| Holidays deducted (RO) | 30 Nov, 1 Dec, 25–26 Dec, 1–2 Jan, 6–7 Jan |

If your real weekly hours differ, rescale: the order of the tasks stays the same and only the dates move.

### Definition of Done (every task)

- [ ] Merged to `main` through a PR, with CI green (lint, typecheck, unit, pgTAP, E2E, build)
- [ ] New tables have RLS policies **and** pgTAP tests
- [ ] New UI works at 360px width and on desktop
- [ ] UI text lives in `src/i18n/ro.ts` (no hard-coded strings)
- [ ] Migrations applied to staging; prod is applied at the sprint release
- [ ] Status in this file updated

---

## Roadmap at a glance

| Sprint | Dates | Phase | Sprint goal | Load |
|---|---|---|---|---|
| S1 | 05 Oct – 16 Oct 2026 | 0 Foundations | The current app runs on `nunta.thedevopsguy.ro` with routes, lint, Sentry and the Supabase projects ready | 22.5 / 24 |
| S2 | 19 Oct – 30 Oct | 1a Auth & tenancy | Users sign in, and the core schema is protected by RLS that tests prove | 24.5 / 24 |
| S3 | 02 Nov – 13 Nov | 1b Server data | Tasks and Calculator read and write Supabase; localStorage is gone | 24 / 24 |
| S4 | 16 Nov – 27 Nov | 1c Collaboration | Two partners edit the same wedding live | 23 / 24 |
| S5 | 30 Nov – 11 Dec | 1d MVP launch | 🚀 **v1.0 MVP live**, GDPR-ready | 19 / 19 |
| S6 | 14 Dec – 24 Dec | 2a Guests | The couple manages the full guest list, including CSV import | 17.5 / 18 |
| S7 | 28 Dec – 08 Jan 2027 | 2b RSVP | Guests answer RSVP from a link | 14 / 14 |
| S8 | 11 Jan – 22 Jan | 3 Vendors | Vendors, contracts and payment schedules drive the budget | 22 / 24 |
| S9 | 25 Jan – 05 Feb | 4a Seating | Guests are seated at tables on desktop and phone | 17.5 / 24 |
| S10 | 08 Feb – 19 Feb | 4b OPIS + 5a Timeline | OPIS PDFs and a shareable day-of timeline | 20 / 24 |
| S11 | 22 Feb – 05 Mar | 5b Notify | Activity feed and weekly email digest | 19 / 24 |
| S12 | 08 Mar – 19 Mar | 6 Launch | 🚀 **v2.0 public launch** | 21 / 24 |

**Timeline note.** The roadmap's first estimate was ~16 weeks. Breaking the work into small tasks, planning at 80% and deducting the winter holidays gives **~24 weeks (12 sprints)**. The MVP still ships in week 10.

---

## S1 · Foundations · 05 Oct – 16 Oct 2026

**Goal:** the current app is unchanged for users but served from `nunta.thedevopsguy.ro` with real routes, lint and Sentry, and the Supabase projects plus CI skeleton are ready.

| ID | P | Task | Est | Deps | Done when | Status |
|---|---|---|---|---|---|---|
| NS-001 | P0 | Repo home: fork `sebaandrei/nunta-start` (done; `upstream` = `cristian-preda`). Update `package.json` `repository`/`homepage` and the README links | 1 | – | All links point to `sebaandrei/nunta-start` and `nunta.thedevopsguy.ro` | ✅ |
| NS-002 | P0 | Create a Cloudflare Pages project linked to the repo (Node 22, `npm run build`, output `dist`) | 1 | NS-001 | A PR gets a preview URL | ⬜ |
| NS-003 | P0 | DNS: `CNAME nunta → <project>.pages.dev` at the `thedevopsguy.ro` registrar; add the custom domain in Pages | 1 | NS-002 | `https://nunta.thedevopsguy.ro` serves the app with valid TLS | ⬜ |
| NS-004 | P0 | Add `public/_redirects` (SPA fallback) and `public/_headers` (CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy) | 2 | NS-002 | Deep-link reload works; securityheaders.com grade A | ⬜ |
| NS-005 | P0 | Remove the GitHub Pages deploy; set Vite `base` to `/` | 1 | NS-003 | `deploy.yml` is removed or replaced; no Pages environment remains | ⬜ |
| NS-006 | P1 | Add Biome (lint + format) and `npm run lint`; fix findings; add a CI step | 2 | – | CI fails on a lint error | ⬜ |
| NS-007 | P0 | Install TanStack Router; replace the hash tabs with `/`, `/start`, `/calculator`, `/settings` (same screens) | 3 | NS-004 | Each tab has a URL; back/forward work; tests pass | ⬜ |
| NS-008 | P1 | i18n split: `text.ts` → `src/i18n/ro.ts` + a `Messages` type + a `useT()` hook; templates move to `src/content/ro/` | 3 | – | There's no import of `text.ts`; typecheck catches a missing key | ⬜ |
| NS-009 | P1 | Sentry: create the project; `@sentry/react` init with DSN from env; upload source maps in CI; `sendDefaultPii: false` | 2 | NS-002 | A test error appears in Sentry with a readable stack | ⬜ |
| NS-010 | P2 | UptimeRobot HTTP monitor on `nunta.thedevopsguy.ro` with email alert | 0.5 | NS-003 | The monitor is green | ⬜ |
| NS-011 | P0 | Create Supabase projects `nunta-prod` and `nunta-staging` in **eu-central-1**; save their keys in GitHub Environments `production` / `staging` | 1 | – | Both projects are active; secrets are set | ⬜ |
| NS-012 | P0 | `supabase init`, local Docker stack, `npm run db:start` / `db:reset` scripts, README dev section | 2 | NS-011 | `db:reset` runs clean locally | ⬜ |
| NS-013 | P0 | CI skeleton: lint → typecheck → vitest → `supabase start` → `db reset` → `supabase test db` (placeholder) → build | 3 | NS-006, NS-012 | A PR shows all jobs green | ⬜ |

---

## S2 · Auth & tenancy · 19 Oct – 30 Oct

**Goal:** users sign in with Google or a magic link, and the core schema (weddings, members, tasks, budget) is protected by RLS that tests prove.

| ID | P | Task | Est | Deps | Done when | Status |
|---|---|---|---|---|---|---|
| NS-014 | P1 | Cloudflare R2 bucket + `age` keypair; `backup.yml` runs a nightly encrypted `supabase db dump` (prod + staging), with 30-day lifecycle | 3 | NS-011 | A dump file is in R2 and decrypts locally | ⬜ |
| NS-015 | P1 | `keepalive.yml`: REST ping to both projects every 3 days | 0.5 | NS-011 | Runs green on schedule | ⬜ |
| NS-020 | P0 | Resend: verify the sending domain `mail.thedevopsguy.ro` (SPF, DKIM, DMARC); set Supabase custom SMTP on both projects | 2 | NS-011 | A magic-link email lands in the Gmail inbox, not spam | ⬜ |
| NS-021 | P0 | Google Cloud OAuth client: consent screen (authorized domain `thedevopsguy.ro`, privacy/terms URLs); enable in Supabase; redirect URLs for prod, staging and localhost | 2 | NS-003 | Google login works on staging. Note: without the paid custom auth domain, the consent screen shows `*.supabase.co` | ⬜ |
| NS-023 | P1 | Cloudflare Turnstile site; enable Supabase captcha protection | 1 | NS-011 | Sign-in without a token is rejected | ⬜ |
| NS-022 | P0 | Auth UI: `/login` (Google button + magic-link form with Turnstile), `/auth/callback`, sign-out, and a route guard | 4 | NS-020, NS-021, NS-023 | A signed-out user is redirected to `/login`; both methods work | ⬜ |
| NS-024 | P0 | Migration: `profiles` + a trigger on `auth.users` insert | 1 | NS-012 | A new user gets a profile row | ⬜ |
| NS-025 | P0 | Migration: `weddings`, `wedding_members`, `member_role` enum, `private.member_role()` / `has_role()` helpers, indexes | 3 | NS-024 | Migration applies on a clean DB | ⬜ |
| NS-026 | P0 | RLS for weddings and members + pgTAP: a member sees their wedding, an outsider sees nothing, a viewer can't update | 3 | NS-025 | `supabase test db` is green in CI | ⬜ |
| NS-028 | P0 | Migration: `tasks` + RLS + pgTAP (helper can edit, viewer can't) | 2 | NS-026 | Tests are green | ⬜ |
| NS-029 | P0 | Migration: `budget_settings`, `budget_scenarios` (1–4 enforced by trigger), `budget_lines` + RLS + pgTAP | 3 | NS-026 | Tests are green, including the 5th-scenario rejection | ⬜ |

---

## S3 · Server data · 02 Nov – 13 Nov

**Goal:** Tasks, Calculator and Settings read and write Supabase per wedding, and localStorage is removed.

| ID | P | Task | Est | Deps | Done when | Status |
|---|---|---|---|---|---|---|
| NS-027 | P0 | RPC `create_wedding(input, tasks_template, budget_template)`: inserts the wedding, the owner membership and the seeded tasks/lines in one transaction | 3 | NS-028, NS-029 | pgTAP: the caller is owner and 61 tasks are seeded | ⬜ |
| NS-030 | P1 | `npm run db:types` (`supabase gen types`) plus a CI check that the generated types are committed | 1 | NS-025 | CI fails on type drift | ⬜ |
| NS-040 | P0 | TanStack Query setup: a `supabase` client module, query key factory per wedding, global error toast | 2 | NS-022 | The query devtools work in dev | ⬜ |
| NS-031 | P0 | `/w` wedding picker and `/w/new` onboarding form (reuses the Onboarding screen) calling `create_wedding` | 3 | NS-027, NS-040 | A new user lands in a seeded wedding | ⬜ |
| NS-041 | P0 | Route tree under `/w/:weddingId/…`; app shell with a side nav on desktop and a bottom tab bar on mobile | 3 | NS-031 | All screens are reachable at 360px and 1280px | ⬜ |
| NS-042 | P0 | Tasks: queries + optimistic mutations (add, edit, delete, cycle status); row ↔ `Task` mapper | 4 | NS-041 | Edits survive a reload; failed writes roll back with a toast | ⬜ |
| NS-043 | P0 | Budget: queries + mutations for settings, scenarios and lines | 4 | NS-041 | The calculator totals match the v1 reference numbers | ⬜ |
| NS-044 | P1 | Settings screen: wedding date, names, EUR rate and display currency persisted to the DB | 2 | NS-041 | Changing the date moves the automatic task deadlines | ⬜ |
| NS-045 | P1 | Delete `src/storage/`, the backup reminder and the JSON import; reduce Zustand to UI-only state; update tests | 2 | NS-042, NS-043 | No `localStorage` references remain in `src/` | ⬜ |

---

## S4 · Collaboration · 16 Nov – 27 Nov

**Goal:** a partner joins through an invitation and both edit the same wedding live.

| ID | P | Task | Est | Deps | Done when | Status |
|---|---|---|---|---|---|---|
| NS-050 | P0 | `invitations` table + RLS; Edge Function `invite` creates a 128-bit token (stored hashed, 14-day expiry) and emails it through Resend | 3 | NS-020, NS-026 | The invite email arrives with a working link | ⬜ |
| NS-051 | P0 | `/invite/:token` accept flow: log in if needed, join with the invited role, handle expired or used tokens | 3 | NS-050 | The partner sees the wedding after accepting | ⬜ |
| NS-052 | P1 | Members panel in Settings: list, change role, remove, leave; the last owner can't leave | 3 | NS-051 | Rules are enforced in both RLS and the UI | ⬜ |
| NS-053 | P0 | Generic `broadcast_wedding_change()` trigger on tasks and budget tables → private channel `wedding:<id>`; RLS on `realtime.messages` | 3 | NS-028, NS-029 | An outsider can't join the channel (pgTAP) | ⬜ |
| NS-054 | P0 | Client realtime: subscribe per open wedding, patch the Query cache, refetch on reconnect | 3 | NS-053, NS-042 | An edit in tab A appears in tab B in under 1 s | ⬜ |
| NS-056 | P1 | `activity_log` table + generic audit trigger + `pg_cron` purge after 180 days | 2 | NS-028 | Rows are written for each insert, update and delete | ⬜ |
| NS-057 | P0 | Playwright in CI against the local stack; magic-link helper that reads Mailpit | 3 | NS-013, NS-022 | A sample login E2E is green in CI | ⬜ |
| NS-058 | P0 | E2E: sign in → create wedding → invite partner → both edit a task live | 3 | NS-054, NS-057 | Green in CI | ⬜ |

---

## S5 · MVP launch · 30 Nov – 11 Dec (holidays: 30 Nov, 1 Dec)

**Goal:** 🚀 **v1.0 MVP is live**, with GDPR basics and a gated deploy pipeline.

| ID | P | Task | Est | Deps | Done when | Status |
|---|---|---|---|---|---|---|
| NS-055 | P2 | Presence: avatars of members currently online in the header | 2 | NS-054 | The partner's avatar appears while they're online | ⬜ |
| NS-060 | P0 | Privacy policy + terms pages (RO) at `/privacy` and `/terms`, linked in the footer and on the OAuth consent screen. They list the sub-processors | 3 | NS-041 | Pages are live; legal review requested | ⬜ |
| NS-061 | P0 | "Download my data": an RPC returning JSON of every wedding the user owns | 2 | NS-043 | The file contains all tables for those weddings | ⬜ |
| NS-062 | P0 | Delete account: an Edge Function (service role) that removes memberships, soft-deletes weddings where the user is the last owner, plus a 30-day hard-purge cron | 3 | NS-052 | The account is gone; the wedding is purged after 30 days (tested with a shortened interval) | ⬜ |
| NS-063 | P1 | CI: `supabase db lint` + a check that fails on any table without RLS | 1 | NS-013 | CI fails on a test table without RLS | ⬜ |
| NS-064 | P0 | Deploy pipeline: `main` → staging migrations run automatically; prod migrations + the Pages prod deploy wait for the `production` environment approval | 3 | NS-013 | One approved release updates prod | ⬜ |
| NS-065 | P1 | Restore drill #1: restore the latest R2 dump into staging and run E2E; write `docs/runbooks/restore.md` | 2 | NS-014 | The runbook is followed end-to-end successfully | ⬜ |
| NS-066 | P1 | Mobile pass at 360px for Tasks, Calculator and Settings; `@axe-core/playwright` in E2E | 2 | NS-058 | No serious or critical axe violations | ⬜ |
| NS-067 | P0 | 🚀 Release v1.0: tag, CHANGELOG, prod migration, smoke test on `nunta.thedevopsguy.ro` | 1 | all S5 P0 | Two real users plan together on prod | ⬜ |

---

## S6 · Guest list · 14 Dec – 24 Dec (holiday: 25 Dec falls after)

**Goal:** the couple manages the full guest list by household, including CSV import from WeddingWire or Excel.

| ID | P | Task | Est | Deps | Done when | Status |
|---|---|---|---|---|---|---|
| NS-070 | P0 | Migration: `households`, `guests` (side, age group, diet, attending enums) + RLS + pgTAP | 3 | NS-026 | Tests are green; a helper can edit | ⬜ |
| NS-071 | P0 | Attach the realtime and audit triggers to the guest tables | 0.5 | NS-053, NS-056, NS-070 | Live updates work for guests | ⬜ |
| NS-075 | P0 | Domain: guest stats (total, adults/kids, by side, by RSVP status, by diet) + unit tests | 2 | – | Vitest is green | ⬜ |
| NS-072 | P0 | Guest list UI on desktop: households with nested guests, inline edit, side and status filters, stats bar | 5 | NS-070, NS-075 | 300 guests render smoothly | ⬜ |
| NS-073 | P1 | Guest list on mobile: household cards and a guest edit sheet | 2 | NS-072 | Usable at 360px | ⬜ |
| NS-074 | P1 | CSV import: parse with papaparse, column-mapping step, preview, duplicate-name warning, bulk insert | 5 | NS-070 | A sample WeddingWire export imports correctly | ⬜ |

---

## S7 · RSVP · 28 Dec – 08 Jan 2027 (holidays: 1–2 Jan, 6–7 Jan)

**Goal:** each household answers its RSVP from a link, with no account.

| ID | P | Task | Est | Deps | Done when | Status |
|---|---|---|---|---|---|---|
| NS-080 | P0 | Per-household RSVP token (stored hashed) + "Copy link" and "Share on WhatsApp" buttons | 2 | NS-072 | A link is generated and copied | ⬜ |
| NS-081 | P0 | Edge Function `rsvp`: GET the household by token, POST the answers; Turnstile check; per-IP rate limit | 4 | NS-080, NS-023 | An invalid token gives 404; a bot gets rejected | ⬜ |
| NS-082 | P0 | Public `/r/:token` page: household members, attending, diet, note, GDPR notice; mobile-first | 4 | NS-081 | A guest answers on a phone; the couple sees it live | ⬜ |
| NS-083 | P1 | Budget: an "Actual" scenario fed by the confirmed guest count | 2 | NS-075, NS-043 | Its card updates as RSVPs arrive | ⬜ |
| NS-084 | P1 | E2E: the RSVP flow from an anonymous browser | 2 | NS-082 | Green in CI | ⬜ |

---

## S8 · Vendors & payments · 11 Jan – 22 Jan

**Goal:** vendors, contracts and payment schedules drive "paid" and "remaining" in the budget.

| ID | P | Task | Est | Deps | Done when | Status |
|---|---|---|---|---|---|---|
| NS-090 | P0 | Migration: `vendors`, `vendor_files`, `payments` + RLS + pgTAP; move `budget_lines.paid` into payment rows, then drop the column | 4 | NS-029 | Existing paid amounts are preserved as payments | ⬜ |
| NS-091 | P0 | Private Storage bucket `contracts`: path `wedding_id/…`, RLS by membership, 10 MB limit | 2 | NS-090 | An outsider can't fetch a file (pgTAP + manual check) | ⬜ |
| NS-092 | P0 | `src/domain/budget.ts`: compute paid from payments; update the tests while keeping the v1 reference numbers | 3 | NS-090 | Vitest is green with the same totals | ⬜ |
| NS-093 | P0 | Vendors UI: list + detail (contact, notes, linked budget lines) | 4 | NS-090 | CRUD works on desktop and mobile | ⬜ |
| NS-094 | P1 | Contract upload and download through signed URLs | 3 | NS-091, NS-093 | A PDF uploads and opens | ⬜ |
| NS-095 | P0 | Payment schedule UI per vendor or line: add installment, due date, mark paid | 4 | NS-092, NS-093 | The budget's "remaining" updates live | ⬜ |
| NS-096 | P1 | Home screen: "Upcoming payments" widget (next 30 days) | 2 | NS-095 | Shows the correct items | ⬜ |

---

## S9 · Seating · 25 Jan – 05 Feb

**Goal:** guests are seated at tables, by drag-and-drop on desktop and through a picker on phone.

| ID | P | Task | Est | Deps | Done when | Status |
|---|---|---|---|---|---|---|
| NS-100 | P0 | Migration: `seating_tables` (number, name, kind `prezidiu`/`regular`/`kids`, capacity) + `guests.table_id`/`seat_no` + RLS + pgTAP | 2 | NS-070 | Tests are green | ⬜ |
| NS-105 | P0 | Attach the realtime and audit triggers to the seating tables | 0.5 | NS-100 | Live updates work | ⬜ |
| NS-104 | P0 | Domain: seating stats + OPIS sort with `Intl.Collator('ro')` (ă, â, î, ș, ț ordering) + tests | 3 | – | Vitest covers the diacritics ordering | ⬜ |
| NS-101 | P0 | Tables CRUD UI | 3 | NS-100 | Tables can be created, renamed and deleted | ⬜ |
| NS-102 | P0 | Desktop seating board with `dnd-kit`: an unassigned column, table cards, capacity warnings | 6 | NS-101, NS-104 | A 300-guest wedding seats without lag | ⬜ |
| NS-103 | P1 | Mobile: per-guest "Choose table" bottom sheet | 3 | NS-101 | Usable at 360px | ⬜ |

---

## S10 · OPIS + timeline · 08 Feb – 19 Feb

**Goal:** print-ready OPIS PDFs and a shareable day-of timeline.

| ID | P | Task | Est | Deps | Done when | Status |
|---|---|---|---|---|---|---|
| NS-110 | P0 | Lazy-loaded `@react-pdf/renderer`: alphabetical OPIS PDF | 4 | NS-104 | The PDF opens; the main bundle doesn't grow | ⬜ |
| NS-111 | P0 | PDFs for special menus per table and kids per table | 3 | NS-110 | The counts match the seating board | ⬜ |
| NS-112 | P2 | Per-table cards PDF | 2 | NS-110 | Prints on A4 | ⬜ |
| NS-120 | P0 | Migration: `timeline_events` + per-wedding share token + RLS + pgTAP | 2 | NS-026 | Tests are green | ⬜ |
| NS-121 | P0 | Timeline UI: CRUD, reorder, link to a vendor | 4 | NS-120, NS-093 | Works on mobile | ⬜ |
| NS-122 | P1 | Public `/t/:token` read-only page + print CSS | 3 | NS-121 | A vendor opens the link without an account; it prints cleanly | ⬜ |
| NS-123 | P1 | E2E: seating and timeline happy paths | 2 | NS-102, NS-121 | Green in CI | ⬜ |

---

## S11 · Activity feed + digest · 22 Feb – 05 Mar

**Goal:** collaborators see what changed in the app and get a weekly email of what's due.

| ID | P | Task | Est | Deps | Done when | Status |
|---|---|---|---|---|---|---|
| NS-130 | P0 | Activity feed page `/w/:id/activity`: paginated, with readable Romanian summaries ("Ana a marcat «Rezervați locația» ca gata") | 4 | NS-056 | Shows changes from every module | ⬜ |
| NS-131 | P1 | Unread badge: a `last_seen_activity_at` per member | 2 | NS-130 | The badge clears when the feed is opened | ⬜ |
| NS-132 | P0 | Edge Function `send-digest`: per member, list tasks due in 14 days, overdue tasks, payments due and new RSVPs | 4 | NS-095, NS-082 | Dry-run output is correct for the seed data | ⬜ |
| NS-133 | P0 | Digest email template (RO, plain responsive HTML) with an unsubscribe link | 3 | NS-132 | Renders correctly in Gmail web and on mobile | ⬜ |
| NS-134 | P0 | `pg_cron` + `pg_net` on Mondays at 08:00 Europe/Bucharest; spread sends when near Resend's 100/day cap; `email_log` table | 3 | NS-132 | A staging run sends and logs | ⬜ |
| NS-135 | P1 | Profile setting: digest on/off (honored by the unsubscribe link) | 1 | NS-133 | An opted-out user gets nothing | ⬜ |
| NS-136 | P2 | Retention prompt: email the owner 12 months after the wedding, offering to delete guest data | 2 | NS-134 | Fires on test data with a past date | ⬜ |

---

## S12 · Hardening & launch · 08 Mar – 19 Mar

**Goal:** 🚀 **v2.0 public launch**, accessible, fast and operable.

| ID | P | Task | Est | Deps | Done when | Status |
|---|---|---|---|---|---|---|
| NS-140 | P0 | Accessibility audit: axe on all routes + a VoiceOver pass; fix the findings | 4 | – | WCAG 2.2 AA: no critical issues | ⬜ |
| NS-141 | P0 | 360px device sweep across all modules | 3 | – | Nothing scrolls horizontally; touch targets are ≥ 44px | ⬜ |
| NS-142 | P1 | Performance budget: bundle analyzer, initial JS < 200 KB gzip, route splitting | 2 | – | The budget is checked in CI | ⬜ |
| NS-143 | P1 | Runbooks: `rotate-secrets.md`, `incident.md` | 2 | – | Committed under `docs/runbooks/` | ⬜ |
| NS-144 | P1 | Restore drill #2 | 1 | NS-065 | Dated entry in the runbook | ⬜ |
| NS-145 | P0 | Supabase security and performance advisors show zero warnings | 2 | – | The advisors are clean on prod | ⬜ |
| NS-146 | P0 | Prerendered landing page at `/` (features, screenshots, donation link); the app moves to `/w` | 4 | – | Lighthouse ≥ 95 on the landing page | ⬜ |
| NS-147 | P1 | Rewrite the README and CONTRIBUTING for the new architecture | 2 | – | A new contributor runs the stack locally from the README | ⬜ |
| NS-148 | P0 | 🚀 Release v2.0: tag, CHANGELOG, announcement | 1 | all S12 P0 | Live on `nunta.thedevopsguy.ro` | ⬜ |

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Real part-time hours fall below 15 h/week | Dates slip | Cut the P2 items first; the order of the tasks stays fixed |
| Supabase free project pauses after 7 days idle | Prod goes down | The nightly backup (NS-014) and keepalive (NS-015) jobs generate activity |
| No Supabase backups on the free tier | Data loss | Encrypted nightly dumps to R2, plus restore drills (NS-065, NS-144) |
| Resend's 100 emails/day cap | Magic links or digests delayed | Spread the digest across the week (NS-134); add Brevo's free tier as a fallback SMTP |
| Google OAuth consent screen shows `*.supabase.co` | Lower user trust | Accept on the free tier; the magic link is an alternative; custom auth domain is a paid add-on later |
| Google app verification delays | Google login is limited to test users | Submit the verification in S2, right after NS-021 |
| Realtime free limit of 200 concurrent connections | Live updates stop at peak | One channel per open wedding; watch usage in the dashboard |
| Data migration in NS-090 (paid → payments) | Lost paid amounts | Migration test with seed data; take a backup before the prod release |
| Legal text accuracy (RO) | GDPR exposure | Request a legal read in S5 (NS-060) before the v1.0 release |

## Key dates

| Date | Event |
|---|---|
| Mon 05 Oct 2026 | S1 starts |
| Fri 16 Oct 2026 | Foundations done; app on `nunta.thedevopsguy.ro` |
| Fri 11 Dec 2026 | 🚀 v1.0 MVP (accounts + live collaboration on Tasks and Budget) |
| Fri 08 Jan 2027 | RSVP live |
| Fri 05 Feb 2027 | Seating live |
| Fri 19 Mar 2027 | 🚀 v2.0 public launch |

**Sprint rituals (solo version):** Monday planning (15 min: pick the tasks, update their status) and Friday demo + retro (15 min: release to prod, note one thing to change).

## Open items

1. ~~**Repo home**~~ Resolved: work happens in the fork `sebaandrei/nunta-start`.
2. **Legal reviewer** for the privacy policy and terms (NS-060).
3. **Planner cross-wedding dashboard:** not scheduled; candidate for after v2.0.
