# Cum contribuiți

## Taskuri noi sau corecturi la șablon

Șablonul e în [`src/content/tasks.ro.json`](src/content/tasks.ro.json). Fiecare task arată așa:

```json
{
  "id": "rezervare-locatie",
  "title": "Rezervați locația și semnați contractul",
  "category": "locatie",
  "daysBefore": 375,
  "details": "De întrebat: scenă proprie sau a formației · câți ospătari…"
}
```

- **id:** unic, cu litere mici, cifre și cratimă. Nu se schimbă după publicare.
- **title:** o acțiune scurtă, la persoana a doua plural („Rezervați…", „Alegeți…").
- **category:** una dintre `buget`, `invitati`, `locatie`, `muzica`, `foto`, `decor`, `print`, `tinute`, `acte`, `ziua`, `altele`.
- **daysBefore:** cu câte zile înainte de nuntă e termenul. `0` înseamnă ziua nunții, iar un număr negativ înseamnă după nuntă. Etapa („9–12 luni înainte" etc.) se calculează automat din termen.
- **details:** opțional. Ce ați fi vrut să știți: întrebări pentru furnizori, capcane, termene legale.

Taskurile sunt în ordinea termenului. Păstrați ordinea când adăugați unul.

Testele verifică automat că id-urile și titlurile sunt unice, că fiecare etapă are taskuri și că termenele sunt rezonabile. Rulați `npm test` înainte de pull request.

## Linii de buget

Liniile cu care pornește Calculatorul sunt în [`src/content/budget.ro.json`](src/content/budget.ro.json). Fiecare are `name`, `currency` (`EUR` sau `RON`) și `perGuest` (`true` dacă se înmulțește cu numărul de invitați).

## Cod

- Calculele și regulile stau în `src/domain/` și au teste în același folder. O schimbare de formulă vine cu test.
- Textele interfeței stau toate în `src/text.ts`.
- Fără dependențe noi fără o discuție înainte. Proiectul trebuie să rămână mic.

## Date personale

Nu puneți date reale de invitați în issue-uri, teste sau capturi de ecran.
