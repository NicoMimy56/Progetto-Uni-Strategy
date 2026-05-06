/**
 * @file server/featureRequestMail.js
 *
 * Invio email per le richieste di implementazione (feedback / feature request).
 *
 * Configurazione tramite variabili d'ambiente (es. file `.env` caricato esternamente o export in shell):
 * - FEEDBACK_TO_EMAIL   — indirizzo che riceve le richieste (obbligatorio per l'invio)
 * - SMTP_HOST           — server SMTP (es. smtp.gmail.com, smtp.office365.com)
 * - SMTP_PORT           — default 587
 * - SMTP_SECURE         — "true" per porta 465 (TLS implicito)
 * - SMTP_USER / SMTP_PASS — credenziali se il server le richiede
 * - SMTP_FROM           — mittente "envelope" (default: SMTP_USER)
 *
 * Se manca FEEDBACK_TO_EMAIL o SMTP_HOST, la funzione restituisce false senza lanciare:
 * la richiesta resta comunque salvata nel database dalla route API.
 */
const nodemailer = require("nodemailer");

/**
 * @param {object} opts
 * @param {string} opts.userEmail email utente (Reply-To)
 * @param {string} opts.subjectLine oggetto breve
 * @param {string} opts.body testo completo della richiesta
 * @returns {Promise<boolean>} true se l'email è stata accettata dal server SMTP
 */
async function sendFeatureRequestMail({ userEmail, subjectLine, body }) {
  const to = process.env.FEEDBACK_TO_EMAIL;
  const host = process.env.SMTP_HOST;
  if (!to || !host) {
    return false;
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      user && typeof pass === "string"
        ? {
            user,
            pass
          }
        : undefined
  });

  const fromAddress = process.env.SMTP_FROM || user || "noreply@localhost";
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

  await transporter.sendMail({
    from: `"Uni-Strategy" <${fromAddress}>`,
    to,
    replyTo: userEmail,
    subject: `[Uni-Strategy Richiesta] ${subjectLine}`,
    text
  });

  return true;
}

module.exports = { sendFeatureRequestMail };
