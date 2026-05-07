/**
 * @file server/featureRequestMail.js
 *
 * Invio email dopo il salvataggio di una riga `feature_requests` (route POST `/api/feature-requests`).
 *
 * Variabili d’ambiente (caricate da `server.js` con `dotenv` sul file `.env` nella radice progetto):
 * - `FEEDBACK_TO_EMAIL` — destinatario dell’inoltro (default in codice se omesso).
 * - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` — endpoint server SMTP; per `smtp.gmail.com` si usa anche `service: "gmail"` in Nodemailer.
 * - `SMTP_USER`, `SMTP_PASS` — autenticazione LOGIN se il provider la richiede.
 * - `SMTP_FROM` — indirizzo mittente nell’envelope (fallback: `SMTP_USER`).
 *
 * Comportamento `sendFeatureRequestMail`:
 * - Oggetto messaggio: `${subjectLine} [${userEmail}]` (o `[—]` se email assente). Corpo testuale con intestazione fissa + testo utente.
 * - `replyTo`: email dell’account autenticato che ha inviato la richiesta.
 * - Se `SMTP_HOST` manca, oppure con utente Gmail `SMTP_PASS` è vuota dopo normalizzazione: ritorno `{ sent: false, emailStatus }` senza eccezione.
 * - Errori di sessione SMTP: log su stderr, ritorno `{ sent: false, emailStatus: "smtp_error" }`.
 *
 * Normalizzazione credenziali:
 * - Utente: trim, rimozione caratteri invisibili, `NFKC`, minuscolo.
 * - Password: stessa pulizia; host Gmail → rimozione spazi (password app tipicamente 16 lettere).
 *
 * Codici risposta HTTP Gmail 535 BadCredentials: credenziali non accettate; documentazione
 * https://support.google.com/mail/?p=BadCredentials
 */
const nodemailer = require("nodemailer");

/** Rimuove BOM / caratteri zero-width che a volte si infilano con copia-incolla. */
function stripProblematicUnicode(s) {
  return String(s)
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");
}

/**
 * Normalizza l’indirizzo in `SMTP_USER`: rimuove caratteri invisibili, normalizza Unicode, minuscolo.
 * @param {string|undefined} raw Valore grezzo da `process.env.SMTP_USER`.
 * @returns {string}
 */
function normalizeSmtpUser(raw) {
  if (!raw) return "";
  return stripProblematicUnicode(String(raw).trim())
    .normalize("NFKC")
    .toLowerCase();
}

/** Destinatario predefinito delle richieste (sovrascrivibile con FEEDBACK_TO_EMAIL). */
const DEFAULT_FEEDBACK_TO_EMAIL = "universitystrategy288@gmail.com";

/** Indica se `SMTP_HOST` (normalizzato) corrisponde a Gmail: in tal caso Nodemailer usa `service: "gmail"`. */
function isGmailSmtpHost(host) {
  if (!host) return false;
  const h = String(host).trim().toLowerCase();
  return h === "smtp.gmail.com" || h.endsWith(".gmail.com");
}

/**
 * Password per le app Google: spesso incollata come "xxxx xxxx xxxx xxxx" — Gmail vuole 16 caratteri senza spazi.
 * Altri provider: lasciamo la stringa solo trimmata.
 */
function normalizeSmtpPassword(host, rawPass) {
  if (!rawPass) return "";
  let pass = stripProblematicUnicode(String(rawPass).trim()).normalize("NFKC");
  if (
    (pass.startsWith('"') && pass.endsWith('"')) ||
    (pass.startsWith("'") && pass.endsWith("'"))
  ) {
    pass = pass.slice(1, -1);
  }
  if (isGmailSmtpHost(host)) {
    return pass.replace(/\s+/g, "");
  }
  return pass;
}

/**
 * Legge host, utente e password da `process.env` e applica le normalizzazioni Gmail / unicode.
 * @returns {{ host: string|undefined, user: string, passForAuth: string, useGmail: boolean }}
 */
function getSmtpAuthContext() {
  const host = process.env.SMTP_HOST && String(process.env.SMTP_HOST).trim();
  const user = normalizeSmtpUser(process.env.SMTP_USER);
  const passForAuth = normalizeSmtpPassword(host, process.env.SMTP_PASS);
  const useGmail = isGmailSmtpHost(host);
  return { host, user, passForAuth, useGmail };
}

/**
 * Diagnostica sicura (nessuna password in chiaro). Utile per `npm run smtp:verify`.
 * @returns {object}
 */
function getSmtpDiagnostics() {
  const { host, user, passForAuth, useGmail } = getSmtpAuthContext();
  const n = passForAuth.length;
  const nonAsciiInPassword = [...passForAuth].some((ch) => ch.charCodeAt(0) > 127);
  return {
    smtpHost: host || "(mancante)",
    smtpUser: user || "(mancante)",
    usesGmailService: useGmail,
    passwordCharCount: n,
    /** Le password per le app Google sono 16 lettere ASCII (dopo aver tolto spazi). */
    gmailAppPasswordLengthOk: useGmail ? n === 16 : null,
    gmailPasswordHasNonAscii: useGmail ? nonAsciiInPassword : null,
    hint:
      useGmail && nonAsciiInPassword
        ? "La password app Google dovrebbe essere solo lettere a–z A–z: controlla copia/incolla."
        : useGmail && n !== 16
          ? n === 0
            ? "SMTP_PASS non letta o vuota nel .env"
            : `Le password app sono di solito 16 lettere; caratteri letti: ${n}.`
          : null
  };
}

/**
 * Crea il transporter Nodemailer: per host Gmail `service: "gmail"`, altrimenti configurazione host/porta/STARTTLS.
 * @param {{ host?: string, user: string, passForAuth: string, useGmail: boolean }} ctx
 */
function createSmtpTransporterFromContext(ctx) {
  const { host, user, passForAuth, useGmail } = ctx;
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true";

  if (useGmail) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: user && passForAuth ? { user, pass: passForAuth } : undefined
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth: user && passForAuth ? { user, pass: passForAuth } : undefined
  });
}

/** Verifica connessione SMTP (stesso login di sendMail). Lancia se fallisce. */
async function verifySmtpCredentials() {
  const ctx = getSmtpAuthContext();
  if (!ctx.host) {
    throw new Error("SMTP_HOST mancante");
  }
  if (!ctx.user || !ctx.passForAuth) {
    throw new Error("SMTP_USER o SMTP_PASS mancanti / vuoti");
  }
  const transporter = createSmtpTransporterFromContext(ctx);
  if (!transporter) throw new Error("Impossibile creare il transporter SMTP");
  await transporter.verify();
}

function logSmtpError(err) {
  const parts = [
    err?.message,
    err?.code,
    err?.responseCode != null ? `HTTP/SMTP ${err.responseCode}` : null,
    typeof err?.response === "string" ? err.response.trim().slice(0, 500) : null
  ].filter(Boolean);
  console.error("[feature-requests email] Errore SMTP:", parts.join(" | ") || err);
}

/** Codici opzionali per messaggi in UI / debug (nessun segreto). */
const EMAIL_STATUS = {
  missing_smtp_host: "missing_smtp_host",
  missing_smtp_password: "missing_smtp_password",
  smtp_error: "smtp_error"
};

/**
 * @param {object} opts
 * @param {string} opts.userEmail email utente (Reply-To)
 * @param {string} opts.subjectLine oggetto breve
 * @param {string} opts.body testo completo della richiesta
 * @returns {Promise<{ sent: boolean, emailStatus?: string }>}
 */
async function sendFeatureRequestMail({ userEmail, subjectLine, body }) {
  const to = String(process.env.FEEDBACK_TO_EMAIL || "").trim() || DEFAULT_FEEDBACK_TO_EMAIL;
  const ctx = getSmtpAuthContext();
  if (!ctx.host) {
    console.warn("[feature-requests email] Non invio: SMTP_HOST mancante (aggiungi .env e riavvia il server)");
    return { sent: false, emailStatus: EMAIL_STATUS.missing_smtp_host };
  }
  if (ctx.user && !ctx.passForAuth) {
    console.warn(
      "[feature-requests email] Non invio: SMTP_PASS vuota — per Gmail usa una «Password per le app» nel file .env"
    );
    return { sent: false, emailStatus: EMAIL_STATUS.missing_smtp_password };
  }

  const transporter = createSmtpTransporterFromContext(ctx);
  if (!transporter) {
    return { sent: false, emailStatus: EMAIL_STATUS.missing_smtp_host };
  }

  const fromAddress = process.env.SMTP_FROM || ctx.user || "noreply@localhost";
  const text = [
    `Nuova richiesta di implementazione — Uni-Strategy`,
    "",
    `Utente: ${userEmail}`,
    "",
    `Oggetto: ${subjectLine}`,
    "",
    "---",
    "",
    body
  ].join("\n");

  try {
    const subjectTag = userEmail ? `[${userEmail}]` : "[—]";
    await transporter.sendMail({
      from: `"Uni-Strategy" <${fromAddress}>`,
      to,
      replyTo: userEmail || undefined,
      subject: `${subjectLine} ${subjectTag}`,
      text
    });
    console.log(`[feature-requests email] Inviata OK → ${to}`);
    return { sent: true };
  } catch (err) {
    logSmtpError(err);
    if (ctx.useGmail) {
      console.error(
        "[feature-requests email] Gmail: autenticazione SMTP non accettata. Riferimento interno modulo e https://support.google.com/mail/?p=BadCredentials"
      );
    }
    return { sent: false, emailStatus: EMAIL_STATUS.smtp_error };
  }
}

module.exports = {
  sendFeatureRequestMail,
  EMAIL_STATUS,
  getSmtpDiagnostics,
  verifySmtpCredentials,
  normalizeSmtpPassword,
  normalizeSmtpUser,
  isGmailSmtpHost
};
