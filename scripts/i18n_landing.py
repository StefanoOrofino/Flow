import json

EN_PATH = "/app/frontend/src/i18n/en.json"
IT_PATH = "/app/frontend/src/i18n/it.json"

en_landing = {
    "nav": {
        "features": "Features",
        "how": "How it Works",
        "pricing": "Pricing",
        "faq": "FAQ",
        "login": "Login",
        "startFree": "Start Free",
    },
    "hero": {
        "badge": "AI pre-production, reinvented",
        "title": "The AI Production Suite for Filmmakers",
        "subtitle": "Turn a client brief into a complete production package in minutes — concept, script, storyboard, shot list and more.",
        "watchDemo": "Watch Demo",
    },
    "trust": {
        "label": "TRUSTED BY FILMMAKERS, AGENCIES & PRODUCTION COMPANIES",
    },
    "problem": {
        "kicker": "THE PROBLEM",
        "title": "Pre-production is scattered and slow",
        "withoutLabel": "Without FrameFlow",
        "withLabel": "With FrameFlow",
        "without": [
            "Scattered briefs & email threads",
            "Disconnected tools",
            "Hours of manual planning",
            "Repeated, duplicated work",
        ],
        "with": [
            "One AI-powered production workspace",
            "Brief → package in minutes",
            "Source-verified, never invented",
            "Share, review and export beautifully",
        ],
    },
    "how": {
        "kicker": "HOW IT WORKS",
        "title": "From brief to package in six steps",
        "steps": [
            {"title": "Upload Brief", "desc": "Drop in the client brief — PDFs, docs and reference images."},
            {"title": "AI Analysis", "desc": "Our AI reads every document and extracts the facts, with sources."},
            {"title": "Review", "desc": "Confirm the extracted facts. Nothing is invented — every value is cited."},
            {"title": "Generate", "desc": "Produce concept, treatment, script, storyboard and shot list."},
            {"title": "Collaborate", "desc": "Share client review links and iterate together in real time."},
            {"title": "Export", "desc": "Deliver a beautiful, production-ready PDF package."},
        ],
    },
    "brief": {
        "kicker": "THE CLIENT BRIEF WORKFLOW",
        "title": "Upload a brief. Get a project.",
        "para": "Drop in a PDF and reference images. FrameFlow reads every page, extracts the facts with citations, auto-fills your project, and generates a complete production package — all in minutes.",
        "steps": [
            "Upload PDF & images",
            "AI reads the documents",
            "Extracts information (with sources)",
            "Auto-fills the project",
            "Generates the package",
        ],
        "cta": "Try it Free",
    },
    "features": {
        "kicker": "EVERYTHING YOU NEED",
        "title": "One workspace. The whole production.",
        "cards": [
            {"title": "AI Director", "desc": "A creative co-pilot that refines any scene, tone or shot on command."},
            {"title": "Client Brief Import", "desc": "Turn messy briefs into a structured, source-verified project."},
            {"title": "Storyboard", "desc": "AI-generated frames with an inline, drag-and-drop editor."},
            {"title": "Script Writer", "desc": "Screenplay-formatted narrative, dialogue and voice-over."},
            {"title": "Shot List", "desc": "Every shot, angle and movement in one production-ready table."},
            {"title": "Equipment", "desc": "Recommended camera, lenses, lighting and audio for the shoot."},
            {"title": "Crew", "desc": "Suggested crew roles scaled to your production level."},
            {"title": "Schedule", "desc": "A realistic shooting schedule and time breakdown."},
            {"title": "Budget", "desc": "Estimated budget ranges from low to premium."},
            {"title": "Client Review", "desc": "Elegant shareable links for feedback and approvals."},
            {"title": "PDF Export", "desc": "A polished package clients and crew will love."},
        ],
    },
    "storyboard": {
        "kicker": "STORYBOARD",
        "title": "See your film before you shoot it",
    },
    "pricing": {
        "kicker": "PRICING",
        "title": "Simple, transparent pricing",
        "startFree": "Start Free",
        "getPlan": "Get {{name}}",
        "mostPopular": "MOST POPULAR",
        "plans": {
            "free": {
                "name": "Free", "price": "€0", "per": "forever",
                "feats": ["3 active projects", "20 AI generations / mo", "10 storyboard images / mo", "5 PDF exports / mo", "5 GB cloud storage"],
            },
            "pro": {
                "name": "Pro", "price": "€19", "per": "/ month",
                "feats": ["25 active projects", "500 AI generations / mo", "300 storyboard images / mo", "Unlimited PDF exports", "10 GB cloud storage", "Priority AI Director"],
            },
            "studio": {
                "name": "Studio", "price": "€49", "per": "/ month",
                "feats": ["Unlimited projects", "Unlimited AI generations", "1500 storyboard images / mo", "Team seats & portals", "15 GB cloud storage"],
            },
        },
    },
    "faq": {
        "kicker": "FAQ",
        "title": "Questions, answered",
        "items": [
            {"q": "How does the AI use my client brief?", "a": "FrameFlow reads your uploaded documents and images and extracts only the facts that are explicitly stated — each with a cited source. It never invents information; missing details stay empty for you to confirm."},
            {"q": "Is my data private?", "a": "Your briefs and projects are yours. We use your content only to generate your production package, never to train public models."},
            {"q": "Can I export and share with clients?", "a": "Yes — export a beautiful PDF package or share an elegant client review link for feedback and approvals."},
            {"q": "Do I need creative or technical skills?", "a": "No. Describe your project or drop a brief, and FrameFlow assembles a professional pre-production package you can refine."},
            {"q": "Can I cancel anytime?", "a": "Absolutely. Plans are month-to-month and you can upgrade, downgrade or cancel whenever you like."},
        ],
    },
    "finalCta": {
        "title": "Ready to produce faster?",
        "subtitle": "Start free — no credit card required.",
        "cta": "Start Free",
    },
    "footer": {
        "note": "The AI production suite for filmmakers, videographers and agencies.",
        "companyTitle": "Company",
        "company": ["About", "Careers", "Contact"],
        "resourcesTitle": "Resources",
        "resources": ["Blog", "Guides", "Support"],
        "legalTitle": "Legal",
        "legal": ["Privacy", "Terms"],
        "copyright": "© 2026 FrameFlow Studio. All rights reserved.",
    },
}

it_landing = {
    "nav": {
        "features": "Funzionalità",
        "how": "Come Funziona",
        "pricing": "Prezzi",
        "faq": "FAQ",
        "login": "Accedi",
        "startFree": "Inizia Gratis",
    },
    "hero": {
        "badge": "La pre-produzione con l'AI, reinventata",
        "title": "La Suite di Produzione AI per Filmmaker",
        "subtitle": "Trasforma un brief del cliente in un pacchetto di produzione completo in pochi minuti — concept, sceneggiatura, storyboard, shot list e altro ancora.",
        "watchDemo": "Guarda la Demo",
    },
    "trust": {
        "label": "SCELTO DA FILMMAKER, AGENZIE E CASE DI PRODUZIONE",
    },
    "problem": {
        "kicker": "IL PROBLEMA",
        "title": "La pre-produzione è dispersiva e lenta",
        "withoutLabel": "Senza FrameFlow",
        "withLabel": "Con FrameFlow",
        "without": [
            "Brief sparsi e catene di email",
            "Strumenti scollegati tra loro",
            "Ore di pianificazione manuale",
            "Lavoro ripetuto e duplicato",
        ],
        "with": [
            "Un unico workspace di produzione con l'AI",
            "Dal brief al pacchetto in pochi minuti",
            "Verificato dalle fonti, mai inventato",
            "Condividi, revisiona ed esporta con eleganza",
        ],
    },
    "how": {
        "kicker": "COME FUNZIONA",
        "title": "Dal brief al pacchetto in sei passi",
        "steps": [
            {"title": "Carica il Brief", "desc": "Trascina il brief del cliente — PDF, documenti e immagini di riferimento."},
            {"title": "Analisi AI", "desc": "La nostra AI legge ogni documento ed estrae i dati, con le fonti."},
            {"title": "Revisione", "desc": "Conferma i dati estratti. Nulla è inventato — ogni valore è citato."},
            {"title": "Genera", "desc": "Crea concept, treatment, sceneggiatura, storyboard e shot list."},
            {"title": "Collabora", "desc": "Condividi link di revisione con il cliente e itera insieme in tempo reale."},
            {"title": "Esporta", "desc": "Consegna un pacchetto PDF elegante e pronto per la produzione."},
        ],
    },
    "brief": {
        "kicker": "IL FLUSSO DEL BRIEF CLIENTE",
        "title": "Carica un brief. Ottieni un progetto.",
        "para": "Trascina un PDF e le immagini di riferimento. FrameFlow legge ogni pagina, estrae i dati con le citazioni, compila automaticamente il progetto e genera un pacchetto di produzione completo — tutto in pochi minuti.",
        "steps": [
            "Carica PDF e immagini",
            "L'AI legge i documenti",
            "Estrae le informazioni (con le fonti)",
            "Compila automaticamente il progetto",
            "Genera il pacchetto",
        ],
        "cta": "Provalo Gratis",
    },
    "features": {
        "kicker": "TUTTO CIÒ CHE TI SERVE",
        "title": "Un unico workspace. L'intera produzione.",
        "cards": [
            {"title": "AI Director", "desc": "Un co-pilota creativo che affina qualsiasi scena, tono o inquadratura a comando."},
            {"title": "Import Brief Cliente", "desc": "Trasforma brief caotici in un progetto strutturato e verificato dalle fonti."},
            {"title": "Storyboard", "desc": "Fotogrammi generati dall'AI con editor inline e drag-and-drop."},
            {"title": "Sceneggiatura", "desc": "Narrazione, dialoghi e voce fuori campo in formato copione."},
            {"title": "Shot List", "desc": "Ogni inquadratura, angolo e movimento in un'unica tabella pronta per la produzione."},
            {"title": "Attrezzatura", "desc": "Camera, ottiche, luci e audio consigliati per le riprese."},
            {"title": "Troupe", "desc": "Ruoli della troupe suggeriti in base al livello di produzione."},
            {"title": "Programma", "desc": "Un piano di riprese realistico con la suddivisione dei tempi."},
            {"title": "Budget", "desc": "Stime di budget dalla fascia base a quella premium."},
            {"title": "Revisione Cliente", "desc": "Link condivisibili ed eleganti per feedback e approvazioni."},
            {"title": "Esportazione PDF", "desc": "Un pacchetto curato che clienti e troupe adoreranno."},
        ],
    },
    "storyboard": {
        "kicker": "STORYBOARD",
        "title": "Vedi il tuo film prima di girarlo",
    },
    "pricing": {
        "kicker": "PREZZI",
        "title": "Prezzi semplici e trasparenti",
        "startFree": "Inizia Gratis",
        "getPlan": "Scegli {{name}}",
        "mostPopular": "PIÙ POPOLARE",
        "plans": {
            "free": {
                "name": "Free", "price": "€0", "per": "per sempre",
                "feats": ["3 progetti attivi", "20 generazioni AI / mese", "10 immagini storyboard / mese", "5 esportazioni PDF / mese", "5 GB di spazio cloud"],
            },
            "pro": {
                "name": "Pro", "price": "€19", "per": "/ mese",
                "feats": ["25 progetti attivi", "500 generazioni AI / mese", "300 immagini storyboard / mese", "Esportazioni PDF illimitate", "10 GB di spazio cloud", "AI Director prioritario"],
            },
            "studio": {
                "name": "Studio", "price": "€49", "per": "/ mese",
                "feats": ["Progetti illimitati", "Generazioni AI illimitate", "1500 immagini storyboard / mese", "Posti team e portali", "15 GB di spazio cloud"],
            },
        },
    },
    "faq": {
        "kicker": "FAQ",
        "title": "Domande, con risposta",
        "items": [
            {"q": "Come usa l'AI il brief del mio cliente?", "a": "FrameFlow legge i documenti e le immagini che carichi ed estrae solo i dati dichiarati esplicitamente — ciascuno con una fonte citata. Non inventa mai informazioni; i dettagli mancanti restano vuoti in attesa della tua conferma."},
            {"q": "I miei dati sono privati?", "a": "I tuoi brief e progetti sono tuoi. Usiamo i tuoi contenuti solo per generare il tuo pacchetto di produzione, mai per addestrare modelli pubblici."},
            {"q": "Posso esportare e condividere con i clienti?", "a": "Sì — esporta un elegante pacchetto PDF o condividi un raffinato link di revisione con il cliente per feedback e approvazioni."},
            {"q": "Servono competenze creative o tecniche?", "a": "No. Descrivi il tuo progetto o carica un brief, e FrameFlow assembla un pacchetto professionale di pre-produzione che potrai affinare."},
            {"q": "Posso disdire in qualsiasi momento?", "a": "Assolutamente. I piani sono mensili e puoi effettuare upgrade, downgrade o disdire quando vuoi."},
        ],
    },
    "finalCta": {
        "title": "Pronto a produrre più velocemente?",
        "subtitle": "Inizia gratis — nessuna carta di credito richiesta.",
        "cta": "Inizia Gratis",
    },
    "footer": {
        "note": "La suite di produzione AI per filmmaker, videomaker e agenzie.",
        "companyTitle": "Azienda",
        "company": ["Chi siamo", "Lavora con noi", "Contatti"],
        "resourcesTitle": "Risorse",
        "resources": ["Blog", "Guide", "Supporto"],
        "legalTitle": "Legale",
        "legal": ["Privacy", "Termini"],
        "copyright": "© 2026 FrameFlow Studio. Tutti i diritti riservati.",
    },
}

for path, block in [(EN_PATH, en_landing), (IT_PATH, it_landing)]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    data["landing"] = block
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"updated {path}")
