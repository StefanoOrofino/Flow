// Legal document content for FrameFlow Studio.
// NOTE: These are starting templates and should be reviewed by a lawyer
// before final publication (a disclaimer is shown on each page).

export type LegalSection = { h: string; b: string };
export type LegalDoc = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

const UPDATED = "June 2026";
const COMPANY = "FrameFlow Studio";
const CONTACT = "privacy@frameflowai.net";
const DOMAIN = "frameflowai.net";

export const LEGAL: Record<"privacy" | "terms" | "cookies", { it: LegalDoc; en: LegalDoc }> = {
  // ─────────────────────────────────────────────── PRIVACY ───
  privacy: {
    it: {
      title: "Privacy Policy",
      updated: UPDATED,
      intro:
        `La presente informativa descrive come ${COMPANY} ("noi") raccoglie, utilizza e protegge i dati personali degli utenti che accedono a ${DOMAIN} e ai relativi servizi, in conformità al Regolamento (UE) 2016/679 (GDPR).`,
      sections: [
        {
          h: "1. Titolare del trattamento",
          b: `Il titolare del trattamento dei dati è ${COMPANY}. Per qualsiasi richiesta relativa ai tuoi dati personali puoi scriverci all'indirizzo ${CONTACT}.`,
        },
        {
          h: "2. Dati che raccogliamo",
          b: "Raccogliamo: (a) dati di registrazione (nome, indirizzo email, password cifrata); (b) contenuti che carichi o generi (brief creativi, documenti, immagini, storyboard, progetti); (c) dati di utilizzo del servizio (piano attivo, consumo di generazioni AI e di archiviazione); (d) dati tecnici essenziali (indirizzo IP, tipo di dispositivo e browser) necessari al funzionamento e alla sicurezza.",
        },
        {
          h: "3. Finalità e base giuridica",
          b: "Trattiamo i dati per: erogare il servizio ed eseguire il contratto (art. 6.1.b GDPR); gestire pagamenti e abbonamenti; garantire sicurezza e prevenzione delle frodi (legittimo interesse, art. 6.1.f); adempiere a obblighi di legge (art. 6.1.c). Le comunicazioni promozionali facoltative avvengono solo previo consenso (art. 6.1.a).",
        },
        {
          h: "4. Intelligenza artificiale",
          b: "I brief, i documenti e le immagini che carichi vengono elaborati da fornitori di modelli AI (es. OpenAI, Google) esclusivamente per generare i risultati richiesti. Non utilizziamo i tuoi contenuti per addestrare modelli di terze parti. I contenuti restano di tua proprietà.",
        },
        {
          h: "5. Pagamenti",
          b: "I pagamenti sono gestiti da Stripe e PayPal, che agiscono come titolari autonomi per i dati di pagamento. Non memorizziamo i dati completi della tua carta sui nostri server. Consulta le rispettive informative privacy di Stripe e PayPal.",
        },
        {
          h: "6. Conservazione dei dati",
          b: "Conserviamo i dati per il tempo necessario a fornire il servizio e, successivamente, per il periodo richiesto da obblighi legali e contabili. Puoi richiedere la cancellazione del tuo account in qualsiasi momento; i dati associati saranno rimossi salvo obblighi di conservazione di legge.",
        },
        {
          h: "7. I tuoi diritti",
          b: `Hai diritto di accesso, rettifica, cancellazione, limitazione, portabilità e opposizione al trattamento, oltre al diritto di revocare il consenso in qualsiasi momento. Per esercitare i tuoi diritti contatta ${CONTACT}. Puoi inoltre proporre reclamo all'autorità di controllo competente (in Italia, il Garante per la protezione dei dati personali).`,
        },
        {
          h: "8. Sicurezza",
          b: "Adottiamo misure tecniche e organizzative adeguate (cifratura delle password, connessioni HTTPS, controlli di accesso) per proteggere i dati da accessi non autorizzati, perdita o divulgazione.",
        },
        {
          h: "9. Modifiche",
          b: "Potremmo aggiornare periodicamente questa informativa. In caso di modifiche sostanziali te ne daremo comunicazione tramite il servizio o via email. La data di ultimo aggiornamento è indicata in cima a questa pagina.",
        },
      ],
    },
    en: {
      title: "Privacy Policy",
      updated: UPDATED,
      intro:
        `This policy explains how ${COMPANY} ("we") collects, uses and protects the personal data of users who access ${DOMAIN} and its services, in accordance with the EU General Data Protection Regulation (GDPR) 2016/679.`,
      sections: [
        {
          h: "1. Data controller",
          b: `The data controller is ${COMPANY}. For any request regarding your personal data you can reach us at ${CONTACT}.`,
        },
        {
          h: "2. Data we collect",
          b: "We collect: (a) account data (name, email address, hashed password); (b) content you upload or generate (creative briefs, documents, images, storyboards, projects); (c) usage data (active plan, AI generation and storage consumption); (d) essential technical data (IP address, device and browser type) needed for operation and security.",
        },
        {
          h: "3. Purposes and legal basis",
          b: "We process data to: provide the service and perform our contract with you (Art. 6.1.b GDPR); handle payments and subscriptions; ensure security and fraud prevention (legitimate interest, Art. 6.1.f); comply with legal obligations (Art. 6.1.c). Optional marketing communications are sent only with your consent (Art. 6.1.a).",
        },
        {
          h: "4. Artificial intelligence",
          b: "The briefs, documents and images you upload are processed by AI model providers (e.g. OpenAI, Google) solely to generate the results you request. We do not use your content to train third-party models. Your content remains yours.",
        },
        {
          h: "5. Payments",
          b: "Payments are handled by Stripe and PayPal, who act as independent controllers for payment data. We do not store your full card details on our servers. Please review Stripe's and PayPal's own privacy policies.",
        },
        {
          h: "6. Data retention",
          b: "We retain data for as long as needed to provide the service and thereafter for the period required by legal and accounting obligations. You may request deletion of your account at any time; associated data will be removed unless retention is legally required.",
        },
        {
          h: "7. Your rights",
          b: `You have the right to access, rectify, erase, restrict, port and object to processing, as well as to withdraw consent at any time. To exercise your rights, contact ${CONTACT}. You may also lodge a complaint with your competent supervisory authority.`,
        },
        {
          h: "8. Security",
          b: "We implement appropriate technical and organizational measures (password hashing, HTTPS connections, access controls) to protect data against unauthorized access, loss or disclosure.",
        },
        {
          h: "9. Changes",
          b: "We may update this policy from time to time. For material changes we will notify you via the service or by email. The last updated date is shown at the top of this page.",
        },
      ],
    },
  },

  // ───────────────────────────────────────────────── TERMS ───
  terms: {
    it: {
      title: "Termini di Servizio",
      updated: UPDATED,
      intro:
        `Utilizzando ${COMPANY} accetti i presenti Termini di Servizio. Ti invitiamo a leggerli con attenzione prima di utilizzare la piattaforma.`,
      sections: [
        {
          h: "1. Il servizio",
          b: `${COMPANY} è una piattaforma di pre-produzione basata su intelligenza artificiale che trasforma un brief creativo in un pacchetto di produzione strutturato (concept, treatment, sceneggiatura, storyboard, shot list e prompt per immagini AI).`,
        },
        {
          h: "2. Account",
          b: "Per utilizzare il servizio devi creare un account e fornire informazioni accurate. Sei responsabile della riservatezza delle tue credenziali e di tutte le attività svolte tramite il tuo account. Devi avere almeno 18 anni.",
        },
        {
          h: "3. Piani e pagamenti",
          b: "Offriamo un piano gratuito e piani a pagamento (Standard, Pro, Studio) con limiti differenti di progetti, generazioni AI e archiviazione. I pagamenti sono elaborati tramite Stripe e PayPal e attivano il piano per un periodo di 30 giorni. Al termine del periodo, in assenza di rinnovo, l'account torna automaticamente al piano gratuito.",
        },
        {
          h: "4. Limiti di utilizzo",
          b: "Ogni piano prevede limiti su progetti attivi, generazioni AI, generazioni di immagini, importazioni di brief ed archiviazione. Al raggiungimento del limite alcune funzionalità potrebbero essere temporaneamente bloccate fino all'upgrade del piano o al rinnovo del periodo.",
        },
        {
          h: "5. Contenuti dell'utente",
          b: "Mantieni la piena proprietà dei contenuti che carichi e generi. Ci concedi una licenza limitata, esclusivamente tecnica, necessaria a elaborare e mostrarti i risultati. Sei responsabile di disporre dei diritti sui materiali che carichi.",
        },
        {
          h: "6. Uso accettabile",
          b: "Ti impegni a non utilizzare il servizio per finalità illecite, per violare diritti di terzi, per generare contenuti diffamatori, illegali o che violino la proprietà intellettuale altrui. Ci riserviamo il diritto di sospendere gli account che violano questi termini.",
        },
        {
          h: "7. Contenuti generati dall'AI",
          b: "I risultati generati dall'AI possono contenere imprecisioni e sono forniti come supporto creativo. Sei tenuto a verificare e rivedere i contenuti prima di ogni utilizzo professionale. Non garantiamo l'idoneità dei risultati a scopi specifici.",
        },
        {
          h: "8. Limitazione di responsabilità",
          b: "Il servizio è fornito \"così com'è\". Nei limiti consentiti dalla legge, non saremo responsabili per danni indiretti, perdita di dati o mancati guadagni derivanti dall'uso del servizio.",
        },
        {
          h: "9. Cessazione",
          b: "Puoi chiudere il tuo account in qualsiasi momento. Possiamo sospendere o chiudere l'accesso in caso di violazione dei presenti termini.",
        },
        {
          h: "10. Legge applicabile",
          b: `I presenti termini sono regolati dalla legge italiana. Per qualsiasi comunicazione puoi contattarci all'indirizzo ${CONTACT}.`,
        },
      ],
    },
    en: {
      title: "Terms of Service",
      updated: UPDATED,
      intro:
        `By using ${COMPANY} you agree to these Terms of Service. Please read them carefully before using the platform.`,
      sections: [
        {
          h: "1. The service",
          b: `${COMPANY} is an AI-powered pre-production platform that transforms a creative brief into a structured production package (concept, treatment, script, storyboard, shot list and AI image prompts).`,
        },
        {
          h: "2. Account",
          b: "To use the service you must create an account and provide accurate information. You are responsible for keeping your credentials confidential and for all activity carried out through your account. You must be at least 18 years old.",
        },
        {
          h: "3. Plans and payments",
          b: "We offer a free plan and paid plans (Standard, Pro, Studio) with different limits on projects, AI generations and storage. Payments are processed via Stripe and PayPal and activate the plan for a 30-day period. At the end of the period, without renewal, the account automatically returns to the free plan.",
        },
        {
          h: "4. Usage limits",
          b: "Each plan includes limits on active projects, AI generations, image generations, brief imports and storage. When a limit is reached, some features may be temporarily blocked until you upgrade or the period renews.",
        },
        {
          h: "5. Your content",
          b: "You retain full ownership of the content you upload and generate. You grant us a limited, purely technical license needed to process and display your results to you. You are responsible for holding the rights to the materials you upload.",
        },
        {
          h: "6. Acceptable use",
          b: "You agree not to use the service for unlawful purposes, to infringe third-party rights, or to generate defamatory, illegal or infringing content. We reserve the right to suspend accounts that violate these terms.",
        },
        {
          h: "7. AI-generated content",
          b: "AI-generated results may contain inaccuracies and are provided as creative assistance. You are responsible for reviewing and verifying content before any professional use. We do not warrant the fitness of results for a particular purpose.",
        },
        {
          h: "8. Limitation of liability",
          b: "The service is provided \"as is\". To the extent permitted by law, we will not be liable for indirect damages, data loss or lost profits arising from use of the service.",
        },
        {
          h: "9. Termination",
          b: "You may close your account at any time. We may suspend or terminate access in the event of a breach of these terms.",
        },
        {
          h: "10. Governing law",
          b: `These terms are governed by Italian law. For any communication you can reach us at ${CONTACT}.`,
        },
      ],
    },
  },

  // ─────────────────────────────────────────────── COOKIES ───
  cookies: {
    it: {
      title: "Cookie Policy",
      updated: UPDATED,
      intro:
        `Questa Cookie Policy spiega come ${COMPANY} utilizza i cookie e tecnologie simili su ${DOMAIN}.`,
      sections: [
        {
          h: "1. Cosa sono i cookie",
          b: "I cookie sono piccoli file di testo memorizzati sul tuo dispositivo che consentono al sito di funzionare correttamente e di ricordare le tue preferenze.",
        },
        {
          h: "2. Cookie tecnici (necessari)",
          b: "Utilizziamo cookie e archiviazione locale strettamente necessari per l'autenticazione (mantenere la sessione di login), per ricordare la lingua (IT/EN) e il tema dell'interfaccia. Questi non richiedono consenso in quanto essenziali al funzionamento del servizio.",
        },
        {
          h: "3. Cookie di terze parti",
          b: "Durante i pagamenti, i provider Stripe e PayPal possono impostare cookie propri per la sicurezza delle transazioni e la prevenzione delle frodi. Tali cookie sono regolati dalle rispettive policy.",
        },
        {
          h: "4. Cookie analitici e di marketing",
          b: "Attualmente non utilizziamo cookie analitici o di profilazione a fini di marketing. Qualora dovessimo introdurli in futuro, richiederemo il tuo consenso preventivo tramite apposito banner.",
        },
        {
          h: "5. Gestione dei cookie",
          b: "Puoi gestire o eliminare i cookie tramite le impostazioni del tuo browser. La disabilitazione dei cookie tecnici potrebbe compromettere il corretto funzionamento del servizio (ad esempio l'accesso al tuo account).",
        },
        {
          h: "6. Contatti",
          b: `Per domande sull'uso dei cookie scrivici all'indirizzo ${CONTACT}.`,
        },
      ],
    },
    en: {
      title: "Cookie Policy",
      updated: UPDATED,
      intro:
        `This Cookie Policy explains how ${COMPANY} uses cookies and similar technologies on ${DOMAIN}.`,
      sections: [
        {
          h: "1. What cookies are",
          b: "Cookies are small text files stored on your device that allow the site to function correctly and to remember your preferences.",
        },
        {
          h: "2. Essential cookies (necessary)",
          b: "We use cookies and local storage strictly necessary for authentication (keeping you logged in), and to remember your language (EN/IT) and interface theme. These do not require consent as they are essential to the operation of the service.",
        },
        {
          h: "3. Third-party cookies",
          b: "During payments, providers Stripe and PayPal may set their own cookies for transaction security and fraud prevention. Such cookies are governed by their respective policies.",
        },
        {
          h: "4. Analytics and marketing cookies",
          b: "We currently do not use analytics or profiling cookies for marketing purposes. Should we introduce them in the future, we will request your prior consent via a dedicated banner.",
        },
        {
          h: "5. Managing cookies",
          b: "You can manage or delete cookies through your browser settings. Disabling essential cookies may impair the correct operation of the service (for example, access to your account).",
        },
        {
          h: "6. Contact",
          b: `For questions about our use of cookies, write to us at ${CONTACT}.`,
        },
      ],
    },
  },
};
