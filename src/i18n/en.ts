import { countLabel } from '../lib/format';
import type { Messages } from './index';

/** English UI text. Must have exactly the shape of the Romanian file (the source of truth). */
export const en: Messages = {
  appName: 'Nunta Start',
  tagline: 'What you need to do and by when, plus what it costs. No account: everything stays in your browser.',

  header: {
    couple: (a: string, b: string) => [a, b].filter((n) => n.trim()).join(' & ') || 'Your wedding',
  },

  shell: {
    skip: 'Skip to content',
    mainNav: 'Main navigation',
    section: 'Planning',
    caption: 'Your plan',
    nav: { home: 'Home', tasks: 'Tasks', budget: 'Budget calculator', settings: 'Settings' },
    tab: { home: 'Home', tasks: 'Tasks', budget: 'Budget', settings: 'Settings' },
    badgeLabel: (n: number) => `${countLabel(n, 'task', 'tasks', 'en')} to catch up on`,
    coupleLabel: 'Your space',
    privacyTitle: 'Your plan, kept safe',
    privacyBody: 'Saved to your account, visible only to you and the people you invite.',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    toLight: 'Switch to the light theme',
    toDark: 'Switch to the dark theme',
    language: 'Language',
    toLanguage: (other: string) => `Switch language to ${other}`,
  },

  greeting: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' },

  pages: {
    home: { subtitle: 'Your story is about to begin. Here is what comes next.' },
    tasks: {
      title: 'Your preparation plan',
      subtitle: 'One step at a time. See what matters now and what comes next.',
    },
    budget: {
      title: 'The wedding budget',
      subtitle: 'A clear picture of the costs, before you make the next decision.',
    },
    settings: {
      eyebrow: 'Your planner',
      title: 'Settings',
      subtitle: 'Make the space yours and keep your data safe.',
    },
  },

  onboarding: {
    title: 'When is the wedding?',
    date: 'Wedding date',
    dateHint: 'Task deadlines are calculated from it.',
    names: 'Your names',
    namePlaceholder1: 'First name',
    namePlaceholder2: 'First name',
    guests: 'Estimated number of guests (optional)',
    guestsHint: 'It sets up the first scenario in the Calculator. You can change it any time.',
    guestsPlaceholder: 'e.g. 200',
    start: 'Start',
    import: 'I already have a saved copy',
    corrupt: "The data saved in this browser could not be read. Download it before you start over, so it isn't lost.",
    corruptDownload: 'Download the old data',
  },

  storage: {
    unavailable:
      "The browser can't save your data (private mode or full storage). Download a copy from Settings so you don't lose your work.",
    reminder: (days: number | null) =>
      days === null
        ? "You haven't downloaded a copy of your data yet."
        : `Your last downloaded copy is ${countLabel(days, 'day', 'days', 'en')} old.`,
    reminderAction: 'Download a copy',
  },

  status: { todo: 'To do', doing: 'In progress', done: 'Done' },
  statusHint: 'Tap to change the status',

  categories: {
    buget: 'Budget',
    invitati: 'Guests',
    locatie: 'Venue and menu',
    muzica: 'Music',
    foto: 'Photo and video',
    decor: 'Flowers and decor',
    print: 'Print',
    tinute: 'Attire',
    acte: 'Paperwork and church',
    ziua: 'Wedding day',
    altele: 'Other',
  },

  stages: {
    m12plus: 'More than 12 months before',
    m9_12: '9–12 months before',
    m6_9: '6–9 months before',
    m3_6: '3–6 months before',
    m1_3: '1–3 months before',
    lastMonth: 'Last month',
    lastWeek: 'Last week',
    day: 'Wedding day',
    after: 'After the wedding',
  },

  owner: (owner, names) => {
    if (owner === 'p1') return names[0].trim() || 'Person 1';
    if (owner === 'p2') return names[1].trim() || 'Person 2';
    return 'Both';
  },

  home: {
    tasks: 'Tasks',
    tasksDone: (done: number, total: number) => `${done} of ${total}`,
    tasksDetail: (recover: number, current: number) => `${recover} to catch up on · ${current} in the current stage`,
    balance: (guests: number) => `Balance at ${countLabel(guests, 'guest', 'guests', 'en')}`,
    cost: (guests: number) => `Cost at ${countLabel(guests, 'guest', 'guests', 'en')}`,
    breakEven: (amount: string) => `Break-even gift: ${amount} per person`,
    needPrices: 'Fill in the prices in the Calculator to see the balance.',
    needGift: 'Enter the average gift in the Calculator to see the balance.',
    payments: 'Payments',
    paidOf: (total: string, rest: string) => `of ${total} · ${rest} left to pay`,
    next: 'To do now',
    nextHint: 'the first unfinished tasks, in order of deadline',
    allDone: "You've finished everything. Congratulations!",
    goCalculator: 'Open the Calculator',
    goStart: 'All tasks',
  },

  tasks: {
    byStage: 'By stage',
    byCategory: 'By category',
    ownerFilter: 'Owner',
    viewLabel: 'View',
    all: 'Everyone',
    add: 'Add a task',
    doneCount: (done: number, total: number) => `${done} of ${total} done`,
    recover: 'To catch up on',
    recoverHint: 'from stages that have passed',
    noDate: 'No deadline',
    finished: 'Done, from past stages',
    until: (date: string) => `by ${date}`,
    current: 'current stage',
    count: (n: number) => countLabel(n, 'task', 'tasks', 'en'),
    dueRecover: 'to catch up on',
    dueNone: 'no deadline',
    empty: 'No tasks here.',
    emptyFilter: 'No tasks match this filter.',
    untitled: 'Untitled task',
    edit: {
      title: 'Activity',
      titlePlaceholder: 'What needs to be done?',
      category: 'Category',
      owner: 'Owner',
      status: 'Status',
      due: 'Deadline',
      dueAuto: (date: string) => `Automatic: ${date}`,
      dueManual: 'Set by hand',
      resetDue: 'Go back to the automatic deadline',
      details: 'Details',
      note: 'Notes',
      remove: 'Delete task',
      confirmRemove: 'Delete this task?',
      close: 'Done',
    },
  },

  calc: {
    scenarios: 'Guest scenarios',
    addScenario: 'Add scenario',
    removeScenario: 'Remove scenario',
    gift: 'Average gift per person',
    family: 'From family',
    rate: 'Rate',
    ratePrefix: '€1 =',
    display: 'Show in',
    scenario: (guests: number) => countLabel(guests, 'guest', 'guests', 'en'),
    selected: 'selected',
    totalAndPerGuest: (total: string, perGuest: string) => `Total cost ${total} · ${perGuest} per guest`,
    perGuest: (perGuest: string) => `${perGuest} per guest`,
    breakEven: (amount: string) => `Break-even gift: ${amount}`,
    giftMissing: 'Enter the average gift per person to see the balance.',
    typesExplain: {
      fixed: 'Fixed',
      fixedText:
        'the same cost however many guests come (band, dress). If there is more than one, enter how many (e.g. 8 kids’ menus).',
      perGuest: 'Per guest',
      perGuestText: 'the price is multiplied by the number of guests in the scenario (menu, drinks).',
    },
    colLine: 'Line',
    colType: 'Type',
    colPrice: 'Price',
    colTotal: (guests: number) => `Total at ${guests}`,
    colPaid: 'Paid',
    colRest: 'Left',
    typePerGuest: 'Per guest',
    typeFixed: 'Fixed',
    count: 'How many',
    perGuestSuffix: '/ guest',
    total: 'Total',
    addLine: '+ Line',
    addExpense: 'Add an expense',
    clearAmounts: 'Clear amounts',
    clearAmountsHint: 'Deletes prices, payments, the gift and the family amount. Lines and scenarios stay.',
    confirmClearAmounts:
      'Delete all prices, amounts paid, the average gift and the family amount? Lines, types and scenarios stay.',
    newLine: 'New line',
    removeLine: 'Delete line',
    confirmRemoveLine: (name: string) => `Delete the line "${name}"?`,
    namePlaceholder: 'Line name',
    notePlaceholder: 'notes',
    addNote: '+ notes',
    currency: 'Currency',
  },

  settings: {
    weddingDate: 'Wedding date',
    names: 'Your names',
    rate: 'EUR / RON rate',
    display: 'Show totals in',
    language: 'Language',
    appearance: 'Appearance',
    themes: { system: 'System', light: 'Light', dark: 'Dark' },
    backup: 'Backup',
    lastBackup: (days: number | null) => {
      if (days === null) return 'no copy downloaded';
      if (days === 0) return 'last copy downloaded: today';
      return `last copy downloaded: ${countLabel(days, 'day', 'days', 'en')} ago`;
    },
    backupExplain:
      'Your data is saved only in this browser. If you clear the browser data or change phones, you lose it without a copy.',
    download: 'Download a copy',
    importExplain: 'Continue on another device or load the copy you received from your partner.',
    import: 'Load a copy',
    confirmImport: 'The loaded copy replaces the data currently in this browser. Continue?',
    imported: 'The copy was loaded.',
    resetExplain: 'Delete everything and start from scratch.',
    reset: 'Delete everything',
    confirmReset: 'Delete all the data in this browser? It cannot be recovered without a copy.',
  },

  backupErrors: {
    json: 'The file is not a valid copy.',
    app: 'The file is not a copy from Nunta Start.',
    version: "The copy is from a version the app can't read.",
    shape: 'The copy is incomplete or has been modified and cannot be loaded.',
  },
  errors: {
    generic: 'Something went wrong. Please try again in a moment.',
    network: "We can't connect. Check your internet connection.",
    forbidden: "You don't have access to this action. Try signing in again.",
  },
  toast: { dismiss: 'Dismiss notification' },
  backupKept: 'Your data was left unchanged.',
};
