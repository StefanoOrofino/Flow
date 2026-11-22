# Biglietteria 3D – prototipo

Prototipo da presentare internamente: biglietteria con stadio in 3D, prezzi gestiti da pannello,
blocco dei posti, biglietti nominativi, pagamento simulato, QR firmati e controllo ai varchi.

Non è collegato a sistemi reali: partite, prevendita e pagamenti sono simulati. Il marchio è neutro
("Club di casa", si cambia in `club_name` nel listino) e i colori stanno nei token CSS delle pagine.

## Avvio

```bash
cd ticketing
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app:app --reload
```

Apri:

| Pagina | Indirizzo | A cosa serve |
|---|---|---|
| Biglietteria | http://localhost:8000/ | Scegli partita, settore e posto in 3D, carrello, nominativi, pagamento, biglietti con QR |
| Prezzi e vendite | http://localhost:8000/admin.html | Listino per zona, categorie partita, riduzioni, prezzo dinamico, nuove partite, report vendite. Token: `demo-admin` (variabile `ADMIN_TOKEN`) |
| Controllo varchi | http://localhost:8000/gate.html | Verifica del QR: valido, già usato, partita sbagliata, contraffatto |

Carte di prova: `4242 4242 4242 4242` va a buon fine, `4000 0000 0000 0002` viene rifiutata.

Al primo avvio vengono create tre partite di esempio con una prevendita simulata. Per ripartire da zero
cancella `ticketing.db`.

## Modalità demo (senza server)

Se le pagine non trovano il backend (per esempio aperte da un link condiviso), `web/mockapi.js` risponde
alle chiamate `/api/*` direttamente nel browser con le stesse regole, salvando i dati nel browser.
Con il backend avviato non interviene. Serve solo per far provare il flusso: la demo non protegge
dai doppi acquisti tra persone diverse, perché ogni browser ha i suoi dati.

## Come funziona

**Posti** (`backend/venue.py`). Settori, file e posti dello stadio, generati dalla stessa geometria usata
dalla pagina 3D. In produzione si sostituisce con la pianta ufficiale esportata dal sistema dell'impianto.
Ogni posto ha un codice `settore-fila-posto` (es. `104-6-13`) e appartiene a una zona di prezzo
(es. `1-ARANCIO-C` = primo anello arancio centrale).

**Prezzi** (`backend/pricing.py`). Prezzo base della zona (o prezzo personalizzato per la singola partita)
× moltiplicatore della categoria partita (A+, A, B, C) × rincaro dinamico quando la zona si riempie
− sconto del tipo di biglietto (Under 18, Over 65), arrotondato all'euro. Più una commissione fissa.
Le riduzioni sono verificate sulla data di nascita del titolare il giorno della partita.

**Blocco posti e niente doppie vendite**. Quando si procede al pagamento i posti passano a "bloccato" per
10 minuti con un'unica scrittura condizionata ("solo se ancora liberi") dentro una transazione: se due
persone provano a prendere lo stesso posto, una sola ci riesce. Alla scadenza i posti tornano liberi.
C'è un test con 12 richieste contemporanee sullo stesso posto.

**Biglietti**. Nominativi, con un QR che contiene un codice firmato (HMAC): non si può inventare né
modificare. Al varco ogni biglietto passa una volta sola.

## Test

```bash
pytest -q
```

## Cosa manca per andare in produzione

- **Emissione certificata**: in Italia i titoli d'accesso vanno emessi da un sistema di biglietteria
  approvato (Agenzia delle Entrate / SIAE). Questo prototipo dovrebbe parlare con il sistema certificato
  del club invece di emettere i biglietti da solo.
- **Pagamenti reali** con un PSP (Stripe, Adyen, Nexi…): pagina di pagamento ospitata e conferma via webhook
  al posto di `POST /api/orders/{id}/pay`.
- **Account e regole del club**: login tifosi, prelazione abbonati, tessera del tifoso, limiti per persona
  (non solo per ordine), cambio nominativo, rimborsi, verifica di divieti d'accesso.
- **Carico**: PostgreSQL al posto di SQLite, coda virtuale per l'apertura vendite, protezione dai bot.
- **QR dinamico** (che cambia ogni pochi secondi) contro screenshot e rivendita.
- **Dati reali**: pianta ufficiale dei posti, settori ospiti, posti con visibilità ridotta, accessibilità.
