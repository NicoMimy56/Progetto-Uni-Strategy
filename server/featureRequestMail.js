/**
 * @file server/featureRequestMail.js
 *
 * Invio email per le richieste di implementazione (feedback / feature request).
 *
 * Configurazione tramite variabili d'ambiente (es. file `.env` caricato esternamente o export in shell):
 * - FEEDBACK_TO_EMAIL   — indirizzo che riceve le richieste (default: universitystrategy288@gmail.com se non impostato)
 * - SMTP_HOST           — server SMTP (es. smtp.gmail.com, smtp.office365.com)
 * - SMTP_PORT           — default 587
 * - SMTP_SECURE         — "true" per porta 465 (TLS implicito)
 * - SMTP_USER / SMTP_PASS — credenziali se il server le richiede
 * - SMTP_FROM           — mittente "envelope" (default: SMTP_USER)
 *
 * Se manca SMTP_HOST (o credenziali incomplete per Gmail), la funzione non invia:
 * la richiesta resta comunque salvata nel database dalla route API.
 *
 * Gmail errore 535 BadCredentials: https://support.google.com/mail/?p=BadCredentials
 * (non è un errore del codice: Google rifiuta utente/password per quell’account.)
 */
const nodemailer = require("nodemailer");

/** Rimuove BOM / caratteri zero-width che a volte si infilano con copia-incolla. */
function stripProblematicUnicode(s) {
  return String(s)
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");
}

function normalizeSmtpUser(raw) {
  if (!raw) return "";
  return stripProblematicUnicode(String(raw).trim())
    .normalize("NFKC")
    .toLowerCase();
}

/** Destinatario predefinito delle richieste (sovrascrivibile con FEEDBACK_TO_EMAIL). */
const DEFAULT_FEEDBACK_TO_EMAIL = "universitystrategy288@gmail.com";

/** True se la config punta a Gmail (usa trasporto dedicato di Nodemailer). */
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
        "[feature-requests email] Gmail 535 = credenziali rifiutate. Vedi: https://support.google.com/mail/?p=BadCredentials — usa SMTP_USER = email esatta dell’account con cui crei la «Password per le app» (dopo 2FA). Account con Protezione Avanzata: niente password per le app."
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
