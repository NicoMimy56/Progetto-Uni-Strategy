# Uni-Strategy — Guida al progetto

Documento di riepilogo: **cosa fa l’app**, **cosa è stato aggiunto di recente**, **come configurarla**, e **cosa resta da fare** (in particolare per il mini-server di casa).

Ultimo aggiornamento: maggio 2026.

---

## 1. Cos’è Uni-Strategy

Applicazione web personale per gestire il percorso universitario:

- **Esami** (da sostenere / completati, CFU, voti, date)
- **Piano studio** (sessioni con data, orario, descrizione)
- **Calendario** e **organizzazione settimanale**
- **Media ponderata**, simulatore voti, grafico andamento
- **Cerchio CFU** (progresso verso l’obiettivo di laurea)
- **Impostazioni** (lingua, tema, CFU totali, obiettivo di laurea)
- **Account** con email e password (verifica email via SMTP)
- **Richieste di implementazione** (invio opzionale via email al proprietario del progetto)

**Stack tecnico:**

| Parte | Tecnologia |
|--------|------------|
| Frontend | HTML, CSS, JavaScript modulare (`js/`) |
| Backend | Node.js + Express (`server.js`, cartella `server/`) |
| Database | SQLite (`unistrategy.db` nella radice progetto) |
| Email | Nodemailer + SMTP (es. Gmail con password per le app) |
| Traduzioni UI | `locales/*.json` + i18next nel browser |

---

## 2. Architettura semplificata

```
Browser (index.html + js/app.js)
        │
        │  fetch /api/...  (cookie di sessione)
        ▼
server.js  →  createApp()  →  routes.js (API REST)
        │
        ├── database.js  →  unistrategy.db
        ├── auth.js      →  login, sessioni, password
        ├── featureRequestMail.js  →  SMTP generico
        ├── calendarReminders.js   →  scheduler promemoria
        ├── calendarReminderMail.js + calendarReminderI18n.js
        └── inviteCodes.js         →  codici invito registrazione
```

All’avvio del server (`node server.js` o `npm run dev`):

1. Viene caricato il file **`.env`**
2. Si crea/aggiorna il database SQLite
3. Parte il server HTTP sulla porta configurata (default **3000**)
4. Parte lo **scheduler dei promemoria calendario** (se non disabilitato)

---

## 3. Funzionalità già presenti (base dell’app)

Queste c’erano già prima degli ultimi interventi:

- Registrazione, login, logout, verifica email
- CRUD esami, piano studio, esami simulati
- Bootstrap unico (`GET /api/bootstrap`) dopo il login
- Temi colore e più lingue (it, en, fr, de, ro, es)
- Grafico andamento media, home con tabella esami compatta
- Tab Richieste con invio SMTP opzionale

---

## 4. Cosa abbiamo aggiunto (lavoro recente)

### 4.1 Email promemoria dal calendario

**Obiettivo:** ricevere mail automatiche su cosa fare, in base a calendario e piano studio.

| Tipo | Quando viene inviata | Oggetto email | Contenuto |
|------|----------------------|---------------|-----------|
| **Esame** | Il **giorno prima** della data esame | `ESAME IMMINENTE` (tradotto) | Messaggio cortese + box con materia, crediti, data, stato |
| **Piano studio** | Il **giorno stesso** dell’attività | `COSE DA FARE OGGI` (tradotto) | Messaggio cortese + **tabella** (materia, descrizione, orario) |

**Dettagli tecnici:**

- File principali: `server/calendarReminders.js`, `server/calendarReminderMail.js`
- Tabella `calendar_reminder_log`: evita di mandare la stessa mail due volte lo stesso giorno
- Solo utenti con **email verificata**
- Destinatario: **email dell’account** (non la casella `FEEDBACK_TO_EMAIL`)
- Scheduler: controlla ogni minuto; invio all’ora impostata (default **8:00**, ora del server)
- Script manuale: `npm run reminders:run` (utile per test)

**Lingua delle mail:** segue `profile.language` dalle Impostazioni (stringhe in `locales/*.json` → sezione `calendarReminders`).

**Esami considerati:** stato diverso da `Completed`, con `exam_date` impostata.

**Sessioni considerate (giorno X):**

- `session_date` = quel giorno, oppure
- senza data ma con `day` = giorno della settimana corrispondente (come in calendario).

---

### 4.2 Cerchio CFU con esami da sostenere

**Obiettivo:** vedere non solo i CFU già presi, ma anche **a quanto arriveresti** includendo gli esami ancora da fare.

Il grafico ad anello (Home) ha **tre fette**:

1. **Verde pieno** — CFU acquisiti (esami completati)
2. **Verde trasparente** — CFU degli esami **da sostenere**
3. **Grigio** — CFU ancora mancanti rispetto all’obiettivo (`totalCfu` in Impostazioni)

In legenda compaiono anche **Arrivo previsto** (acquisiti + da sostenere) e, al centro, una riga tipo «→ 85% se completi gli esami in programma» quando ci sono esami pendenti.

---

### 4.3 Codice invito per la registrazione

**Obiettivo:** non permettere a chiunque con l’URL di creare un account.

- Senza codici validi sul server → **registrazione chiusa** (tab «Registrati» disabilitata)
- Con codici nel `.env` → campo **Codice invito** obbligatorio in registrazione
- File: `server/inviteCodes.js`, tabella `invite_codes`
- API: `GET /api/auth/registration-config`, `POST /api/auth/register` con body `{ email, password, inviteCode }`

Gli account **già esistenti** non sono toccati.

---

## 5. Configurazione — file `.env`

Il file **`.env`** sta nella **radice del progetto** (non va su Git). Copia da **`.env.example`** e compila.

### Variabili principali

| Variabile | A cosa serve |
|-----------|----------------|
| `PORT` | Porta HTTP (default 3000) |
| `APP_BASE_URL` | URL pubblico **senza** slash finale; usato nei link «conferma email». Es. `http://192.168.1.50:3000` in LAN |
| `REGISTRATION_INVITE_CODES` | Uno o più codici separati da virgola. **Obbligatori** per aprire le registrazioni |
| `REGISTRATION_INVITE_MAX_USES` | Quante registrazioni per codice (default 5). Per un solo utente: `1` |
| `SMTP_*` | Invio email (verifica account, promemoria, richieste) |
| `FEEDBACK_TO_EMAIL` | Destinatario delle richieste dal tab Richieste |
| `CALENDAR_REMINDER_HOUR` | Ora invio promemoria (0–23), default 8 |
| `CALENDAR_REMINDER_DISABLED` | Se `true`, lo scheduler promemoria non parte |

### Esempio minimo per inviti + mail

```env
PORT=3000
APP_BASE_URL=http://localhost:3000

REGISTRATION_INVITE_CODES=un-segreto-lungo-e-univoco
REGISTRATION_INVITE_MAX_USES=5

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tua-email@gmail.com
SMTP_PASS=password-per-le-app-16-caratteri
SMTP_FROM=tua-email@gmail.com
```

**Nota:** finché lavori solo sul PC personale, aggiungi le righe invito al **tuo** `.env` quando vuoi provare; il server va riavviato manualmente da te (non è configurato per restare sempre acceso sul Mac di sviluppo).

---

## 6. Come usare le novità (uso quotidiano)

### Promemoria email

1. SMTP configurato e funzionante (`npm run smtp:verify` quando avvii il server)
2. Server **acceso** all’ora impostata (sul mini-server: sempre; sul PC: solo quando lo avvii tu)
3. Esami con **data** e stato da sostenere; sessioni piano studio sul giorno giusto

Test manuale (con server avviato da te):

```bash
npm run reminders:run
```

### Codice invito

1. Imposta `REGISTRATION_INVITE_CODES` nel `.env`
2. Riavvia il server
3. Nuovo utente: tab Registrati → inserisce codice + email + password → conferma email

### Cerchio CFU

- Imposta **CFU totali obiettivo** in Impostazioni e salva
- Aggiungi esami **da sostenere** con i relativi CFU: compariranno nella fetta trasparente

---

## 7. Script npm utili

| Comando | Cosa fa |
|---------|---------|
| `npm run dev` / `npm start` | Avvia il server |
| `npm run smtp:verify` | Verifica credenziali SMTP |
| `npm run reminders:run` | Esegue subito un ciclo promemoria (senza aspettare le 8:00) |

---

## 8. File e cartelle importanti

| Percorso | Ruolo |
|----------|--------|
| `server.js` | Avvio processo Node |
| `server/routes.js` | Tutte le API `/api/...` |
| `server/database.js` | Schema SQLite e migrazioni leggere |
| `server/inviteCodes.js` | Logica codici invito |
| `server/calendarReminders.js` | Scheduler promemoria |
| `server/calendarReminderMail.js` | Template HTML email promemoria |
| `server/calendarReminderI18n.js` | Lingua mail da `locales/` + profilo utente |
| `server/featureRequestMail.js` | SMTP condiviso (richieste, verifica email) |
| `js/app.js` | Logica UI principale |
| `js/constants.js` | Temi, lingue, versione cache i18n |
| `locales/*.json` | Traduzioni (UI + email `calendarReminders`) |
| `unistrategy.db` | Database (backup consigliato) |
| `.env` | Segreti e configurazione (solo sul server / PC locale) |
| `.env.example` | Modello senza password vere |

---

## 9. Situazione attuale vs mini-server

### Dove siamo ora

- Sviluppo e test sul **PC personale**
- **Non** è configurato per girare sempre in background sul Mac (scelta voluta)
- **Non** c’è ancora dominio né deploy sul mini-server

### Cosa intendi fare (riepilogo tue scelte)

| Aspetto | Scelta |
|---------|--------|
| Accesso da casa (Wi‑Fi) | Sì |
| Accesso da telefono fuori casa | Sì (probabilmente **Tailscale** o simile, finché non hai dominio) |
| Dominio / HTTPS pubblico | **Dopo**, quando compri il dominio |
| Registrazione aperta a tutti | **No** — codice invito |
| Telegram / Discord, export/import, PWA | **Dopo** — non implementati |

---

## 10. Deploy sul mini-server (CasaOS + Docker)

**Guida passo-passo:** vedi **`DEPLOY_CASAOS.md`**.

Con CasaOS + Raspberry Pi **usa Docker** (non PM2/systemd): `restart: unless-stopped` tiene l’app accesa 24/7.

### 10.1 Trasferimento

- Progetto in `/mnt/storage/UniStrategy` (cartella `Database` per il DB)
- `docker compose up -d --build`

### 10.2 Database persistente

- Volume `./Database` → `/data` nel container
- Variabile `DATABASE_DIR=/data` → file `unistrategy.db` sopravvive ai rebuild

### 10.3 `.env` sul Pi

- SMTP, `REGISTRATION_INVITE_CODES`, `TZ=Europe/Rome`
- `APP_BASE_URL=http://100.x.y.z:3000` (IP Tailscale del Raspberry)

### 10.4 Tailscale + backup + promemoria

- Tailscale su Pi e telefono per accesso fuori casa
- Script `scripts/backup-database.sh` + cron notturno
- Cron opzionale: `docker compose exec … npm run reminders:run`

*(PM2/systemd: solo se **non** usi Docker.)*

---

## 11. Da fare più avanti (funzionalità posticipate)

Queste voci le avevi esplicitamente messe in **«si faranno dopo»**:

| Funzione | Descrizione breve |
|----------|-----------------|
| **Notifiche Telegram / Discord** | Oltre alla mail, messaggio istantaneo su esami e sessioni |
| **Export / import dati** | Backup JSON scaricabile e ripristino da file |
| **PWA** | «Aggiungi a schermata Home» sul telefono, esperienza tipo app |
| **Dominio + HTTPS** | URL pubblico bello, certificato SSL, `APP_BASE_URL` definitivo |

### Altre idee utili (discusse ma non implementate)

| Idea | Utilità |
|------|---------|
| Pannello stato sistema | SMTP ok?, ultimo promemoria, spazio DB |
| Rate limit login | Protezione brute force se esponi la porta |
| Disabilitare registrazione senza codici | Già fatto con inviti |
| Simulatore nel cerchio CFU | Fetta extra per scenario «what-if» |
| Widget «prossimi 7 giorni» | Riepilogo settimana in Home |
| Report PDF / stampabile | Snapshot percorso per tutor |
| Watchdog (Uptime Kuma) | Avviso se il server non risponde |
| Ambiente staging | Seconda istanza per provare aggiornamenti |

---

## 12. Risoluzione problemi rapida

| Problema | Cosa controllare |
|----------|------------------|
| Nessuna mail promemoria | SMTP in `.env`, server acceso all’ora giusta, `CALENDAR_REMINDER_DISABLED` non è `true` |
| Mail in italiano sbagliata | Lingua in Impostazioni salvata; stringhe in `locales/<lingua>.json` |
| Non posso registrarmi | `REGISTRATION_INVITE_CODES` nel `.env`, codice corretto, usi non esauriti |
| Tab Registrati disabilitata | Nessun codice valido in DB/env — aggiungi codici e riavvia |
| Link verifica email rotto | `APP_BASE_URL` deve essere l’URL con cui apri davvero l’app |
| Cerchio CFU strano | `totalCfu` in Impostazioni; somma CFU esami da sostenere + completati |

---

## 13. Riepilogo in una frase

**Uni-Strategy** oggi è un gestionale universitario completo in locale, con **mail promemoria multilingua**, **cerchio CFU che include gli esami da fare**, e **registrazione solo su invito**; il passo successivo naturale è metterlo su un **mini-server sempre acceso**, con **backup**, **Tailscale** per il telefono fuori casa, e in seguito **dominio**, **HTTPS**, e le funzioni **Telegram / export / PWA**.

---

*Per modifiche al codice o alla guida, aggiorna questo file quando aggiungi funzionalità rilevanti.*
