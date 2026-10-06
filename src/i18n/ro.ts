import type { Category, Owner, Status } from '../domain/schema';
import type { StageId } from '../domain/tasks';
import { countLabel } from '../lib/format';
import type { BackupError } from '../storage/storage';

/** Toate textele interfeței, într-un singur loc. */
export const ro = {
  appName: 'Nunta Start',
  tagline: 'Ce aveți de făcut și până când, plus cât vă costă. Fără cont: totul rămâne în browserul vostru.',

  header: {
    couple: (a: string, b: string) => [a, b].filter((n) => n.trim()).join(' & ') || 'Nunta voastră',
  },

  shell: {
    skip: 'Sari la conținut',
    mainNav: 'Navigare principală',
    section: 'Planificare',
    caption: 'Planul vostru',
    nav: { home: 'Acasă', tasks: 'Taskuri', budget: 'Calculator buget', settings: 'Setări' },
    /** Etichetele scurte din bara de jos de pe telefon. */
    tab: { home: 'Acasă', tasks: 'Taskuri', budget: 'Buget', settings: 'Setări' },
    badgeLabel: (n: number) => `${countLabel(n, 'task', 'taskuri')} de recuperat`,
    coupleLabel: 'Spațiul vostru',
    privacyTitle: 'Planul vostru, în siguranță',
    privacyBody: 'Salvat în contul vostru, vizibil doar pentru voi și persoanele invitate.',
    theme: 'Temă',
    themeLight: 'Luminos',
    themeDark: 'Întunecat',
    toLight: 'Treceți la tema luminoasă',
    toDark: 'Treceți la tema întunecată',
    language: 'Limbă',
    toLanguage: (other: string) => `Schimbați limba în ${other}`,
  },

  greeting: { morning: 'Bună dimineața', afternoon: 'Bună ziua', evening: 'Bună seara' },

  pages: {
    home: { subtitle: 'Încă puțin și începe povestea voastră. Iată ce urmează.' },
    tasks: {
      title: 'Planul de pregătire',
      subtitle: 'Un pas pe rând. Vedeți ce e important acum și ce urmează.',
    },
    budget: {
      title: 'Bugetul nunții',
      subtitle: 'O imagine clară a costurilor, înainte să luați următoarea decizie.',
    },
    settings: {
      eyebrow: 'Planificatorul vostru',
      title: 'Setări',
      subtitle: 'Personalizați spațiul vostru și păstrați datele în siguranță.',
    },
  },

  onboarding: {
    title: 'Când e nunta?',
    date: 'Data nunții',
    dateHint: 'Din ea se calculează termenele taskurilor.',
    names: 'Cum vă cheamă',
    namePlaceholder1: 'Prenume',
    namePlaceholder2: 'Prenume',
    guests: 'Câți invitați estimați (opțional)',
    guestsHint: 'Pornește primul scenariu din Calculator. Îl schimbați oricând.',
    guestsPlaceholder: 'ex. 200',
    start: 'Începe',
    import: 'Am deja o copie salvată',
    corrupt:
      'Datele salvate în acest browser nu au putut fi citite. Descărcați-le înainte să începeți din nou, ca să nu se piardă.',
    corruptDownload: 'Descarcă datele vechi',
  },

  storage: {
    unavailable:
      'Browserul nu poate salva datele (mod privat sau spațiu plin). Descărcați o copie din Setări ca să nu pierdeți ce lucrați.',
    reminder: (days: number | null) =>
      days === null
        ? 'N-ați descărcat încă nicio copie a datelor.'
        : `Ultima copie descărcată e de acum ${countLabel(days, 'zi', 'zile')}.`,
    reminderAction: 'Descarcă o copie',
  },

  status: { todo: 'De făcut', doing: 'În lucru', done: 'Gata' } satisfies Record<Status, string>,
  statusHint: 'Apasă ca să schimbi statusul',

  categories: {
    buget: 'Buget',
    invitati: 'Invitați',
    locatie: 'Locație și meniu',
    muzica: 'Muzică',
    foto: 'Foto-video',
    decor: 'Flori și decor',
    print: 'Print',
    tinute: 'Ținute',
    acte: 'Acte și biserică',
    ziua: 'Ziua nunții',
    altele: 'Altele',
  } satisfies Record<Category, string>,

  stages: {
    m12plus: 'Peste 12 luni înainte',
    m9_12: '9–12 luni înainte',
    m6_9: '6–9 luni înainte',
    m3_6: '3–6 luni înainte',
    m1_3: '1–3 luni înainte',
    lastMonth: 'Ultima lună',
    lastWeek: 'Ultima săptămână',
    day: 'Ziua nunții',
    after: 'După nuntă',
  } satisfies Record<StageId, string>,

  owner: (owner: Owner, names: readonly [string, string]) => {
    if (owner === 'p1') return names[0].trim() || 'Persoana 1';
    if (owner === 'p2') return names[1].trim() || 'Persoana 2';
    return 'Amândoi';
  },

  home: {
    tasks: 'Taskuri',
    tasksDone: (done: number, total: number) => `${done} din ${total}`,
    tasksDetail: (recover: number, current: number) => `${recover} de recuperat · ${current} în etapa curentă`,
    balance: (guests: number) => `Bilanț la ${countLabel(guests, 'invitat', 'invitați')}`,
    cost: (guests: number) => `Cost la ${countLabel(guests, 'invitat', 'invitați')}`,
    breakEven: (amount: string) => `Dar de echilibru: ${amount} de persoană`,
    needPrices: 'Completați prețurile în Calculator ca să vedeți bilanțul.',
    needGift: 'Puneți darul mediu în Calculator ca să vedeți bilanțul.',
    payments: 'Plăți',
    paidOf: (total: string, rest: string) => `din ${total} · rest de plată ${rest}`,
    next: 'De făcut acum',
    nextHint: 'primele taskuri nefinalizate, în ordinea termenului',
    allDone: 'Ați terminat tot. Felicitări!',
    goCalculator: 'Deschide Calculatorul',
    goStart: 'Toate taskurile',
  },

  tasks: {
    byStage: 'Pe etape',
    byCategory: 'Pe categorii',
    ownerFilter: 'Responsabil',
    viewLabel: 'Vedere',
    all: 'Toți',
    add: 'Adaugă un task',
    doneCount: (done: number, total: number) => `${done} din ${total} gata`,
    recover: 'De recuperat',
    recoverHint: 'din etape care au trecut',
    noDate: 'Fără termen',
    finished: 'Gata, din etapele trecute',
    until: (date: string) => `până la ${date}`,
    current: 'etapa curentă',
    count: (n: number) => countLabel(n, 'task', 'taskuri'),
    dueRecover: 'de recuperat',
    dueNone: 'fără termen',
    empty: 'Niciun task aici.',
    emptyFilter: 'Niciun task pentru filtrul ăsta.',
    untitled: 'Task fără nume',
    edit: {
      title: 'Activitate',
      titlePlaceholder: 'Ce trebuie făcut?',
      category: 'Categorie',
      owner: 'Responsabil',
      status: 'Status',
      due: 'Termen',
      dueAuto: (date: string) => `Automat: ${date}`,
      dueManual: 'Pus de mână',
      resetDue: 'Revino la termenul automat',
      details: 'Detalii',
      note: 'Observații',
      remove: 'Șterge taskul',
      confirmRemove: 'Ștergeți taskul ăsta?',
      close: 'Gata',
    },
  },

  calc: {
    scenarios: 'Scenarii de invitați',
    addScenario: 'Adaugă scenariu',
    removeScenario: 'Scoate scenariul',
    gift: 'Dar mediu de persoană',
    family: 'Contribuție familie',
    rate: 'Curs de schimb',
    ratePrefix: '1 € =',
    display: 'Moneda afișată',
    scenario: (guests: number) => countLabel(guests, 'invitat', 'invitați'),
    selected: 'selectat',
    perPerson: (amount: string) => `${amount} / persoană`,
    estimatedBalance: 'Bilanț estimat',
    costTotal: 'Cost total',
    compareTitle: 'Comparați scenariile',
    compareHint: 'Selectați numărul de invitați pentru a vedea cum se schimbă bilanțul.',
    expensesTitle: 'Cheltuieli pe categorie',
    totalEstimated: 'Total estimat',
    emptyNote: 'Costurile goale sunt incluse ca 0 în estimare.',
    emptyTitle: 'Nicio cheltuială încă',
    emptyText: 'Adăugați prima cheltuială ca să vedeți bilanțul estimat și costul pe invitat.',
    toPay: (amount: string) => `De plată ${amount}`,
    paidAmount: (amount: string) => `Plătit ${amount}`,
    expenseList: 'Cheltuieli',
    breakEven: (amount: string) => `Dar de echilibru: ${amount}`,
    giftMissing: 'Puneți darul mediu de persoană ca să vedeți bilanțul.',
    typesExplain: {
      fixed: 'Fix',
      fixedText:
        'același cost oricâți invitați vin (formație, rochie). Dacă e mai mult de unul, puneți câte (ex. 8 meniuri de copil).',
      perGuest: 'Pe invitat',
      perGuestText: 'prețul se înmulțește cu numărul de invitați din scenariu (meniu, băuturi).',
    },
    colLine: 'Cheltuială',
    colType: 'Tip',
    colPrice: 'Preț unitar',
    colTotal: (guests: number) => `Total · ${guests}`,
    colPaid: 'Plătit',
    colRest: 'De plată',
    typePerGuest: 'Pe invitat',
    typeFixed: 'Fix',
    count: 'Câte bucăți',
    perGuestSuffix: '/ invitat',
    addLine: '+ Adaugă o linie',
    addExpense: 'Adaugă o cheltuială',
    clearAmounts: 'Golește sumele',
    clearAmountsHint: 'Șterge prețurile, plățile, darul și suma de la familie. Liniile și scenariile rămân.',
    confirmClearAmounts:
      'Ștergeți toate prețurile, sumele plătite, darul mediu și suma de la familie? Liniile, tipurile și scenariile rămân.',
    newLine: 'Linie nouă',
    removeLine: 'Șterge linia',
    confirmRemoveLine: (name: string) => `Ștergeți linia „${name}"?`,
    namePlaceholder: 'Nume linie',
    notePlaceholder: 'observații',
    addNote: '+ observații',
    currency: 'Monedă',
  },

  settings: {
    weddingDate: 'Data nunții',
    names: 'Numele voastre',
    rate: 'Curs EUR / RON',
    display: 'Afișează totalurile în',
    language: 'Limbă',
    appearance: 'Aspect',
    themes: { system: 'Sistem', light: 'Luminos', dark: 'Întunecat' },
    backup: 'Salvare',
    lastBackup: (days: number | null) => {
      if (days === null) return 'nicio copie descărcată';
      if (days === 0) return 'ultima copie descărcată: azi';
      return `ultima copie descărcată: acum ${countLabel(days, 'zi', 'zile')}`;
    },
    backupExplain:
      'Datele sunt salvate doar în acest browser. Dacă ștergeți datele browserului sau schimbați telefonul, le pierdeți fără o copie.',
    download: 'Descarcă o copie',
    importExplain: 'Continuați pe alt dispozitiv sau încărcați copia primită de la partener.',
    import: 'Încarcă o copie',
    confirmImport: 'Copia încărcată înlocuiește datele de acum din acest browser. Continuați?',
    imported: 'Copia a fost încărcată.',
    resetExplain: 'Șterge tot și pornește de la zero.',
    reset: 'Șterge tot',
    confirmReset: 'Ștergeți toate datele din acest browser? Nu se pot recupera fără o copie.',
  },

  backupErrors: {
    json: 'Fișierul nu e o copie validă.',
    app: 'Fișierul nu e o copie din Nunta Start.',
    version: 'Copia e dintr-o versiune pe care aplicația n-o poate citi.',
    shape: 'Copia e incompletă sau modificată și nu poate fi încărcată.',
  } satisfies Record<BackupError, string>,
  errors: {
    generic: 'Ceva n-a mers. Încercați din nou în câteva clipe.',
    network: 'Nu ne putem conecta. Verificați conexiunea la internet.',
    forbidden: 'Nu aveți acces la această acțiune. Încercați să vă autentificați din nou.',
  },
  toast: { dismiss: 'Închide notificarea' },
  backupKept: 'Datele voastre au rămas neschimbate.',
};
