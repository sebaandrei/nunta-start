# Runbook: invitații (NS-050 / NS-051)

Un membru cu drept de invitare (proprietar, partener, planner pentru ajutor/cititor) trimite o invitație din
Setări > Membri. Funcția `invite` creează invitația (RPC `create_invitation`, rulat cu contul celui care invită) și
trimite linkul pe email prin Resend. Linkul `/invite/<token>` e valabil 14 zile și se folosește o singură dată.
Tokenul are 128 de biți, se păstrează doar hash-uit (SHA-256) și nu se citește niciodată prin API.

## Reguli

- Invitatul trebuie să se conecteze cu **adresa pe care a primit invitația** (altfel: „adresă diferită").
- Înscrierea rămâne pe invitație (allowlist, `docs/runbooks/allowlist.md`): o adresă care nu e în `allowed_emails`
  nu își poate crea cont, deci nu poate accepta. **Adaugă prietenul în allowlist înainte să-l inviți.**
- Cel mult 20 de invitații în așteptare per nuntă; o invitație expirată se înlocuiește la o nouă invitare.

## Deploy (manual, o dată per proiect cloud)

Pipeline-ul `deploy.yml` aplică doar migrațiile; funcția se publică separat:

```bash
npx supabase link --project-ref <ref>
npx supabase secrets set RESEND_API_KEY=... INVITE_FROM='Nunta Start <invitatii@domeniul-tau.ro>' SITE_URL=https://<domeniul-aplicatiei>
npx supabase functions deploy invite
```

- `INVITE_FROM` trebuie să fie un expeditor de pe un domeniu verificat în Resend.
- `SITE_URL` fără slash la final: din el se face linkul din email.
- Fără `RESEND_API_KEY` funcția răspunde 500 „email is not configured" și nu lasă nicio invitație în așteptare.

## Local

```bash
printf 'INVITE_DEV_LOG=1\nSITE_URL=http://localhost:5173\n' > /tmp/invite.env   # în afara repo-ului
npx supabase start
npx supabase functions serve invite --env-file /tmp/invite.env
```

Cu `INVITE_DEV_LOG=1` linkul apare în logul funcției în loc să fie trimis pe email.
