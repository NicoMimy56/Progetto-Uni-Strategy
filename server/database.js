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
 * - **users**: account (email univoca, hash password + sale).
 * - **user_sessions**: token opachi legati a `user_id` con scadenza assoluta (`expires_at` ms).
 * - **exams**: esami dell'utente; `user_id` NULL era possibile in DB legacy, oggi le API filtrano per utente corrente.
 * - **study_sessions**: slot piano studio; `id` TEXT (UUID dal client) per idempotenza lato insert.
 * - **settings**: KV globale (poco usato nel flusso attuale).
 * - **user_settings**: KV per utente; chiavi note `target_gpa` (stringa numerica) e `profile` (JSON stringificato).
 * - **simulated_exams**: righe del simulatore media (non copiano la tabella exams).
 * - **feature_requests**: richieste di implementazione dal tab Richieste; `email_sent` indica se l’SMTP ha accettato l’invio.
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

module.exports = { db, hasColumn };
