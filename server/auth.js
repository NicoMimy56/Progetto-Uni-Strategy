/**
 * @file server/auth.js
 *
 * Modulo dedicato alla sicurezza degli accessi:
 * - hashing password con scrypt (resistente a brute-force rispetto a SHA-1/MD5);
 * - emissione e validazione dei cookie di sessione;
 * - middleware Express `requireAuth` per proteggere le route API sensibili.
 *
 * Il modello di minaccia tipico qui è: attacker con accesso readonly al DB ⇒ non deve poter usare gli hash senza brute-force pesante (scrypt aumenta il costo). Attacker che ruba cookie ⇒ può impersonare utente fino a scadenza sessione ⇒ in produzione usare sempre HTTPS (`Secure`) e considerate refresh token più corti se necessario.
 */
const crypto = require("crypto");
const { db } = require("./database");
const { SESSION_TTL_MS, COOKIE_NAME } = require("./config");

/**
 * Calcola l'hash della password usando scrypt (API sincrona di Node crypto).
 *
 * Flusso registrazione: `salt` omesso ⇒ generazione casuale 16 byte hex; salvare su `users`
 * sia `password_salt` sia `password_hash`.
 *
 * Flusso login: passare il `salt` letto dal DB così il risultato è confrontabile deterministicamente
 * con `password_hash` persistito.
 *
 * @param {string} password chiave in chiaro (non loggare mai)
 * @param {string} [salt] stringa hex; se assente ne viene creata una nuova
 * @returns {{ salt: string, hash: string }} entrambi in formato esadecimale
 */
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

/**
 * Parsing minimale dell'header HTTP `Cookie: a=1; b=two`.
 * Non implementa tutte le RFC (es. attributi dopo il valore); sufficiente per cookie di sessione semplice.
 * @param {import("express").Request} req
 * @returns {Record<string, string>}
 */
function parseCookies(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce((acc, item) => {
    const [key, ...rest] = item.trim().split("=");
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

/**
 * Invia header `Set-Cookie` che il browser assocerà alle richieste same-origin successive.
 *
 * SameSite=Lax: il cookie viene inviato con navigazioni top-level GET da altri siti,
 * riducendo alcuni attach CSRF su POST cross-site ma non eliminando del tutto la necessità di
 * validazioni lato server su azioni distruttive.
 *
 * Non impostiamo `Secure` così il server gira anche su http://localhost; in produzione con TLS andrebbe aggiunto.
 *
 * @param {import("express").Response} res
 * @param {string} token token opaco generato da `createSession`
 */
function setSessionCookie(res, token) {
  const maxAge = SESSION_TTL_MS / 1000;
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Max-Age=${maxAge}; HttpOnly; Path=/; SameSite=Lax`
  );
}

/** Rimuove effettivamente il cookie sovrascrivendo con Max-Age=0 */
function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Max-Age=0; HttpOnly; Path=/; SameSite=Lax`);
}

/**
 * Persiste una nuova riga in `user_sessions` e restituisce il token da inviare al client.
 * Il token è 32 byte random in hex (spazio di ricerca elevato contro guessing).
 *
 * @param {number} userId PK da tabella `users`
 * @returns {string} token esadecimale
 */
function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.prepare(
    `INSERT INTO user_sessions (token, user_id, expires_at)
     VALUES (?, ?, ?)`
  ).run(token, userId, expiresAt);
  return token;
}

/**
 * Risolve la richiesta HTTP corrente in un utente autenticato oppure `null`.
 *
 * Passi:
 * 1. Legge il cookie `COOKIE_NAME`.
 * 2. JOIN `user_sessions` ↔ `users` per ottenere email e scadenza.
 * 3. Se scaduto, cancella la riga sessione (pulizia) e ritorna null.
 *
 * @param {import("express").Request} req
 * @returns {{ id: number, email: string, token: string } | null}
 */
function getSessionUser(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT users.id, users.email, user_sessions.expires_at
       FROM user_sessions
       JOIN users ON users.id = user_sessions.user_id
       WHERE user_sessions.token = ?`
    )
    .get(token);
  if (!row) return null;
  if (row.expires_at <= Date.now()) {
    db.prepare("DELETE FROM user_sessions WHERE token = ?").run(token);
    return null;
  }
  return { id: row.id, email: row.email, token };
}

/**
 * Middleware Express: se non c'è sessione valida risponde 401 JSON (il client mostra login).
 * In caso positivo aggiunge `req.user` con `{ id, email, token }` per le handler successive.
 */
function requireAuth(req, res, next) {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  req.user = user;
  return next();
}

module.exports = {
  hashPassword,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  createSession,
  getSessionUser,
  requireAuth
};
