# Uni-Strategy

**Uni-Strategy** is a self-hosted web application to manage your university journey: exams, study sessions, weighted GPA, credit progress, and graduation targets — all in one place, running on your own hardware.

Built as a lightweight **Node.js + SQLite** stack with a vanilla JavaScript frontend (no React/Vue build step). Ideal for a **Raspberry Pi**, home NAS, or any small Linux server you control.

---

## Table of contents

- [What it does](#what-it-does)
- [Features](#features)
- [How it works](#how-it-works)
- [Use cases](#use-cases)
- [Requirements](#requirements)
- [Quick start (local development)](#quick-start-local-development)
- [Configuration](#configuration)
- [Deploy on a mini-server](#deploy-on-a-mini-server)
  - [Option A — Docker (recommended)](#option-a--docker-recommended)
  - [Option B — Node.js directly](#option-b--nodejs-directly)
  - [Remote access with Tailscale](#remote-access-with-tailscale)
  - [Calendar email reminders](#calendar-email-reminders)
  - [Database backup](#database-backup)
- [npm scripts](#npm-scripts)
- [Project structure](#project-structure)
- [Security notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## What it does

Uni-Strategy helps students (or small groups) keep academic life organized:

- Track **exams** (pending / completed, credits, grades, dates)
- Plan **study sessions** with date, time, subject, and notes
- View a **monthly calendar** and a **weekly board** on the Home page
- Monitor **weighted GPA**, a **trend chart**, and a **target average** simulator (“what grade do I need to graduate with X?”)
- Visualize **credit (CFU/ECTS) progress** with a donut chart including pending exams
- Customize **language** (IT, EN, FR, DE, RO, ES) and **color themes**
- Receive optional **email reminders** for upcoming exams and same-day study tasks

Each user has a private account. Data is stored locally in **SQLite** — nothing is sent to third-party cloud services except optional SMTP for emails you configure yourself.

---

## Features

| Area | Details |
|------|---------|
| **Home** | Weighted GPA, CFU donut chart, weekly schedule, grade trend graph, compact exam list with filters |
| **Exam management** | Add / edit / delete exams, inline editing, grade simulator (“what-if” scenarios) |
| **Calendar** | Monthly exam view with mobile-friendly agenda list |
| **Study plan** | Drag-and-drop weekly board, monthly filter, time picker |
| **Settings** | Language, theme presets, total CFU target, graduation date, feature requests |
| **Auth** | Email + password, email verification, invite-only registration |
| **Email** | Account verification, calendar reminders, optional feature-request forwarding |

---

## How it works

```
Browser (index.html + js/app.js)
        │
        │  fetch /api/...  (session cookie)
        ▼
server.js  →  createApp()  →  routes.js (REST API)
        │
        ├── database.js          →  SQLite (unistrategy.db)
        ├── auth.js              →  login, sessions, password hashing
        ├── inviteCodes.js       →  invite-only registration
        ├── featureRequestMail.js → SMTP (verification + feedback)
        └── calendarReminders.js →  scheduled exam/study email reminders
```

On startup the server:

1. Loads **`.env`** configuration
2. Creates or migrates the **SQLite** schema
3. Listens on **`PORT`** (default `3000`)
4. Starts the **calendar reminder scheduler** (unless disabled)

After login, the client loads all user data in one call (`GET /api/bootstrap`) and keeps the UI in sync via REST endpoints.

---

## Use cases

- **Personal degree tracker** — run it on your laptop during the semester, or on a Pi at home for 24/7 access
- **Small study group / dorm** — share one instance on LAN; each person gets an account via invite code
- **Always-on home server** — Docker on Raspberry Pi + Tailscale to open the app from your phone anywhere
- **Privacy-first alternative** to cloud spreadsheets — your grades and schedule stay on your machine

Registration is **invite-only** by design: without valid codes in `.env`, the sign-up tab stays closed so random visitors cannot create accounts on a public URL.

---

## Requirements

- **Node.js 20+** (LTS recommended) for native installs
- **npm** (comes with Node)
- **Docker + Docker Compose** (optional, recommended on ARM devices like Raspberry Pi)
- An **SMTP provider** (e.g. Gmail with an App Password) if you want email verification and reminders

---

## Quick start (local development)

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/UniStrategy.git
cd UniStrategy

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
# Edit .env — at minimum set REGISTRATION_INVITE_CODES and SMTP_* if you need email

# 4. Start the server
npm run dev
```

Open **http://localhost:3000** in your browser.

- **Register** with your invite code, then confirm your email (if SMTP is configured)
- Or create the first user after setting `REGISTRATION_INVITE_CODES` in `.env`

Verify SMTP (optional):

```bash
npm run smtp:verify
```

---

## Configuration

Copy **`.env.example`** to **`.env`** in the project root. Never commit `.env` to Git.

| Variable | Purpose |
|----------|---------|
| `PORT` | HTTP port (default `3000`) |
| `TZ` | Server timezone (e.g. `Europe/Rome`) — affects reminder hour |
| `APP_BASE_URL` | Public URL **without** trailing slash; used in verification email links |
| `REGISTRATION_INVITE_CODES` | Comma-separated invite codes; **required** to allow registration |
| `REGISTRATION_INVITE_MAX_USES` | Max sign-ups per code (default `5`; use `1` for personal codes) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Outgoing mail (Gmail: use a 16-char App Password) |
| `FEEDBACK_TO_EMAIL` | Recipient for in-app feature requests |
| `CALENDAR_REMINDER_HOUR` | Hour to send reminders (0–23, default `8`) |
| `CALENDAR_REMINDER_DISABLED` | Set to `true` to disable the built-in scheduler |
| `DATABASE_DIR` | Folder for SQLite files (Docker: `/data`) |

**Example minimal `.env`:**

```env
PORT=3000
TZ=Europe/Rome
APP_BASE_URL=http://localhost:3000

REGISTRATION_INVITE_CODES=my-long-secret-code
REGISTRATION_INVITE_MAX_USES=5

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=you@gmail.com
```

---

## Deploy on a mini-server

These steps work for a **Raspberry Pi**, an old PC with Linux, a NAS with Docker, or **CasaOS**.

### Option A — Docker (recommended)

The repository includes a **`Dockerfile`** (Debian-based, ARM-friendly for `better-sqlite3`) and **`docker-compose.yml`**.

#### 1. Prepare the server

```bash
# Install Docker (Debian/Ubuntu example)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in, then:
docker compose version
```

#### 2. Copy the project

```bash
sudo mkdir -p /opt/unistrategy
sudo chown $USER:$USER /opt/unistrategy
cd /opt/unistrategy

git clone https://github.com/YOUR_USERNAME/UniStrategy.git .
# Or: rsync/scp from your development machine
```

#### 3. Create persistent data folder and config

```bash
mkdir -p Database
cp .env.example .env
nano .env   # set APP_BASE_URL, invite codes, SMTP, etc.
```

Set in `.env` for Docker (already handled by compose, but good to know):

```env
DATABASE_DIR=/data
APP_BASE_URL=http://YOUR_SERVER_IP:3000
```

#### 4. Build and run

```bash
docker compose up -d --build
```

Useful commands:

```bash
# View logs
docker compose logs -f

# Restart after .env changes
docker compose up -d

# Stop (database in ./Database is preserved)
docker compose down

# Run reminder job manually
docker compose exec unistrategy npm run reminders:run
```

The app listens on **port 3000**. Open `http://<server-ip>:3000` from your LAN.

**Database location with Docker:**

| Environment | Path |
|-------------|------|
| Local dev | `./unistrategy.db` (project root) |
| Docker | `./Database/unistrategy.db` on the host (mounted as `/data` in the container) |

To migrate an existing database, copy your `unistrategy.db` into `Database/` **before** the first container start.

---

### Option B — Node.js directly

If you prefer not to use Docker:

```bash
cd /opt/unistrategy
npm install --omit=dev
cp .env.example .env
nano .env
npm start
```

Keep it running with **systemd** (example service file):

```ini
# /etc/systemd/system/unistrategy.service
[Unit]
Description=Uni-Strategy
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/opt/unistrategy
Environment=NODE_ENV=production
Environment=TZ=Europe/Rome
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now unistrategy
sudo systemctl status unistrategy
```

Or use **PM2**:

```bash
npm install -g pm2
pm2 start server.js --name unistrategy
pm2 save
pm2 startup
```

---

### Remote access with Tailscale

To use the app from your phone **outside your home Wi‑Fi** without opening router ports:

1. Install [Tailscale](https://tailscale.com/) on the server and on your phone
2. Note the server’s Tailscale IP (e.g. `100.64.115.12`)
3. Open `http://100.x.y.z:3000` on your phone (with Tailscale connected)
4. Update **`.env`**:

   ```env
   APP_BASE_URL=http://100.x.y.z:3000
   ```

5. Restart the app / container so verification email links use the correct URL

Later you can add a domain, reverse proxy (Caddy/Nginx), and HTTPS with Let’s Encrypt.

---

### Calendar email reminders

When SMTP is configured and the server is running:

| Type | When sent | Content |
|------|-----------|---------|
| **Exam** | Day **before** the exam date | Subject, credits, date, status |
| **Study session** | Same **day** as the session | Table with subject, description, time |

- Only **verified** email accounts receive reminders
- Language follows the user’s setting in **Settings**
- A built-in scheduler checks every minute and sends at `CALENDAR_REMINDER_HOUR` (default 8:00 server time)

**Recommended:** add a cron job as a safety net (if the Node process was down at 8:00):

```cron
# Docker — every day at 8:05
5 8 * * * cd /opt/unistrategy && docker compose exec -T unistrategy npm run reminders:run >> /opt/unistrategy/reminders.log 2>&1

# Native Node — every day at 8:05
5 8 * * * cd /opt/unistrategy && /usr/bin/npm run reminders:run >> /opt/unistrategy/reminders.log 2>&1
```

Test immediately:

```bash
npm run reminders:run
# or
docker compose exec unistrategy npm run reminders:run
```

---

### Database backup

SQLite stores everything in **`unistrategy.db`**. Back it up regularly.

Using the included script:

```bash
chmod +x scripts/backup-database.sh

# Docker layout
./scripts/backup-database.sh ./Database ./backups

# Local dev
./scripts/backup-database.sh . ./backups
```

Nightly cron example:

```cron
0 3 * * * /opt/unistrategy/scripts/backup-database.sh /opt/unistrategy/Database /opt/unistrategy/backups
```

The script keeps the **last 14** daily copies.

---

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the server (same as `npm start`) |
| `npm start` | Production start (`node server.js`) |
| `npm run smtp:verify` | Test SMTP credentials from `.env` |
| `npm run reminders:run` | Run calendar reminders once (manual / cron) |

---

## Project structure

```
UniStrategy/
├── index.html          # App shell (auth + main UI)
├── styles.css          # Global styles and themes
├── server.js           # Entry point
├── server/
│   ├── createApp.js    # Express setup
│   ├── routes.js       # REST API
│   ├── database.js     # SQLite schema
│   ├── auth.js         # Sessions and passwords
│   ├── inviteCodes.js  # Invite-only registration
│   ├── calendarReminders.js
│   └── featureRequestMail.js
├── js/
│   ├── app.js          # Main UI logic
│   ├── api.js          # HTTP client
│   ├── academic.js     # GPA / CFU calculations
│   ├── constants.js    # Themes, languages
│   ├── dom.js          # DOM references
│   └── store.js        # Client-side state
├── locales/            # i18n JSON (UI + email strings)
├── assets/             # Logos and icons
├── scripts/
│   ├── backup-database.sh
│   ├── smtp-verify.js
│   └── run-calendar-reminders.js
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── LICENSE
```

Additional Italian deployment notes: [`docs/deploy-casaos-it.md`](docs/deploy-casaos-it.md).

---

## Security notes

- **Never commit `.env`** — it contains SMTP passwords and invite codes
- Use **long, random invite codes**; set `REGISTRATION_INVITE_MAX_USES=1` for single-user codes
- **`APP_BASE_URL`** must match how users actually reach the app, or email links will break
- For HTTPS deployments, serve behind a reverse proxy and consider secure cookie settings
- This is a personal/small-group tool — not hardened for anonymous public internet exposure at scale

Before publishing to GitHub, ensure your local `.env` and `unistrategy.db` are **not** tracked (see `.gitignore`).

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| Cannot register | `REGISTRATION_INVITE_CODES` in `.env`; correct code; uses not exhausted; restart server |
| Sign-up tab disabled | No valid invite codes configured |
| Emails not sent | Run `npm run smtp:verify`; Gmail needs App Password + 2FA |
| Verification link broken | `APP_BASE_URL` must match the URL you use in the browser |
| No calendar reminders | SMTP configured; server running at reminder hour; email verified; exams have dates |
| Empty DB after Docker | Ensure `./Database` exists and volume is mounted; check `DATABASE_DIR=/data` |
| `better-sqlite3` build fails | Use the provided Dockerfile (Debian slim, not Alpine) on Raspberry Pi |

---

## License

[ISC](LICENSE) — see the LICENSE file for details.

---

## Contributing

Issues and pull requests are welcome. If you deploy Uni-Strategy on unusual hardware or improve the docs, feel free to share your setup.

**Enjoy staying on top of your degree.**
