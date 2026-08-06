import React, { createContext, useContext, useState, useCallback } from "react";

const IMG = {
  carBeach: "https://images.unsplash.com/photo-1778694276474-b44ee013dc24?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  cityNeon: "https://images.unsplash.com/photo-1652201837148-edf8032ae8c1?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  interior: "https://images.unsplash.com/photo-1777576507182-476359466980?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  watch: "https://images.unsplash.com/photo-1670177257750-9b47927f68eb?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  watchSilk: "https://images.unsplash.com/photo-1642025421684-7881ee163b59?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  fashion: "https://images.unsplash.com/photo-1769650795970-89690d0f535a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  fashion2: "https://images.unsplash.com/photo-1779912217733-0b7df75b5083?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  desert: "https://images.unsplash.com/photo-1607729990781-985e34315e16?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  moto: "https://images.unsplash.com/photo-1767274859042-b0f619b8bc36?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  perfume: "https://images.unsplash.com/photo-1622618991746-fe6004db3a47?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  food: "https://images.unsplash.com/photo-1647230373280-6cfd4451fe4b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  sneaker: "https://images.unsplash.com/photo-1656944227480-98180d2a5155?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  filmSet: "https://images.unsplash.com/photo-1632187989763-c9c620420b4d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  filmSet2: "https://images.unsplash.com/photo-1632187981988-40f3cbaeef5e?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  cameraSilhouette: "https://images.pexels.com/photos/23384400/pexels-photo-23384400.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1400",
  crewOutdoor: "https://images.pexels.com/photos/19224452/pexels-photo-19224452.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1400",
  storyboardSketch: "https://images.unsplash.com/photo-1573867880293-a309ab677f28?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  lens: "https://images.unsplash.com/photo-1625690303837-654c9666d2d0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
};

export { IMG };

const dict = {
  it: {
    nav: {
      features: "Funzionalità",
      how: "Come Funziona",
      pricing: "Prezzi",
      faq: "FAQ",
      login: "Accedi",
      cta: "Inizia Gratis",
    },
    hero: {
      badge: "La pre-produzione con l'AI, reinventata",
      titleLines: ["La Suite di Produzione", "AI per Filmmaker"],
      subtitle:
        "Trasforma un brief del cliente in un pacchetto di produzione completo in pochi minuti — concept, sceneggiatura, storyboard, shot list e altro ancora.",
      ctaPrimary: "Inizia Gratis",
      ctaSecondary: "Guarda la Demo",
      trust: "Nessuna carta di credito · Piano gratuito per sempre · PDF pronti all'uso",
    },
    demo: {
      url: "app.frameflowai.net",
      steps: [
        { t: "Carica il brief", d: "brief-cliente.pdf · 8 pagine" },
        { t: "L'AI legge le pagine", d: "Scansione dei documenti in corso…" },
        { t: "Dati estratti", d: "Ogni valore citato dalla fonte" },
        { t: "Pacchetto storyboard pronto", d: "Concept · Sceneggiatura · Shot list" },
      ],
      extracted: ["Marchio", "Prodotto", "Target", "Tono", "Durata", "Budget"],
      openDemo: "Guarda la Demo",
    },
    trust: {
      label: "PENSATO PER I TEAM VIDEO MODERNI",
      chips: ["Filmmaker", "Videomaker", "Agenzie pubblicitarie", "Case di produzione", "Content creator"],
    },
    beforeAfter: {
      kicker: "LA DIFFERENZA",
      title: "Come il giorno e la notte",
      vs: "VS",
      before: {
        head: "Senza FrameFlow",
        outcome: "Giorni di lavoro manuale e disordinato",
        items: [
          "Brief sepolti tra infinite email",
          "Una decina di strumenti scollegati",
          "Ore perse in pianificazione manuale",
          "Lo stesso lavoro, fatto due volte",
          "Approssimazioni e dettagli persi",
        ],
      },
      after: {
        head: "Con FrameFlow",
        outcome: "Un pacchetto completo in pochi minuti",
        items: [
          "Un brief dentro — un workspace di produzione fuori",
          "Dal brief al pacchetto completo in pochi minuti",
          "Ogni dato verificato dalle fonti, mai inventato",
          "Condividi, revisiona ed esporta con eleganza",
          "Deliverable sicuri e pronti per il cliente",
        ],
      },
    },
    how: {
      kicker: "COME FUNZIONA",
      title: "Dal brief al pacchetto in sei passi",
      steps: [
        { t: "Carica il Brief", d: "Trascina il brief del cliente — PDF, documenti e immagini di riferimento." },
        { t: "Analisi AI", d: "La nostra AI legge ogni documento ed estrae i dati, con le fonti." },
        { t: "Revisione", d: "Conferma i dati estratti. Nulla è inventato — ogni valore è citato." },
        { t: "Genera", d: "Crea concept, treatment, sceneggiatura, storyboard e shot list." },
        { t: "Collabora", d: "Condividi link di revisione con il cliente e itera insieme in tempo reale." },
        { t: "Esporta", d: "Consegna un pacchetto PDF elegante e pronto per la produzione." },
      ],
    },
    stats: [
      { v: "Minuti", d: "Dal brief al pacchetto completo" },
      { v: "6+", d: "Deliverable per progetto" },
      { v: "EN · IT", d: "Completamente localizzato" },
      { v: "100%", d: "Verificato dalle fonti, mai inventato" },
    ],
    brief: {
      kicker: "IL FLUSSO DEL BRIEF CLIENTE",
      title: "Carica un brief. Ottieni un progetto.",
      body: "FrameFlow legge il brief del tuo cliente e lo trasforma in un progetto di produzione strutturato — con ogni informazione tracciata alla sua fonte.",
      list: [
        "Carica PDF e immagini",
        "L'AI legge i documenti",
        "Estrae le informazioni (con le fonti)",
        "Compila automaticamente il progetto",
        "Genera il pacchetto",
      ],
      cta: "Provalo Gratis",
      fileName: "brief.pdf",
      fields: [
        { k: "Marchio", v: "Aurora Automotive" },
        { k: "Prodotto", v: "SUV elettrico 2026" },
        { k: "Target", v: "Urbani 28–45" },
        { k: "Tono", v: "Elegante · Cinematografico" },
        { k: "Durata", v: "60 secondi" },
      ],
    },
    features: {
      kicker: "TUTTO CIÒ CHE TI SERVE",
      title: "Un unico workspace. L'intera produzione.",
      items: [
        { t: "AI Director", d: "Un co-pilota creativo che affina qualsiasi scena, tono o inquadratura a comando.", img: IMG.cameraSilhouette },
        { t: "Import Brief Cliente", d: "Trasforma brief caotici in un progetto strutturato e verificato dalle fonti.", img: IMG.filmSet },
        { t: "Storyboard", d: "Fotogrammi generati dall'AI con editor inline e drag-and-drop.", img: IMG.storyboardSketch },
        { t: "Sceneggiatura", d: "Narrazione, dialoghi e voce fuori campo in formato copione.", img: IMG.fashion },
        { t: "Shot List", d: "Ogni inquadratura, angolo e movimento in un'unica tabella pronta per la produzione.", img: IMG.desert },
        { t: "Attrezzatura", d: "Camera, ottiche, luci e audio consigliati per le riprese.", img: IMG.lens },
        { t: "Troupe", d: "Ruoli della troupe suggeriti in base al livello di produzione.", img: IMG.crewOutdoor },
        { t: "Programma", d: "Un piano di riprese realistico con la suddivisione dei tempi.", img: IMG.moto },
        { t: "Budget", d: "Stime di budget dalla fascia base a quella premium.", img: IMG.watch },
        { t: "Revisione Cliente", d: "Link di revisione eleganti per feedback e approvazioni.", img: IMG.perfume },
        { t: "Esportazione PDF", d: "Un pacchetto elegante e pronto per la produzione, in un clic.", img: IMG.food },
      ],
    },
    storyboard: {
      kicker: "STORYBOARD",
      title: "Vedi il tuo film prima di girarlo",
    },
    gallery: {
      kicker: "GALLERIA STORYBOARD",
      title: "Fotogrammi cinematografici, generati dall'AI",
      subtitle:
        "Fotogrammi storyboard reali che FrameFlow può generare per la tua produzione — da un solo brief.",
      items: [
        { img: IMG.carBeach, t: "Guida costiera", s: "ORA D'ORO" },
        { img: IMG.interior, t: "Interni", s: "LUCE AMBIENTALE" },
        { img: IMG.cityNeon, t: "Notte in città", s: "NEON" },
        { img: IMG.watch, t: "Dettaglio", s: "LUCE DA STUDIO" },
        { img: IMG.fashion, t: "Lifestyle", s: "TRAMONTO" },
        { img: IMG.desert, t: "Aerea", s: "AUTOSTRADA NEL DESERTO" },
      ],
    },
    pricing: {
      kicker: "PREZZI",
      title: "Prezzi semplici e trasparenti",
      popular: "PIÙ POPOLARE",
      perMonth: "/ mese",
      forever: "/ per sempre",
      ctaFree: "Inizia Gratis",
      ctaChoose: "Scegli",
      plans: [
        { name: "Free", price: "€0", period: "forever", features: ["2 progetti attivi", "20 generazioni AI/mese", "10 immagini storyboard/mese", "5 export PDF/mese", "1 GB di storage"] },
        { name: "Standard", price: "€19,90", period: "month", features: ["10 progetti attivi", "150 generazioni AI/mese", "100 immagini storyboard/mese", "Export PDF illimitati", "5 GB di storage", "Link di revisione cliente"] },
        { name: "Pro", price: "€49,90", period: "month", popular: true, features: ["40 progetti attivi", "600 generazioni AI/mese", "400 immagini storyboard/mese", "Export PDF illimitati", "15 GB di storage", "3 postazioni team", "AI Director prioritario"] },
        { name: "Studio", price: "€99,90", period: "month", features: ["Progetti illimitati", "Generazioni AI illimitate", "2000 immagini storyboard/mese", "50 GB di storage", "10 postazioni team", "Portali cliente brandizzati"] },
      ],
    },
    faq: {
      kicker: "FAQ",
      title: "Domande, con risposta",
      items: [
        { q: "Come usa l'AI il brief del mio cliente?", a: "FrameFlow legge i documenti e le immagini che carichi ed estrae solo i dati dichiarati esplicitamente — ciascuno con una fonte citata. Non inventa mai informazioni; i dettagli mancanti restano vuoti in attesa della tua conferma." },
        { q: "I miei dati sono privati?", a: "I tuoi brief e progetti sono tuoi. Usiamo i tuoi contenuti solo per generare il tuo pacchetto di produzione, mai per addestrare modelli pubblici." },
        { q: "Posso esportare e condividere con i clienti?", a: "Sì — esporta un elegante pacchetto PDF o condividi un raffinato link di revisione con il cliente per feedback e approvazioni." },
        { q: "Servono competenze creative o tecniche?", a: "No. Descrivi il tuo progetto o carica un brief, e FrameFlow assembla un pacchetto professionale di pre-produzione che potrai affinare." },
        { q: "Posso disdire in qualsiasi momento?", a: "Assolutamente. I piani sono mensili e puoi effettuare upgrade, downgrade o disdire quando vuoi." },
      ],
    },
    finalCta: {
      title: "Pronto a produrre più velocemente?",
      subtitle: "Inizia gratis — nessuna carta di credito richiesta.",
      cta: "Inizia Gratis",
      placeholder: "La tua email di lavoro",
      success: "Sei nella lista — ti scriviamo a breve.",
      error: "Inserisci un'email valida.",
    },
    footer: {
      tagline: "La suite di produzione AI per filmmaker, videomaker e agenzie.",
      cols: [
        { h: "Azienda", links: [["Chi siamo", "#"], ["Lavora con noi", "#"], ["Contatti", "mailto:privacy@frameflowai.net"]] },
        { h: "Risorse", links: [["Blog", "#"], ["Guide", "#"], ["Supporto", "mailto:privacy@frameflowai.net"]] },
        { h: "Legale", links: [["Privacy", "/privacy"], ["Termini", "/termini"], ["Cookie", "/cookie"]] },
      ],
      copyright: "© 2026 FrameFlow Studio. Tutti i diritti riservati.",
    },
    auth: {
      signupTitle: "Crea il tuo account",
      signupSub: "Inizia gratis — nessuna carta di credito richiesta.",
      loginTitle: "Bentornato",
      loginSub: "Accedi al tuo workspace di produzione.",
      email: "Email",
      password: "Password",
      name: "Nome",
      signupBtn: "Crea account",
      loginBtn: "Accedi",
      soon: "Le registrazioni complete arrivano presto. Lascia la tua email per l'accesso anticipato.",
      back: "Torna alla home",
      joined: "Grazie! Ti avviseremo appena l'accesso sarà pronto.",
    },
    legal: {
      back: "Torna alla home",
      disclaimer: "Questo è un modello da revisionare con un legale prima della pubblicazione.",
      updated: "Ultimo aggiornamento: giugno 2026",
    },
  },
};

// English mirror
dict.en = {
  nav: { features: "Features", how: "How It Works", pricing: "Pricing", faq: "FAQ", login: "Log in", cta: "Start Free" },
  hero: {
    badge: "AI pre-production, reinvented",
    titleLines: ["The AI Production", "Suite for Filmmakers"],
    subtitle: "Turn a client brief into a complete production package in minutes — concept, screenplay, storyboard, shot list and more.",
    ctaPrimary: "Start Free",
    ctaSecondary: "Watch the Demo",
    trust: "No credit card · Free forever plan · Ready-to-use PDFs",
  },
  demo: {
    url: "app.frameflowai.net",
    steps: [
      { t: "Upload the brief", d: "client-brief.pdf · 8 pages" },
      { t: "AI reads the pages", d: "Scanning documents…" },
      { t: "Data extracted", d: "Every value cited from source" },
      { t: "Storyboard package ready", d: "Concept · Screenplay · Shot list" },
    ],
    extracted: ["Brand", "Product", "Audience", "Tone", "Duration", "Budget"],
    openDemo: "Watch the Demo",
  },
  trust: { label: "BUILT FOR MODERN VIDEO TEAMS", chips: ["Filmmakers", "Videomakers", "Ad agencies", "Production houses", "Content creators"] },
  beforeAfter: {
    kicker: "THE DIFFERENCE",
    title: "Like night and day",
    vs: "VS",
    before: { head: "Without FrameFlow", outcome: "Days of messy, manual work", items: ["Briefs buried in endless email", "A dozen disconnected tools", "Hours lost to manual planning", "The same work, done twice", "Guesswork and lost details"] },
    after: { head: "With FrameFlow", outcome: "A complete package in minutes", items: ["One brief in — a production workspace out", "From brief to full package in minutes", "Every value verified from source, never invented", "Share, review and export beautifully", "Safe, client-ready deliverables"] },
  },
  how: {
    kicker: "HOW IT WORKS",
    title: "From brief to package in six steps",
    steps: [
      { t: "Upload the Brief", d: "Drop the client brief — PDFs, documents and reference images." },
      { t: "AI Analysis", d: "Our AI reads every document and extracts the data, with sources." },
      { t: "Review", d: "Confirm the extracted data. Nothing is invented — every value is cited." },
      { t: "Generate", d: "Create concept, treatment, screenplay, storyboard and shot list." },
      { t: "Collaborate", d: "Share review links with the client and iterate together in real time." },
      { t: "Export", d: "Deliver an elegant, production-ready PDF package." },
    ],
  },
  stats: [
    { v: "Minutes", d: "From brief to full package" },
    { v: "6+", d: "Deliverables per project" },
    { v: "EN · IT", d: "Fully localized" },
    { v: "100%", d: "Source-verified, never invented" },
  ],
  brief: {
    kicker: "THE CLIENT BRIEF FLOW",
    title: "Upload a brief. Get a project.",
    body: "FrameFlow reads your client's brief and turns it into a structured production project — with every piece of information traced to its source.",
    list: ["Upload PDFs and images", "AI reads the documents", "Extracts the information (with sources)", "Auto-fills the project", "Generates the package"],
    cta: "Try It Free",
    fileName: "brief.pdf",
    fields: [
      { k: "Brand", v: "Aurora Automotive" },
      { k: "Product", v: "2026 Electric SUV" },
      { k: "Audience", v: "Urban 28–45" },
      { k: "Tone", v: "Elegant · Cinematic" },
      { k: "Duration", v: "60 seconds" },
    ],
  },
  features: {
    kicker: "EVERYTHING YOU NEED",
    title: "One workspace. The whole production.",
    items: [
      { t: "AI Director", d: "A creative co-pilot that refines any scene, tone or shot on command.", img: IMG.cameraSilhouette },
      { t: "Client Brief Import", d: "Turn chaotic briefs into a structured, source-verified project.", img: IMG.filmSet },
      { t: "Storyboard", d: "AI-generated frames with inline drag-and-drop editing.", img: IMG.storyboardSketch },
      { t: "Screenplay", d: "Narration, dialogue and voice-over in script format.", img: IMG.fashion },
      { t: "Shot List", d: "Every shot, angle and movement in one production-ready table.", img: IMG.desert },
      { t: "Equipment", d: "Recommended camera, lenses, lighting and audio for the shoot.", img: IMG.lens },
      { t: "Crew", d: "Suggested crew roles based on production level.", img: IMG.crewOutdoor },
      { t: "Schedule", d: "A realistic shooting plan with time breakdowns.", img: IMG.moto },
      { t: "Budget", d: "Budget estimates from entry-level to premium.", img: IMG.watch },
      { t: "Client Review", d: "Elegant review links for feedback and approvals.", img: IMG.perfume },
      { t: "PDF Export", d: "An elegant, production-ready package in one click.", img: IMG.food },
    ],
  },
  storyboard: { kicker: "STORYBOARD", title: "See your film before you shoot it" },
  gallery: {
    kicker: "STORYBOARD GALLERY",
    title: "Cinematic frames, AI-generated",
    subtitle: "Real storyboard frames FrameFlow can generate for your production — from a single brief.",
    items: [
      { img: IMG.carBeach, t: "Coastal drive", s: "GOLDEN HOUR" },
      { img: IMG.interior, t: "Interior", s: "AMBIENT LIGHT" },
      { img: IMG.cityNeon, t: "City night", s: "NEON" },
      { img: IMG.watch, t: "Detail", s: "STUDIO LIGHT" },
      { img: IMG.fashion, t: "Lifestyle", s: "SUNSET" },
      { img: IMG.desert, t: "Aerial", s: "DESERT HIGHWAY" },
    ],
  },
  pricing: {
    kicker: "PRICING",
    title: "Simple, transparent pricing",
    popular: "MOST POPULAR",
    perMonth: "/ month",
    forever: "/ forever",
    ctaFree: "Start Free",
    ctaChoose: "Choose",
    plans: [
      { name: "Free", price: "€0", period: "forever", features: ["2 active projects", "20 AI generations/mo", "10 storyboard images/mo", "5 PDF exports/mo", "1 GB storage"] },
      { name: "Standard", price: "€19.90", period: "month", features: ["10 active projects", "150 AI generations/mo", "100 storyboard images/mo", "Unlimited PDF exports", "5 GB storage", "Client review links"] },
      { name: "Pro", price: "€49.90", period: "month", popular: true, features: ["40 active projects", "600 AI generations/mo", "400 storyboard images/mo", "Unlimited PDF exports", "15 GB storage", "3 team seats", "Priority AI Director"] },
      { name: "Studio", price: "€99.90", period: "month", features: ["Unlimited projects", "Unlimited AI generations", "2000 storyboard images/mo", "50 GB storage", "10 team seats", "Branded client portals"] },
    ],
  },
  faq: {
    kicker: "FAQ",
    title: "Questions, answered",
    items: [
      { q: "How does the AI use my client's brief?", a: "FrameFlow reads the documents and images you upload and extracts only explicitly stated data — each with a cited source. It never invents information; missing details stay empty, awaiting your confirmation." },
      { q: "Is my data private?", a: "Your briefs and projects are yours. We only use your content to generate your production package, never to train public models." },
      { q: "Can I export and share with clients?", a: "Yes — export an elegant PDF package or share a refined client review link for feedback and approvals." },
      { q: "Do I need creative or technical skills?", a: "No. Describe your project or upload a brief, and FrameFlow assembles a professional pre-production package you can refine." },
      { q: "Can I cancel anytime?", a: "Absolutely. Plans are monthly and you can upgrade, downgrade or cancel whenever you like." },
    ],
  },
  finalCta: {
    title: "Ready to produce faster?",
    subtitle: "Start free — no credit card required.",
    cta: "Start Free",
    placeholder: "Your work email",
    success: "You're on the list — we'll be in touch shortly.",
    error: "Please enter a valid email.",
  },
  footer: {
    tagline: "The AI production suite for filmmakers, videomakers and agencies.",
    cols: [
      { h: "Company", links: [["About", "#"], ["Careers", "#"], ["Contact", "mailto:privacy@frameflowai.net"]] },
      { h: "Resources", links: [["Blog", "#"], ["Guides", "#"], ["Support", "mailto:privacy@frameflowai.net"]] },
      { h: "Legal", links: [["Privacy", "/privacy"], ["Terms", "/termini"], ["Cookie", "/cookie"]] },
    ],
    copyright: "© 2026 FrameFlow Studio. All rights reserved.",
  },
  auth: {
    signupTitle: "Create your account",
    signupSub: "Start free — no credit card required.",
    loginTitle: "Welcome back",
    loginSub: "Sign in to your production workspace.",
    email: "Email",
    password: "Password",
    name: "Name",
    signupBtn: "Create account",
    loginBtn: "Log in",
    soon: "Full sign-up is coming soon. Leave your email for early access.",
    back: "Back to home",
    joined: "Thanks! We'll notify you as soon as access is ready.",
  },
  legal: {
    back: "Back to home",
    disclaimer: "This is a template to be reviewed with a lawyer before publication.",
    updated: "Last updated: June 2026",
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("it");
  const toggle = useCallback(() => setLang((l) => (l === "it" ? "en" : "it")), []);
  const t = dict[lang];
  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useT must be used within LanguageProvider");
  return ctx;
}
