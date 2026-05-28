/**
 * @file server/database.js
 *
 * Inizializzazione del database SQLite tramite `better-sqlite3` (API sincrona, adatta a carichi moderati).
 *
 * Contenuto principale:
 * - path del file `unistrategy.db` nella radice del progetto (persistente tra riavvii del server);
 * - `journal_mode = WAL` (Write-Ahead Logging): letture non bloccano scritture come nel rollback journal classico;
 * - `CREATE TABLE IF NOT EXISTS` per idempotenza (riavvio sicuro);
 * - migrazioni leggere con `hasColumn` + `ALTER TABLE` per installazioni già esistenti senza tool di migration esterni.
 *
 * Attenzione: `hasColumn` interpola il nome tabella in `PRAGMA table_info`. Qui i nomi sono costanti interne,
 * non input utente — non generalizzare con stringhe arbitrarie senza whitelist.
 */
const path = require("path");
const Database = require("better-sqlite3");
const { ROOT } = require("./paths");

const dbPath = path.join(ROOT, "unistrategy.db");
const db = new Database(dbPath);

/** WAL: file `-wal` affiancato al DB; migliora parallelismo in scenari read-heavy */
db.pragma("journal_mode = WAL");

/**
 * Schema relazionale (sintesi):
 *
 * - Tabella `users`: account (email univoca, hash password + sale); opzionalmente `email_verified_at` (ms epoch) e token di verifica finché l’utente non conferma l’email.
 * - Tabella `user_sessions`: token opachi legati a `user_id` con scadenza assoluta (`expires_at` ms).
 * - Tabella `exams`: esami dell'utente; `user_id` NULL era possibile in DB legacy, oggi le API filtrano per utente corrente.
 * - Tabella `study_sessions`: slot piano studio; `id` TEXT (UUID dal client) per idempotenza lato insert.
 * - Tabella `settings`: KV globale (poco usato nel flusso attuale).
 * - Tabella `user_settings`: KV per utente; chiavi note `target_gpa` (stringa numerica) e `profile` (JSON stringificato).
 * - Tabella `simulated_exams`: righe del simulatore media (non copiano la tabella `exams`).
 * - Tabella `feature_requests`: richieste dal tab Richieste; `email_sent` indica se l’SMTP ha accettato l’invio.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    subject TEXT NOT NULL,
    credits INTEGER NOT NULL,
    grade REAL,
    exam_date TEXT,
    status TEXT NOT NULL CHECK(status IN ('To Take', 'In Preparation', 'Completed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS study_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    day TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY(user_id, key),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS simulated_exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    credits INTEGER NOT NULL,
    planned_grade REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  -- Codici invito registrazione (sincronizzati da REGISTRATION_INVITE_CODES in .env)
  CREATE TABLE IF NOT EXISTS invite_codes (
    code TEXT PRIMARY KEY,
    max_uses INTEGER NOT NULL DEFAULT 5,
    uses_count INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Log invii promemoria calendario (evita duplicati se il server resta acceso)
  CREATE TABLE IF NOT EXISTS calendar_reminder_log (
    user_id INTEGER NOT NULL,
    reminder_type TEXT NOT NULL CHECK(reminder_type IN ('exam_imminent', 'daily_tasks')),
    reference_date TEXT NOT NULL,
    sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, reminder_type, reference_date),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  -- Richieste inviate da utenti autenticati (POST /api/feature-requests); email opzionale via nodemailer
  CREATE TABLE IF NOT EXISTS feature_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    email_sent INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

/**
 * @param {string} tableName nome tabella (solo valori interni costanti)
 * @param {string} columnName nome colonna da verificare
 */
function hasColumn(tableName, columnName) {
  return db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .some((column) => column.name === columnName);
}

/* Migrazioni additive: DB creati prima dell'introduzione di alcune colonne */
if (!hasColumn("study_sessions", "description")) {
  db.exec("ALTER TABLE study_sessions ADD COLUMN description TEXT");
}
if (!hasColumn("exams", "user_id")) {
  db.exec("ALTER TABLE exams ADD COLUMN user_id INTEGER");
}
if (!hasColumn("study_sessions", "user_id")) {
  db.exec("ALTER TABLE study_sessions ADD COLUMN user_id INTEGER");
}
if (!hasColumn("study_sessions", "session_date")) {
  db.exec("ALTER TABLE study_sessions ADD COLUMN session_date TEXT");
}

/* Verifica email in registrazione: colonne aggiunte in un secondo momento; utenti già presenti restano considerati verificati. */
if (!hasColumn("users", "email_verified_at")) {
  db.exec("ALTER TABLE users ADD COLUMN email_verified_at INTEGER");
  db.exec("ALTER TABLE users ADD COLUMN email_verify_token TEXT");
  db.exec("ALTER TABLE users ADD COLUMN email_verify_expires_at INTEGER");
  const legacyVerified = Date.now();
  db.prepare("UPDATE users SET email_verified_at = ? WHERE email_verified_at IS NULL").run(legacyVerified);
}

module.exports = { db, hasColumn };
