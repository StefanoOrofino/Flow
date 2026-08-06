# Prompt pronto — Ricrea la landing premium di FrameFlow Studio (Full Stack App / Web)

Copia e incolla tutto il testo qui sotto in un NUOVO progetto "Full Stack App".

---

Voglio una **landing page marketing premium e responsive** (web, con dominio personalizzato) per il mio prodotto **FrameFlow Studio**: una piattaforma AI di pre-produzione che trasforma il brief di un cliente in un pacchetto di produzione completo (concept, sceneggiatura, storyboard, shot list, budget). Rispondimi e costruisci in **italiano**, ma il sito deve essere **bilingue IT/EN** con toggle istantaneo nella nav (default: Italiano).

## Stile / Brand (OBBLIGATORIO)
- **Tema scuro cinematografico bloccato** (NIENTE toggle chiaro/scuro). Sfondo ink `#0C0C0E`, testo crema `#F5F1E8`, testo secondario crema al 70%.
- **Accento oro** `#C5A059`, con gradiente metallico oro per il logo e gli elementi hero: `#EBD08A → #C5A059 → #9A7B3C`.
- **Font**: titoli/hero con **Fraunces** (serif editoriale); testo con **Inter**. Caricali via Google Fonts.
- Look di riferimento: Frame.io / Linear / Stripe / Apple — elegante, arioso, divisori sottili 1px, tanto spazio bianco, micro-animazioni discrete (fade-in on scroll, hover zoom sulle immagini). Niente blu/viola.
- **Logo "Frame F"**: una lettera **F** in oro metallico costruita come una **pellicola cinematografica** (asta verticale con i fori della pellicola/sprocket + due bracci pieni), racchiusa in una tile quadrata con angoli arrotondati (stile app-icon). Usalo nella nav e nel footer.

## Struttura delle sezioni (in quest'ordine)
1. **Nav sticky** (con ombra all'scroll): logo Frame F + nome "FrameFlow", link ancora [Funzionalità, Come Funziona, Prezzi, FAQ], selettore lingua IT/EN, bottone "Accedi", bottone oro "Inizia Gratis".
2. **Hero**: badge "La pre-produzione con l'AI, reinventata"; titolo serif grande **"La Suite di Produzione AI per Filmmaker"**; sottotitolo "Trasforma un brief del cliente in un pacchetto di produzione completo in pochi minuti — concept, sceneggiatura, storyboard, shot list e altro ancora."; una **tile oro grande del logo Frame F** con glow; bottoni "Inizia Gratis" (oro) + "Guarda la Demo"; micro-trust "Nessuna carta di credito · Piano gratuito per sempre · PDF pronti all'uso".
3. **Demo animata** (mockup browser con url `app.frameflowai.net`): una "video-demo" a passi che si autoavvia — 1) Carica il brief 2) L'AI legge le pagine (linea di scansione animata) 3) Dati estratti con spunte verdi 4) Pacchetto storyboard pronto. Il bottone "Guarda la Demo" apre un popup con la stessa demo più grande.
4. **Trust chips**: label "PENSATO PER I TEAM VIDEO MODERNI" + chip [Filmmaker, Videomaker, Agenzie pubblicitarie, Case di produzione, Content creator]. (Nessun logo aziendale finto.)
5. **Before/After "Come il giorno e la notte"** (kicker "LA DIFFERENZA"): due card affiancate con badge "VS" oro al centro.
   - **Senza FrameFlow** (card spenta, pallini rossi ✗, icona orologio, esito "Giorni di lavoro manuale e disordinato"): "Brief sepolti tra infinite email", "Una decina di strumenti scollegati", "Ore perse in pianificazione manuale", "Lo stesso lavoro, fatto due volte", "Approssimazioni e dettagli persi".
   - **Con FrameFlow** (card elevata oro, glow, spunte oro ✓, esito "Un pacchetto completo in pochi minuti"): "Un brief dentro — un workspace di produzione fuori", "Dal brief al pacchetto completo in pochi minuti", "Ogni dato verificato dalle fonti, mai inventato", "Condividi, revisiona ed esporta con eleganza", "Deliverable sicuri e pronti per il cliente".
6. **Come Funziona** (kicker "COME FUNZIONA", titolo "Dal brief al pacchetto in sei passi"): 6 card con foto di copertina cinematografica + badge numero + icona oro:
   1 Carica il Brief — "Trascina il brief del cliente — PDF, documenti e immagini di riferimento."
   2 Analisi AI — "La nostra AI legge ogni documento ed estrae i dati, con le fonti."
   3 Revisione — "Conferma i dati estratti. Nulla è inventato — ogni valore è citato."
   4 Genera — "Crea concept, treatment, sceneggiatura, storyboard e shot list."
   5 Collabora — "Condividi link di revisione con il cliente e itera insieme in tempo reale."
   6 Esporta — "Consegna un pacchetto PDF elegante e pronto per la produzione."
7. **Stats bar** (valori oro Fraunces): "Minuti" / Dal brief al pacchetto completo · "6+" / Deliverable per progetto · "EN · IT" / Completamente localizzato · "100%" / Verificato dalle fonti, mai inventato.
8. **Flusso Brief Cliente** (kicker "IL FLUSSO DEL BRIEF CLIENTE", titolo "Carica un brief. Ottieni un progetto."): paragrafo + lista numerata [Carica PDF e immagini, L'AI legge i documenti, Estrae le informazioni (con le fonti), Compila automaticamente il progetto, Genera il pacchetto] + CTA "Provalo Gratis"; a fianco un mock "brief.pdf" con campi estratti e spunte.
9. **Funzionalità** (kicker "TUTTO CIÒ CHE TI SERVE", titolo "Un unico workspace. L'intera produzione."): griglia di 11 card con foto di copertina commerciale varia (auto, moto, profumo/beauty, orologio, moda, sneaker, food, ecc.) + icona oro:
   AI Director — "Un co-pilota creativo che affina qualsiasi scena, tono o inquadratura a comando."; Import Brief Cliente — "Trasforma brief caotici in un progetto strutturato e verificato dalle fonti."; Storyboard — "Fotogrammi generati dall'AI con editor inline e drag-and-drop."; Sceneggiatura — "Narrazione, dialoghi e voce fuori campo in formato copione."; Shot List — "Ogni inquadratura, angolo e movimento in un'unica tabella pronta per la produzione."; Attrezzatura — "Camera, ottiche, luci e audio consigliati per le riprese."; Troupe — "Ruoli della troupe suggeriti in base al livello di produzione."; Programma — "Un piano di riprese realistico con la suddivisione dei tempi."; Budget — "Stime di budget dalla fascia base a quella premium."; Revisione Cliente — "Link di revisione eleganti per feedback e approvazioni."; (aggiungine 1 coerente, es. Esportazione PDF).
10. **Storyboard showcase** (kicker "STORYBOARD", titolo "Vedi il tuo film prima di girarlo"): griglia di fotogrammi numerati.
11. **Gallery** (kicker "GALLERIA STORYBOARD", titolo "Fotogrammi cinematografici, generati dall'AI", sottotitolo "Fotogrammi storyboard reali che FrameFlow può generare per la tua produzione — da un solo brief."): griglia responsive di 6 immagini cinematografiche (auto/lifestyle) con caption a due righe (titolo bianco Fraunces + sottotitolo oro maiuscolo) + barra oro a sinistra + badge numero. Caption: "Guida costiera · Ora d'oro", "Interni · Luce ambientale", "Notte in città · Neon", "Dettaglio · Luce da studio", "Lifestyle · Tramonto", "Aerea · Autostrada nel deserto".
12. **Prezzi** (kicker "PREZZI", titolo "Prezzi semplici e trasparenti") — 4 piani, con "Pro" evidenziato (glow oro + pill "PIÙ POPOLARE"):
    - **Free** €0 / per sempre: 2 progetti attivi, 20 generazioni AI/mese, 10 immagini storyboard/mese, 5 export PDF/mese, 1 GB di storage.
    - **Standard** €19,90 / mese: 10 progetti attivi, 150 generazioni AI/mese, 100 immagini storyboard/mese, Export PDF illimitati, 5 GB di storage, Link di revisione cliente.
    - **Pro** €49,90 / mese (PIÙ POPOLARE): 40 progetti attivi, 600 generazioni AI/mese, 400 immagini storyboard/mese, Export PDF illimitati, 15 GB di storage, 3 postazioni team, AI Director prioritario.
    - **Studio** €99,90 / mese: Progetti illimitati, Generazioni AI illimitate, 2000 immagini storyboard/mese, 50 GB di storage, 10 postazioni team & portali cliente brandizzati.
    Bottoni: "Inizia Gratis" (Free) e "Scegli {nome}" per gli altri.
13. **FAQ** (accordion, kicker "FAQ", titolo "Domande, con risposta"): 
    Q "Come usa l'AI il brief del mio cliente?" A "FrameFlow legge i documenti e le immagini che carichi ed estrae solo i dati dichiarati esplicitamente — ciascuno con una fonte citata. Non inventa mai informazioni; i dettagli mancanti restano vuoti in attesa della tua conferma."
    Q "I miei dati sono privati?" A "I tuoi brief e progetti sono tuoi. Usiamo i tuoi contenuti solo per generare il tuo pacchetto di produzione, mai per addestrare modelli pubblici."
    Q "Posso esportare e condividere con i clienti?" A "Sì — esporta un elegante pacchetto PDF o condividi un raffinato link di revisione con il cliente per feedback e approvazioni."
    Q "Servono competenze creative o tecniche?" A "No. Descrivi il tuo progetto o carica un brief, e FrameFlow assembla un pacchetto professionale di pre-produzione che potrai affinare."
    Q "Posso disdire in qualsiasi momento?" A "Assolutamente. I piani sono mensili e puoi effettuare upgrade, downgrade o disdire quando vuoi."
14. **CTA finale** (card gradiente scuro con glow oro): titolo "Pronto a produrre più velocemente?", sottotitolo "Inizia gratis — nessuna carta di credito richiesta.", bottone oro grande "Inizia Gratis".
15. **Footer**: logo + "La suite di produzione AI per filmmaker, videomaker e agenzie." + colonne [Azienda: Chi siamo/Lavora con noi/Contatti] [Risorse: Blog/Guide/Supporto] [Legale: Privacy/Termini/Cookie] + "© 2026 FrameFlow Studio. Tutti i diritti riservati."

## Comportamenti / dettagli
- Bottoni "Inizia Gratis" e "Accedi" portano a /signup e /login (o placeholder se l'app non è ancora nel progetto).
- Le voci Legale aprono pagine Privacy / Termini / Cookie (crea pagine con testo GDPR di base + disclaimer "modello da revisionare con un legale"). Email di contatto e dominio: **frameflowai.net** (usa privacy@frameflowai.net finché non ti do la mia email reale).
- **SEO/Open Graph**: `<title>` "FrameFlow Studio — AI Pre-Production Suite for Filmmakers", meta description, theme-color `#0C0C0E`, canonical e og:url `https://www.frameflowai.net/`, og:image/twitter:image assoluti; genera un'immagine OG 1200x630 scura con logo Frame F oro + "FrameFlow Studio".
- Immagini cinematografiche: generale con AI (o placeholder eleganti se non disponibile) — 16:9, look premium automotive/lifestyle.
- Responsive: 3 colonne desktop, 2 tablet, 1 mobile; su mobile mostra la Gallery subito dopo l'Hero.

Costruisci prima l'intera landing, poi fammi vedere uno screenshot desktop + mobile.
