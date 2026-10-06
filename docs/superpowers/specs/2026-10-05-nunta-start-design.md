# Nunta Start: design v1

Data: 2026-10-05
Stare: aprobat secțiune cu secțiune în conversație. La cererea autorului s-a trecut direct la implementare, fără review separat al specului și fără plan scris.

## Scop

O pagină web gratuită și open source pentru cuplurile la început de drum cu nunta. Răspunde la două întrebări:

1. **Ce avem de făcut și până când?** (Start)
2. **Cât ne costă și ieșim pe zero?** (Calculator)

Pornește din sheet-urile de organizare folosite la mai multe nunți și botezuri reale (taburile „To do", „Calculator", „Calcule finale", „Clarificări", „Program zi nuntă"), transformate într-o interfață ușor de citit în loc de încă un Excel.

## Ce nu este

- Nu ține lista de invitați. Lista rămâne în WeddingWire sau în sheet.
- Fără conturi, server, sincronizare sau notificări.
- Fără print: plicurile, meniurile și OPIS-ul se fac pe design propriu.
- **Liste** (OPIS alfabetic, meniuri speciale pe mese și scaune pe masă, generate din exportul WeddingWire și din răspunsurile RSVP) este v2, cu spec separat.

## Principii

- Un link, fără cont. Datele stau doar în browserul folosit, plus o copie descărcabilă.
- Interfața e în română, cu concepte românești (dar, nași, OPIS, prezidiu). Sumele sunt în RON și EUR.
- Fără analytics și fără apeluri de rețea după încărcare.

## Calculator

### Model

- **Linie de buget:** nume, tip, preț (gol = necompletat), monedă (EUR sau RON), plătit până acum (în moneda liniei), observații. Tipul e unul din două:
  - **Fix** = același cost oricâți invitați vin, înmulțit cu câte bucăți (implicit 1, de ex. 8 meniuri de copil);
  - **Pe invitat** = prețul e de persoană și se înmulțește cu numărul de invitați din scenariu.
- În interfață, vocabularul e cel din sheet-urile reale („Fix" / „Pe invitat"). Lângă prețurile pe invitat scrie „/ invitat", iar deasupra tabelului o frază explică cele două tipuri.
- **Scenarii de invitați:** între 1 și 4 numere, dintre care unul e selectat.
- **Dar mediu de persoană** și **sumă de la familie**, fiecare cu moneda lui.
- **Cursul** (lei pentru 1 €) și **moneda de afișare**. Ambele stau în setări.

### Formule (pentru un scenariu cu `G` invitați, totul convertit în moneda de afișare)

- `total linie = preț unitar × (G dacă e × invitați, altfel numărul fix)`; prețul gol contează ca 0
- `cost total = Σ total linie`
- `cost pe invitat = cost total / G`
- `venit = dar mediu × G + familie`
- `bilanț = venit − cost total`
- `dar de echilibru = max(0, (cost total − familie) / G)`
- `rest pe linie = max(0, total linie − plătit)`; `rest de plată = Σ rest pe linie`

### Pornire

Calculatorul vine cu 20 de linii tipice (meniu, băuturi, tort, mărturii, formație, foto-video, flori, rochie, costum, verighete, păr și machiaj, invitații, printuri, hostess, cununia civilă, biserică, event planner și altele), toate cu prețul gol. Primul scenariu e numărul de invitați dat la pornire, sau 200 dacă nu e dat.

### În afara v1

Facturi și istoric de plăți, legătura automată cu lista de invitați, dar calculat pe familii.

## Start

### Task

Activitate, categorie, responsabil (`p1`, `p2` sau amândoi), status (De făcut / În lucru / Gata), detalii, observații și termen.

**Termenul** are două surse:

- `daysBefore`: offsetul din șablon, în zile înainte de nuntă (negativ = după nuntă);
- `manualDate`: data pusă de mână, care are prioritate.

`termen efectiv = manualDate ?? (nuntă − daysBefore) ?? fără termen`. Dacă se schimbă data nunții, termenele automate se mută, cele manuale nu. Golirea datei la un task din șablon îl readuce la termenul automat.

### Etape

Etapa unui task **se calculează din termenul efectiv**, nu se stochează. Așa, un task mutat pe altă dată ajunge singur în etapa potrivită.

| Etapă | Se termină la |
|---|---|
| Peste 12 luni înainte | nuntă − 12 luni |
| 9–12 luni înainte | nuntă − 9 luni |
| 6–9 luni înainte | nuntă − 6 luni |
| 3–6 luni înainte | nuntă − 3 luni |
| 1–3 luni înainte | nuntă − 1 lună |
| Ultima lună | nuntă − 8 zile |
| Ultima săptămână | nuntă − 1 zi |
| Ziua nunții | nuntă |
| După nuntă | fără capăt |

- **Etapa curentă** este etapa în care cade ziua de azi.
- **De recuperat:** taskuri nefinalizate dintr-o etapă care a trecut. Apar sus, grupate, și nu sunt marcate ca întârziate.
- Taskurile terminate din etapele trecute apar într-un grup restrâns, la final.
- Taskurile fără termen au grupul lor.

### Vederi

- **Pe etape** (implicit): De recuperat, apoi etapele de la cea curentă înainte. Etapa curentă e deschisă, cele viitoare sunt restrânse.
- **Pe categorii.**
- **Filtru pe responsabil:** Toți / persoana 1 / persoana 2 / Amândoi. Filtrul pe o persoană arată și taskurile comune.

### Șablonul

`src/content/tasks.ro.json` are 61 de taskuri, draft scris din sheet-urile reale. Autorul îl revizuiește înainte de publicare. Fiecare task are `id`, `title`, `category`, `daysBefore` și `details`. La pornire, șablonul se copiază în datele cuplului, care îl pot modifica liber.

Un task nou primește ca termen sfârșitul etapei curente și se deschide direct în editare.

## Ecrane

- **Prima deschidere:** data nunții, cele două prenume, numărul estimat de invitați (opțional).
- **Acasă:** trei cifre (taskuri gata, bilanțul la scenariul selectat, plătit din total), primele 5 taskuri nefinalizate (cele de recuperat primele, apoi după termen) și reminderul de copie.
- **Start:** vederile de mai sus, cu editarea taskului în același rând.
- **Calculator:** setări (scenarii, dar, familie, curs, monedă), un card pe scenariu (bilanț, cost total, cost pe invitat, dar de echilibru), apoi tabelul de linii cu total, plătit și rest.
  - În tabel, câmpurile se editează pe loc. Arată ca text, iar chenarul apare la hover și la editare.
  - Alegerile cu două variante (tipul liniei, moneda) sunt comutatoare vizibile, nu liste derulante.
  - Observațiile unei linii apar doar dacă există sau dacă sunt deschise din „+ observații". Butonul de ștergere a liniei apare la hover.
  - Numerele din câmpuri au punct la mii („4.500"). La scriere, „4.500" înseamnă 4500, iar virgula e zecimală.
  - Pe telefon, scenariile devin un comutator și liniile devin carduri cu câmpuri obișnuite.
- **Setări:** data, numele, cursul, moneda de afișare, plus descarcă, încarcă și șterge tot.

Taburile sunt în hash-ul adresei (`#acasa`, `#start`, `#calculator`, `#setari`), ca reîncărcarea paginii să păstreze tabul.

## Salvare

- Datele se salvează în `localStorage`, sub cheia `nunta-start:v1`, la fiecare modificare.
- **Copia descărcabilă** e un JSON `{ app: "nunta-start", version: 1, exportedAt, data }`, cu numele `nunta-start-<nume>-<data>.json`.
- **Încărcarea unei copii** e validată cu Zod.
  - JSON invalid, altă aplicație, altă versiune sau formă greșită dau fiecare un mesaj clar, iar datele existente rămân neatinse.
  - O copie validă înlocuiește datele numai după confirmare.
- **Browserul nu poate salva** (mod privat, spațiu plin): apare un banner permanent care cere descărcarea unei copii.
- **Date salvate care nu se pot citi:** pe ecranul de pornire apare un mesaj cu un buton care descarcă datele brute.
- **Reminder de copie:** dacă datele s-au modificat după ultima copie și au trecut cel puțin 14 zile de la ea (sau de la creare, dacă nu există nicio copie), Acasă afișează reminderul.

## Structura codului

```
src/
  domain/      schema (Zod), dates, budget, tasks, initial — fără React
  content/     tasks.ro.json, budget.ro.json, validate la import
  storage/     localStorage, copie, reminder
  screens/     Onboarding, Home, Start, Calculator, Settings
  components/  ui, TaskRow, ImportButton
  lib/         format (bani, date, plural românesc), download
  text.ts      toate textele interfeței
  store.ts     Zustand, salvare automată
```

Stack: Vite, React, TypeScript, Zustand, Zod, Tailwind v4 și Vitest. Nu se folosește bibliotecă de componente.

## Teste

- **Calculator:** exemplul din machetă e reper. Scenariile de 200 / 260 / 320 de invitați dau −3.480 / +1.500 / +6.480 €, iar la 260 de invitați plătit 7.600 € și rest 48.100 €. Se mai testează conversia, darul de la familie și plata peste total.
- **Taskuri:** capetele etapelor, etapa curentă, termen automat vs manual la schimbarea datei, De recuperat, partiționarea completă pe grupuri, ordinea din Acasă și filtrul pe responsabil.
- **Salvare:** descărcare urmată de încărcare dă aceleași date; cele patru erori de încărcare; citirea din storage (gol / ok / corupt / indisponibil); reminderul.
- **Conținut:** id-uri unice, categorii valide, fiecare etapă are taskuri.

## Publicare

- GitHub Pages, cu GitHub Actions la push pe `main`: teste, build, deploy.
- Pe pull request rulează doar teste și build.
- `base: './'`, ca site-ul să meargă indiferent de numele repo-ului.
- Licență MIT. README în română și ghid de contribuție pentru șablon.

## Decizii de revizuit

- Cursul implicit este 5,00 lei/€. Moneda de afișare implicită e EUR.
- Etapa „Ultima lună" se termină cu 8 zile înainte, ca „Ultima săptămână" să acopere exact ultimele 7 zile.
- Filtrul pe o persoană include și taskurile comune.
- Detaliile despre cununia civilă (declarația cu cel puțin 10 zile înainte, certificatul prenupțial cu valabilitate scurtă) sunt formulate prudent și trimit la primăria locală.
