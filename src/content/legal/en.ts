import { LEGAL_CONTACT_EMAIL } from './contact';
import type { LegalContent } from './types';

/** Draft texts, pending legal review. */
export const legalEn: LegalContent = {
  privacy: [
    {
      id: 'date-colectate',
      heading: 'What data we collect',
      paragraphs: [
        'Account: your email address and display name, received from Google (when you sign in with Google) or from you (when you use the emailed link).',
        'Wedding plan: the partners’ names, the date, the city or venue, tasks, budget lines and, later, the guest data you enter.',
        'Technical data: application errors and performance measurements, with no user identity (see “Who processes the data”).',
      ],
    },
    {
      id: 'de-ce',
      heading: 'Why we use it',
      paragraphs: [
        'We use the data only to provide the service: to sign you in, store and show your wedding plan, and send the emails it needs (the sign-in link, plan invitations).',
        'We use technical data to fix errors and keep the app fast. We do not sell data and do not use it for advertising.',
      ],
    },
    {
      id: 'cine-vede',
      heading: 'Who can see the data',
      paragraphs: [
        'A wedding plan can only be seen by that wedding’s members: the people you invite, or who invited you, to the plan. Other users have no access.',
        'The providers below process data on our behalf, only for the role described.',
      ],
    },
    {
      id: 'procesatori',
      heading: 'Who processes the data',
      paragraphs: [
        'Supabase: database and authentication, in an EU region.',
        'Cloudflare: app hosting, DNS, Turnstile bot protection and encrypted backups in R2.',
        'Resend: transactional email (the sign-in link, invitations).',
        'Grafana Cloud: frontend error and performance monitoring. We do not send user identity.',
        'Google: sign-in with your Google account, if you choose that method.',
      ],
    },
    {
      id: 'pastrare',
      heading: 'How long we keep data',
      paragraphs: [
        'Plan data is kept while your account exists. The activity log is kept for 180 days.',
        'After you request account deletion, your data is permanently deleted within 30 days. Backups expire afterwards, following their rotation cycle.',
      ],
    },
    {
      id: 'drepturi',
      heading: 'Your rights',
      paragraphs: [
        'Under the GDPR you have the right to access, export (portability), rectify, delete and object to processing. You may also lodge a complaint with the Romanian data protection authority (ANSPDCP).',
        `For any request, write to ${LEGAL_CONTACT_EMAIL}. We reply within 30 days.`,
      ],
    },
    {
      id: 'cookies',
      heading: 'Cookies and local storage',
      paragraphs: [
        'We only use functional browser storage: theme (light or dark), language and the sign-in session. We use no tracking or advertising cookies, so there is no consent banner.',
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      paragraphs: [`Questions about personal data: ${LEGAL_CONTACT_EMAIL}.`],
    },
  ],
  terms: [
    {
      id: 'serviciul',
      heading: 'The service',
      paragraphs: [
        'Nunta Start is a web app for planning a wedding: tasks, budget and, soon, guests. By using it you agree to these terms.',
      ],
    },
    {
      id: 'conturi',
      heading: 'Accounts',
      paragraphs: [
        'You sign in with Google or with an emailed link. You are responsible for access to your account and email.',
        'You can invite other people to the wedding plan. They will see the plan’s data, so only invite people you trust.',
      ],
    },
    {
      id: 'utilizare',
      heading: 'Acceptable use',
      paragraphs: [
        'Do not use the service for illegal activity, try to access other users’ data, upload harmful content, or deliberately overload the service or its protections.',
      ],
    },
    {
      id: 'continut',
      heading: 'Your content',
      paragraphs: [
        'The data you enter remains yours. You give us the right to store it and show it to the plan’s members, strictly to provide the service.',
        'You can export or delete your data at any time.',
      ],
    },
    {
      id: 'disponibilitate',
      heading: 'Availability',
      paragraphs: [
        'The service is free and offered as a hobby project, “as is”. We do not guarantee continuous availability, freedom from errors or retention of data. We recommend exporting a copy of your plan regularly.',
      ],
    },
    {
      id: 'raspundere',
      heading: 'Liability',
      paragraphs: [
        'To the extent permitted by law, we are not liable for indirect losses or for decisions made from information in the app (for example budgets or deadlines). Nothing here limits liability that cannot be limited by law.',
      ],
    },
    {
      id: 'modificari',
      heading: 'Changes',
      paragraphs: [
        'We may update these terms. The last-updated date is shown at the top; for important changes we will notify you in the app or by email.',
      ],
    },
    {
      id: 'lege',
      heading: 'Governing law',
      paragraphs: [
        'These terms are governed by Romanian law. Disputes are resolved by the competent courts of Romania.',
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      paragraphs: [`Questions about these terms: ${LEGAL_CONTACT_EMAIL}.`],
    },
  ],
};
