# FrameFlow Studio — Web Migration Notes (per il progetto "frameflow ai 6")

Questo repository contiene **FrameFlow Studio**: una piattaforma AI di pre-produzione
per filmmaker. Stack attuale: **Expo (React Native, expo-router) + FastAPI + MongoDB**.
Obiettivo della migrazione: farla funzionare come **web app pubblica** (browser) da
servire sul dominio **frameflowai.net**, mantenendo TUTTE le funzionalità.

## Cosa NON cambiare
- Backend `/app/backend` (FastAPI + MongoDB): riusabile quasi al 100%. Tutte le rotte
  sono già sotto `/api`. Mantieni la logica di auth, pagamenti, AI, billing.
- Modelli dati e collezioni Mongo (users, projects, versions, subscriptions, usage,
  payment_transactions, user_sessions, password_resets, audit_logs).

## Cosa adattare
- Frontend `/app/frontend` è Expo/React Native. Va reso pienamente funzionante sul
  **web** (expo-router web già gira; verificare responsive, routing pubblico, SEO).
- Assicurarsi che la **landing** (`app/landing.tsx`) e le **pagine legali**
  (`app/legal/[doc].tsx` + `src/content/legal.ts`) siano navigabili pubblicamente.
- SEO/OG già impostati in `app/+html.tsx` con dominio `www.frameflowai.net`.

## SEGRETI / ENV da RE-INSERIRE nel nuovo progetto (NON arrivano da GitHub)
`backend/.env`:
- `EMERGENT_LLM_KEY`   → Universal Key (fornita dall'ambiente Emergent)
- `JWT_SECRET`         → genera una nuova stringa casuale
- `STRIPE_API_KEY`     → chiave test proxy Emergent (già disponibile nel pod)
- `PAYPAL_ENV=live`
- `PAYPAL_CLIENT_ID`   → (LIVE) inizia con `BAA...`
- `PAYPAL_SECRET`      → (LIVE) inizia con `EPEY...`
- `IMAGE_PROVIDER`, `OWNER_EMAIL` → valori di configurazione (vedi progetto originale)
- `MONGO_URL`, `DB_NAME` → forniti automaticamente dal nuovo ambiente (NON copiare)

`frontend/.env`: le variabili EXPO_* sono gestite dall'ambiente (NON copiare i valori).

## Funzionalità da preservare (checklist)
- [ ] Landing premium (dark cinematografico, logo Frame F oro) + i18n IT/EN
- [ ] Auth: registrazione, login email/password, Google (Emergent-managed)
- [ ] Dashboard progetti + editor storyboard (drag & drop, autosave)
- [ ] Import Brief cliente (multimodale) + estrazione con fonti ("Mostra fonte")
- [ ] Generazione AI (testo GPT + immagini OpenAI/Gemini) con selezione modello
- [ ] Pagamenti Stripe + PayPal (LIVE) + 4 piani con limiti lato server
- [ ] Cancellazione account (impostazioni) + pagine legali
- [ ] Loghi social in `frontend/public/brand/` e `frontend/assets/brand/social/`

## Dominio
Il dominio `frameflowai.net` + `www.frameflowai.net` va collegato a QUESTO deployment
web. Se risulta collegato a un progetto diverso (es. `flow-staging-9`), chiedere al
supporto (support@emergent.sh) di spostarlo su questo progetto.
