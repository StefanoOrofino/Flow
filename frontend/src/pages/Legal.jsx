import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { FrameLogo, Wordmark } from "../components/FrameLogo";
import { useT } from "../i18n";

const content = {
  it: {
    privacy: {
      title: "Informativa sulla Privacy",
      body: [
        ["Titolare del trattamento", "FrameFlow Studio (frameflowai.net) è il titolare del trattamento dei dati personali raccolti tramite questo sito. Per qualsiasi richiesta puoi scrivere a privacy@frameflowai.net."],
        ["Dati raccolti", "Raccogliamo l'indirizzo email che fornisci volontariamente tramite i moduli del sito (lista d'attesa, contatti) e dati tecnici anonimi di navigazione."],
        ["Finalità", "Utilizziamo i tuoi dati per informarti sulla disponibilità del servizio, rispondere alle tue richieste e migliorare il sito. I brief e i progetti che caricherai nell'app saranno usati solo per generare il tuo pacchetto di produzione, mai per addestrare modelli pubblici."],
        ["Base giuridica", "Il trattamento si basa sul tuo consenso e sul legittimo interesse a fornire e migliorare il servizio (art. 6 GDPR)."],
        ["Conservazione", "Conserviamo i dati per il tempo necessario alle finalità indicate e comunque nel rispetto degli obblighi di legge."],
        ["Diritti dell'interessato", "Hai diritto di accesso, rettifica, cancellazione, limitazione, portabilità e opposizione. Puoi esercitarli scrivendo a privacy@frameflowai.net."],
      ],
    },
    termini: {
      title: "Termini di Servizio",
      body: [
        ["Accettazione", "Utilizzando FrameFlow Studio accetti i presenti Termini di Servizio. Se non li accetti, ti invitiamo a non utilizzare il servizio."],
        ["Il servizio", "FrameFlow è una piattaforma di pre-produzione basata su AI che genera pacchetti di produzione a partire dai contenuti forniti dall'utente."],
        ["Account e piani", "Alcune funzionalità richiedono un account. I piani a pagamento sono mensili e possono essere sottoscritti, aggiornati o disdetti in qualsiasi momento."],
        ["Contenuti dell'utente", "Mantieni la piena proprietà dei brief e dei progetti che carichi. Ci concedi una licenza limitata al solo scopo di erogare il servizio."],
        ["Limitazione di responsabilità", "Il servizio è fornito \"così com'è\". Non garantiamo che i risultati generati siano privi di errori e resta tua responsabilità verificarne l'accuratezza."],
        ["Modifiche", "Possiamo aggiornare questi termini; le modifiche rilevanti saranno comunicate tramite il sito o via email."],
      ],
    },
    cookie: {
      title: "Cookie Policy",
      body: [
        ["Cosa sono i cookie", "I cookie sono piccoli file di testo memorizzati sul tuo dispositivo per far funzionare il sito e migliorarne l'esperienza."],
        ["Cookie tecnici", "Utilizziamo cookie tecnici necessari al funzionamento del sito, che non richiedono consenso."],
        ["Cookie analitici", "Possiamo utilizzare cookie di misurazione anonima per capire come viene usato il sito. Puoi disabilitarli dalle impostazioni del browser."],
        ["Gestione", "Puoi gestire o eliminare i cookie tramite le impostazioni del tuo browser in qualsiasi momento."],
      ],
    },
  },
  en: {
    privacy: {
      title: "Privacy Policy",
      body: [
        ["Data controller", "FrameFlow Studio (frameflowai.net) is the controller of personal data collected through this site. For any request, write to privacy@frameflowai.net."],
        ["Data we collect", "We collect the email address you voluntarily provide through site forms (waitlist, contact) and anonymous technical browsing data."],
        ["Purposes", "We use your data to inform you about service availability, respond to your requests and improve the site. The briefs and projects you upload in the app are used only to generate your production package, never to train public models."],
        ["Legal basis", "Processing is based on your consent and our legitimate interest in providing and improving the service (Art. 6 GDPR)."],
        ["Retention", "We keep data for as long as necessary for the stated purposes and in compliance with legal obligations."],
        ["Your rights", "You have the right to access, rectify, erase, restrict, port and object. Exercise them by writing to privacy@frameflowai.net."],
      ],
    },
    termini: {
      title: "Terms of Service",
      body: [
        ["Acceptance", "By using FrameFlow Studio you accept these Terms of Service. If you do not accept them, please do not use the service."],
        ["The service", "FrameFlow is an AI-based pre-production platform that generates production packages from user-provided content."],
        ["Accounts & plans", "Some features require an account. Paid plans are monthly and can be subscribed to, upgraded or cancelled at any time."],
        ["User content", "You retain full ownership of the briefs and projects you upload. You grant us a limited license solely to deliver the service."],
        ["Limitation of liability", "The service is provided \"as is\". We do not guarantee generated results are error-free and it remains your responsibility to verify their accuracy."],
        ["Changes", "We may update these terms; material changes will be communicated via the site or email."],
      ],
    },
    cookie: {
      title: "Cookie Policy",
      body: [
        ["What cookies are", "Cookies are small text files stored on your device to make the site work and improve the experience."],
        ["Technical cookies", "We use technical cookies necessary for the site to function, which do not require consent."],
        ["Analytics cookies", "We may use anonymous measurement cookies to understand how the site is used. You can disable them in your browser settings."],
        ["Management", "You can manage or delete cookies through your browser settings at any time."],
      ],
    },
  },
};

export default function Legal({ type = "privacy" }) {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const data = content[lang][type];

  return (
    <div className="min-h-screen bg-[#0C0C0E]">
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-10">
        <button onClick={() => navigate("/")} className="flex items-center gap-3">
          <FrameLogo size={36} />
          <Wordmark className="text-[#F5F1E8]" />
        </button>

        <div className="mt-14">
          <div className="text-xs uppercase tracking-[0.22em] text-[#C5A059]">{t.legal.updated}</div>
          <h1 data-testid="legal-title" className="font-serif-display mt-4 text-4xl md:text-5xl font-light text-[#F5F1E8]">
            {data.title}
          </h1>
          <div className="mt-6 rounded-xl border border-[#C5A059]/25 bg-[#C5A059]/[0.05] px-5 py-4 text-sm text-[#F5F1E8]/70">
            {t.legal.disclaimer}
          </div>

          <div className="mt-10 space-y-9">
            {data.body.map(([h, p]) => (
              <div key={h}>
                <h2 className="font-serif-display text-xl text-[#F5F1E8]">{h}</h2>
                <p className="mt-2.5 text-[15px] text-[#F5F1E8]/65 leading-relaxed">{p}</p>
              </div>
            ))}
          </div>

          <button
            data-testid="legal-back"
            onClick={() => navigate("/")}
            className="mt-14 flex items-center gap-2 text-sm text-[#F5F1E8]/55 hover:text-[#C5A059] transition-colors duration-300"
          >
            <ArrowLeft size={15} /> {t.legal.back}
          </button>
        </div>
      </div>
    </div>
  );
}
