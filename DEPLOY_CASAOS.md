# Deploy su Raspberry Pi + CasaOS (Docker)

Guida pratica per il **Livello A**: app online 24/7, database persistente, accesso da telefono con Tailscale.

---

## Cosa dice Gemini vs cosa fare davvero

| Suggerimento Gemini | Correzione / nota |
|---------------------|-------------------|
| `Dockerfile` con `node:20-alpine` | Su Raspberry **meglio `node:20-bookworm-slim`**: `better-sqlite3` su Alpine spesso fallisce (musl + compilazione ARM). Il repo include già il Dockerfile corretto. |
| `"start": "node index.js"` | Nel tuo progetto è già `"start": "node server.js"` — ok. |
| `--env-file ./env` | Deve essere **`--env-file .env`** (con il punto). |
| Volume `.../percorso_del_tuo_db` | Il DB non sta in una sottocartella casuale: con Docker usi **`DATABASE_DIR=/data`** e monti `./Database` → `/data`. Vedi sotto. |
| Solo `docker run` | Su CasaOS è più semplice **`docker compose`** (file `docker-compose.yml` già nel repo). |

**PM2/systemd vs Docker:** con CasaOS Docker fa da solo restart, isolamento e deploy — **non serve PM2** se usi `restart: unless-stopped`.

---

## Percorso del database SQLite

| Ambiente | Dove finisce `unistrategy.db` |
|----------|-------------------------------|
| **Mac / sviluppo** | Radice progetto: `./unistrategy.db` |
| **Docker (CasaOS)** | Volume host `./Database` montato in container come **`/data/unistrategy.db`** |

Variabile nel container (già in `docker-compose.yml`):

```env
DATABASE_DIR=/data
```

SQLite crea anche `unistrategy.db-wal` e `unistrategy.db-shm` nella stessa cartella — per questo monti l’**intera cartella** `Database`, non solo un file.

---

## Fase 1 — Sul Mac (Cursor): file già pronti

Nel repo ci sono:

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `scripts/backup-database.sh` (backup notturno sul Pi)

Commit/push o copia la cartella sul Raspberry (USB, rsync, Git clone).

---

## Fase 2 — Sul Raspberry (CasaOS Files)

1. Crea `/mnt/storage/UniStrategy` (o il path che usi su CasaOS).
2. Dentro, crea la cartella vuota **`Database`** (qui vivrà il DB).
3. Copia **tutto il progetto** in `/mnt/storage/UniStrategy` (inclusi `Dockerfile`, `docker-compose.yml`, `package.json`, cartelle `server/`, `js/`, …).
4. Crea **`.env`** in `/mnt/storage/UniStrategy` (copia da `.env.example` e compila):

```env
PORT=3000
TZ=Europe/Rome
APP_BASE_URL=http://100.x.y.z:3000
REGISTRATION_INVITE_CODES=il-tuo-segreto-lungo
REGISTRATION_INVITE_MAX_USES=5

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
```

Sostituisci `100.x.y.z` con l’**IP Tailscale del Raspberry** (Fase 4) — aggiorna `.env` dopo aver installato Tailscale.

**Migrare dati dal Mac:** se hai già un `unistrategy.db` sul PC, copialo in `/mnt/storage/UniStrategy/Database/unistrategy.db` **prima** del primo avvio del container.

---

## Fase 3 — Build e avvio (terminale sul Raspberry)

```bash
cd /mnt/storage/UniStrategy
sudo docker compose up -d --build
```

- Prima build: può richiedere alcuni minuti (npm + compilazione `better-sqlite3` su ARM).
- App in LAN: `http://IP-DEL-RASPBERRY:3000`
- Log: `sudo docker compose logs -f`
- Stop: `sudo docker compose down` (il DB in `./Database` resta)

**Equivalente al `docker run` di Gemini** (solo se non usi compose):

```bash
sudo docker build -t unistrategy-image .
sudo docker run -d \
  --name UniStrategyApp \
  -p 3000:3000 \
  --env-file .env \
  -e DATABASE_DIR=/data \
  -e TZ=Europe/Rome \
  -v /mnt/storage/UniStrategy/Database:/data \
  --restart unless-stopped \
  unistrategy-image
```

---

## Fase 4 — Tailscale (telefono fuori casa)

1. App Store CasaOS → installa **Tailscale** → login.
2. App Tailscale su iPhone/Android → stesso account.
3. Annota l’IP `100.x.y.z` del Raspberry.
4. Sul telefono (con Tailscale attivo): `http://100.x.y.z:3000`
5. Aggiorna **`APP_BASE_URL=http://100.x.y.z:3000`** nel `.env` e riavvia:

```bash
cd /mnt/storage/UniStrategy
sudo docker compose up -d
```

---

## Fase 5 — Promemoria mail alle 8:00

Lo scheduler gira **dentro** il container Node (se il container è acceso).

Consigliato: **cron sul Raspberry** come rete di sicurezza (es. 8:05):

```bash
crontab -e
```

Aggiungi:

```cron
5 8 * * * cd /mnt/storage/UniStrategy && /usr/bin/docker compose exec -T unistrategy npm run reminders:run >> /mnt/storage/UniStrategy/reminders.log 2>&1
```

---

## Fase 6 — Backup notturno (opzionale)

Sul Pi:

```bash
chmod +x /mnt/storage/UniStrategy/scripts/backup-database.sh
```

Cron (ogni notte alle 3:00):

```cron
0 3 * * * /mnt/storage/UniStrategy/scripts/backup-database.sh /mnt/storage/UniStrategy/Database /mnt/storage/UniStrategy/backups
```

---

## Checklist Livello A completato

- [ ] Cartella `Database` creata e volume montato
- [ ] `.env` con SMTP, inviti, `APP_BASE_URL` (Tailscale)
- [ ] `docker compose up -d --build` ok
- [ ] Login / registrazione con codice invito
- [ ] Mail verifica account (link apre l’app)
- [ ] Tailscale da telefono fuori casa
- [ ] (Opzionale) cron promemoria + backup DB

---

## Problemi frequenti

| Problema | Soluzione |
|----------|-----------|
| Build fallisce su `better-sqlite3` | Usa il `Dockerfile` del repo (bookworm-slim), non Alpine. |
| App parte ma DB vuoto | Controlla che esista `./Database` e permessi scrittura. |
| Link email puntano a localhost | `APP_BASE_URL` = IP Tailscale o LAN reale. |
| Promemoria non arrivano | SMTP in `.env`; container acceso; prova `docker compose exec unistrategy npm run reminders:run`. |

---

Vedi anche **GUIDA_PROGETTO.md** per funzionalità app e roadmap posticipata (Telegram, PWA, export, dominio).
