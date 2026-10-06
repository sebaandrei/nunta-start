import { LEGAL_CONTACT_EMAIL } from './contact';
import type { LegalContent } from './types';

/** Proiecte de text, în curs de revizuire juridică. */
export const legalRo: LegalContent = {
  privacy: [
    {
      id: 'date-colectate',
      heading: 'Ce date colectăm',
      paragraphs: [
        'Contul: adresa de email și numele afișat, primite de la Google (când vă conectați cu Google) sau de la dumneavoastră (când folosiți linkul trimis pe email).',
        'Planul nunții: numele celor doi parteneri, data, orașul sau locația, sarcinile, liniile de buget și, mai târziu, datele despre invitați pe care le introduceți.',
        'Date tehnice: erori și măsurători de performanță ale aplicației, fără nicio identitate de utilizator (vezi „Cine prelucrează datele”).',
      ],
    },
    {
      id: 'de-ce',
      heading: 'De ce le folosim',
      paragraphs: [
        'Folosim datele doar ca să furnizăm serviciul: să vă conectăm, să salvăm și să afișăm planul nunții și să vă trimitem emailurile necesare (linkul de conectare, invitații în plan).',
        'Folosim datele tehnice pentru a remedia erori și a menține aplicația rapidă. Nu vindem datele și nu le folosim pentru publicitate.',
      ],
    },
    {
      id: 'cine-vede',
      heading: 'Cine poate vedea datele',
      paragraphs: [
        'Planul unei nunți poate fi văzut doar de membrii acelei nunți, adică de persoanele pe care le invitați sau care v-au invitat în plan. Alți utilizatori nu au acces.',
        'Furnizorii de mai jos prelucrează datele în numele nostru, doar pentru rolul descris.',
      ],
    },
    {
      id: 'procesatori',
      heading: 'Cine prelucrează datele',
      paragraphs: [
        'Supabase: baza de date și autentificarea, într-o regiune din UE.',
        'Cloudflare: găzduirea aplicației, DNS, protecția anti-boți Turnstile și copii de siguranță criptate în R2.',
        'Resend: trimiterea emailurilor tranzacționale (linkul de conectare, invitații).',
        'Grafana Cloud: monitorizarea erorilor și a performanței din aplicație. Nu trimitem identitatea utilizatorului.',
        'Google: conectarea cu contul Google, dacă alegeți această metodă.',
      ],
    },
    {
      id: 'pastrare',
      heading: 'Cât timp păstrăm datele',
      paragraphs: [
        'Datele planului se păstrează cât timp contul există. Jurnalul de activitate se păstrează 180 de zile.',
        'După ce cereți ștergerea contului, datele sunt șterse definitiv în cel mult 30 de zile. Copiile de siguranță expiră ulterior, conform ciclului lor de rotație.',
      ],
    },
    {
      id: 'drepturi',
      heading: 'Drepturile dumneavoastră',
      paragraphs: [
        'Conform GDPR, aveți dreptul de acces, de export (portabilitate), de rectificare, de ștergere și de opoziție față de prelucrare. Aveți și dreptul de a depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP).',
        `Pentru orice cerere, scrieți-ne la ${LEGAL_CONTACT_EMAIL}. Răspundem în cel mult 30 de zile.`,
      ],
    },
    {
      id: 'cookies',
      heading: 'Cookie-uri și stocare locală',
      paragraphs: [
        'Folosim doar stocare funcțională în browser: tema (luminoasă sau întunecată), limba și sesiunea de conectare. Nu folosim cookie-uri de urmărire sau de publicitate, așa că nu afișăm un banner de consimțământ.',
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      paragraphs: [`Întrebări despre datele personale: ${LEGAL_CONTACT_EMAIL}.`],
    },
  ],
  terms: [
    {
      id: 'serviciul',
      heading: 'Serviciul',
      paragraphs: [
        'Nunta Start este o aplicație web pentru planificarea unei nunți: sarcini, buget și, în curând, invitați. Folosind-o, sunteți de acord cu acești termeni.',
      ],
    },
    {
      id: 'conturi',
      heading: 'Conturi',
      paragraphs: [
        'Vă conectați cu Google sau cu un link trimis pe email. Sunteți responsabil pentru accesul la contul și la emailul dumneavoastră.',
        'Puteți invita alte persoane în planul nunții. Ele vor vedea datele planului, așa că invitați doar persoane de încredere.',
      ],
    },
    {
      id: 'utilizare',
      heading: 'Utilizare acceptabilă',
      paragraphs: [
        'Nu folosiți serviciul pentru activități ilegale, nu încercați să accesați datele altor utilizatori, nu încărcați conținut dăunător și nu supraîncărcați intenționat serviciul sau măsurile lui de protecție.',
      ],
    },
    {
      id: 'continut',
      heading: 'Conținutul dumneavoastră',
      paragraphs: [
        'Datele pe care le introduceți rămân ale dumneavoastră. Ne dați dreptul de a le stoca și afișa membrilor planului, strict ca să furnizăm serviciul.',
        'Vă puteți exporta sau șterge datele oricând.',
      ],
    },
    {
      id: 'disponibilitate',
      heading: 'Disponibilitate',
      paragraphs: [
        'Serviciul este gratuit și oferit ca proiect de pasiune, „așa cum este”. Nu garantăm disponibilitate continuă, absența erorilor sau păstrarea datelor. Vă recomandăm să exportați periodic o copie a planului.',
      ],
    },
    {
      id: 'raspundere',
      heading: 'Răspundere',
      paragraphs: [
        'În măsura permisă de lege, nu răspundem pentru pierderi indirecte sau pentru decizii luate pe baza informațiilor din aplicație (de exemplu bugete sau termene). Nimic din acest text nu limitează răspunderea care nu poate fi limitată prin lege.',
      ],
    },
    {
      id: 'modificari',
      heading: 'Modificări',
      paragraphs: [
        'Putem actualiza acești termeni. Data ultimei actualizări apare în partea de sus; la modificări importante vă anunțăm în aplicație sau pe email.',
      ],
    },
    {
      id: 'lege',
      heading: 'Legea aplicabilă',
      paragraphs: [
        'Acești termeni sunt guvernați de legea română. Litigiile se soluționează de instanțele competente din România.',
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      paragraphs: [`Întrebări despre acești termeni: ${LEGAL_CONTACT_EMAIL}.`],
    },
  ],
};
