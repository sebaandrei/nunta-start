# Nunta Start

Un plan de pornire pentru nuntă, gratuit și open source.

**Deschide aplicația: [nunta.thedevopsguy.ro](https://nunta.thedevopsguy.ro)**

Pornit ca fork al [cristian-preda/nunta-start](https://github.com/cristian-preda/nunta-start). Planul de evoluție spre o aplicație cu conturi și colaborare în timp real e în [UPDATE_PLAN.md](UPDATE_PLAN.md).

Are două părți:

- **Start:** ce aveți de făcut și până când. Sunt 61 de taskuri românești, cu termene calculate din data nunții.
- **Calculator:** cât vă costă nunta și dacă ieșiți pe zero, în 1–4 scenarii de invitați. Arată și darul de echilibru și ce mai e de plătit.

Nu are cont și nici server. Datele rămân în browserul vostru, iar o copie se poate descărca oricând.

Nu e încă o aplicație de wedding planning. Lista de invitați rămâne unde o țineți deja (WeddingWire, Excel). Aici e doar partea care lipsește din ele: ce urmează și cât costă.

## Cum se folosește

1. Deschideți pagina și scrieți data nunții și prenumele voastre.
2. Uitați-vă în **Start**: taskurile sunt grupate pe etape, cu ce aveți de făcut acum sus. Ce era deja de făcut când ați început apare în „De recuperat".
3. Completați prețurile în **Calculator**. Fiecare linie e fie pe invitat (meniu, băuturi), fie fixă (formație, foto-video).
4. Din **Setări**, descărcați din când în când o copie. Pe un alt telefon, sau la partener, o încărcați la loc.

## Dezvoltare

Aveți nevoie de Node 22 sau mai nou.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # teste Vitest
npm run build    # build în dist/
```

Stack: Vite, React, TypeScript, Zustand, Zod, Tailwind CSS v4, Vitest.

```
src/
  domain/      calculele și regulile (buget, etape, termene), fără React
  content/     șablonul de taskuri și liniile de buget, în JSON
  storage/     salvarea în browser și copia descărcabilă
  screens/     ecranele
  components/  piese de interfață comune
  text.ts      toate textele interfeței
```

Designul complet e în [`docs/superpowers/specs/2026-10-05-nunta-start-design.md`](docs/superpowers/specs/2026-10-05-nunta-start-design.md).

## Publicare

Aplicația e publicată pe Cloudflare Pages, la [nunta.thedevopsguy.ro](https://nunta.thedevopsguy.ro). Cloudflare face build la fiecare push: `main` merge în producție, iar fiecare pull request primește un URL de preview. GitHub Actions rulează testele și build-ul pe pull request și pe `main`.

Setări în Cloudflare Pages: build command `npm run build`, output `dist`, Node din `.node-version`. Headerele de securitate sunt în `public/_headers`.

## Contribuții

Cea mai utilă contribuție e experiența voastră de la propria nuntă: taskuri care lipsesc, termene greșite, întrebări pe care ar fi trebuit să le puneți furnizorilor. Detalii în [CONTRIBUTING.md](CONTRIBUTING.md).

## Licență

[MIT](LICENSE)
