/**
 * @file server/inviteCodes.js
 *
 * Registrazione chiusa al pubblico: servono codici in `invite_codes`, sincronizzati da `.env`.
 *
 * Variabili:
 * - `REGISTRATION_INVITE_CODES` — uno o più codici separati da virgola (consigliato).
 * - `REGISTRATION_INVITE_CODE` — alias per un solo codice.
 * - `REGISTRATION_INVITE_MAX_USES` — usi massimi per codice inserito da env (default 5).
 *
 * Se non c’è alcun codice valido (tabella vuota e env vuoto), POST /api/auth/register risponde 403.
 */
const { db } = require("./database");

function parseEnvInviteCodes() {
  const combined =
    process.env.REGISTRATION_INVITE_CODES || process.env.REGISTRATION_INVITE_CODE || "";
  return String(combined)
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

function getDefaultMaxUses() {
  const raw = Number(process.env.REGISTRATION_INVITE_MAX_USES);
  if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  return 5;
}

/** Inserisce in DB i codici presenti in `.env` (INSERT OR IGNORE — non resetta i contatori). */
function syncInviteCodesFromEnv() {
  const codes = parseEnvInviteCodes();
  if (!codes.length) return;
  const maxUses = getDefaultMaxUses();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO invite_codes (code, max_uses, note)
     VALUES (?, ?, 'env')`
  );
  codes.forEach((code) => stmt.run(code, maxUses));
}

function normalizeInviteCode(raw) {
  return String(raw || "").trim();
}

function countActiveInviteCodes() {
  return db
    .prepare(
      `SELECT COUNT(*) AS n FROM invite_codes
       WHERE max_uses <= 0 OR uses_count < max_uses`
    )
    .get().n;
}

function isRegistrationOpen() {
  syncInviteCodesFromEnv();
  return countActiveInviteCodes() > 0;
}

/**
 * @param {string} rawCode
 * @returns {{ ok: true } | { ok: false, reason: "missing"|"invalid"|"exhausted" }}
 */
function checkInviteCode(rawCode) {
  const code = normalizeInviteCode(rawCode);
  if (!code) return { ok: false, reason: "missing" };
  const row = db.prepare("SELECT code, max_uses, uses_count FROM invite_codes WHERE code = ?").get(code);
  if (!row) return { ok: false, reason: "invalid" };
  if (row.max_uses > 0 && row.uses_count >= row.max_uses) {
    return { ok: false, reason: "exhausted" };
  }
  return { ok: true };
}

function consumeInviteCode(rawCode) {
  const code = normalizeInviteCode(rawCode);
  db.prepare("UPDATE invite_codes SET uses_count = uses_count + 1 WHERE code = ?").run(code);
}

module.exports = {
  syncInviteCodesFromEnv,
  isRegistrationOpen,
  checkInviteCode,
  consumeInviteCode,
  parseEnvInviteCodes
};
