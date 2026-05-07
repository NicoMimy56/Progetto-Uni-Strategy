/**
 * @file scripts/smtp-verify.js
 *
 * Esegue la verifica SMTP (`transporter.verify()` di Nodemailer) con la stessa combinazione
 * host / utente / password usata da `sendFeatureRequestMail` in produzione.
 *
 * Comportamento:
 * - Carica variabili da `.env` nella radice del progetto tramite `dotenv` (stesso percorso di `server.js`).
 * - Stampa `getSmtpDiagnostics()` (conteggi e flag, mai la password in chiaro).
 * - Esito positivo: processo termina con codice 0.
 * - Esito negativo: messaggio d’errore del provider, codice 1.
 *
 * Avvio: `npm run smtp:verify` dalla directory del progetto.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { getSmtpDiagnostics, verifySmtpCredentials } = require("../server/featureRequestMail");

async function main() {
  const diag = getSmtpDiagnostics();
  console.log("Diagnostica .env (nessun segreto in chiaro):");
  console.log(JSON.stringify(diag, null, 2));
  console.log("");
  try {
    await verifySmtpCredentials();
    console.log("Esito: credenziali SMTP accettate dal server.");
  } catch (err) {
    console.error("Esito: verifica SMTP non riuscita —", err.message);
    console.error(
      "Per Gmail 535 BadCredentials: rigenerare «Password per le app» su https://myaccount.google.com/security per l’account in SMTP_USER; riferimento https://support.google.com/mail/?p=BadCredentials"
    );
    process.exit(1);
  }
}

main();
