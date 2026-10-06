# Runbook: deploy migrații (NS-064)

Workflow: `.github/workflows/deploy.yml`. Frontend-ul NU trece pe aici: îl
publică Cloudflare Pages singur, din Git.

## Cum funcționează

1. Merge în `main` care atinge `supabase/**` pornește workflow-ul.
2. Job `staging`: verifică numele fișierelor din `supabase/migrations/`
   (`^[0-9]{14}_[a-z0-9_]+\.sql$`), `supabase link`, `db push --dry-run`,
   `db push`, `migration list`. Automat, fără aprobare.
3. Job `production` (`needs: staging`): așteaptă aprobarea pe Environment-ul
   `production`, apoi aceiași pași pe proiectul de producție. Dacă staging
   pică, producția nu pornește.
4. Pe PR-uri, job-ul `migrations-plan` din `ci.yml` doar listează migrațiile
   noi. Nu folosește secrete și nu atinge cloud-ul.

Nu se folosește niciodată `--include-all`, `--include-seed` sau `db reset` pe
un proiect legat.

## Aprobare deploy în producție

Actions > rularea curentă > "Review deployments" > bifează `production` >
"Approve and deploy". Înainte, verifică în logul de la `staging` ce a aplicat
dry run-ul și că migrarea a trecut.

## Rulare manuală

Rulează doar din `main` (job-ul `guard` pică pe orice alt branch, ca o migrație
nemergeuită să nu ajungă în staging/producție).
Actions > "Deploy database" > "Run workflow" > `target`: `staging`,
`production` sau `both` (implicit). `production` singur sare peste staging, dar
tot cere aprobare. Rulările sunt serializate (`concurrency: deploy-db`).

## Reguli pentru migrații

- Doar înainte (forward-only). Nu edita niciodată o migrație deja aplicată.
- Compatibile înapoi pentru o versiune: frontend-ul se publică independent, deci
  build-ul vechi trebuie să meargă cu schema nouă (adaugă coloane nullable /
  cu default, șterge doar după ce nimeni nu le mai citește).

## Rollback unei migrații greșite

1. Scrie o migrație NOUĂ care repară/inversează (`supabase migration new ...`).
2. PR, merge, staging automat, apoi aprobare pentru producție.
3. Point-in-time recovery NU există pe planul gratuit. Plasa de siguranță este
   backup-ul nocturn: restaurarea din el e ultima soluție și pierde datele de
   după backup.

## Checklist la prima utilizare (pentru fiecare proiect cloud)

- [ ] Allowlist-ul populat în proiect, înainte ca prietenii să se logheze
      (`docs/runbooks/allowlist.md`, pe branch-ul `feat/backend-core`, PR #29).
- [ ] Authentication > URL Configuration: Site URL și Redirect URLs setate
      pentru domeniul fiecărui mediu.
- [ ] Environment `production` are reviewer obligatoriu.
- [ ] Prima rulare: `workflow_dispatch` cu `target: staging`, apoi `production`.
