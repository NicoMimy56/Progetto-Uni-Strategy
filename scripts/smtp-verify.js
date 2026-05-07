/**
 * Verifica che SMTP_USER + SMTP_PASS siano accettati dal server (stesso login dell’invio richieste).
 * Uso: dalla radice progetto → npm run smtp:verify
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { getSmtpDiagnostics, verifySmtpCredentials } = require("../server/featureRequestMail");

async function main() {
  const diag = getSmtpDiagnostics();
  console.log("Diagnostica .env (nessun segreto mostrato):");
  console.log(JSON.stringify(diag, null, 2));
  console.log("");
  try {
    await verifySmtpCredentials();
    console.log("Risultato: OK — Google (o il tuo SMTP) ha accettato utente e password.");
  } catch (err) {
    console.error("Risultato: FALLITO —", err.message);
    console.error(`
Cose da verificare (Gmail / 535 BadCredentials):
1) Apri https://myaccount.google.com/ mentre sei loggato SOLO come ${diag.smtpUser || "SMTP_USER"}.
2) Sicurezza → Verifica in due passaggi = ON.
3) Password per le app → crea una nuova (Mail), copiala e sostituisci tutta la riga SMTP_PASS nel .env (solo 16 lettere, niente spazi se le togli a mano).
4) NON usare la password con cui entri su google.com dal browser.
5) Se l’account ha «Protezione avanzata» Google, le password per le app non esistono: usa un altro SMTP (Brevo, SendGrid, …) o un account Gmail normale senza protezione avanzata.
6) Rigenera la password app se l’hai già usata altrove o Google te ne ha mostrata una solo una volta e non l’hai salvata bene.

Riprova dopo aver salvato .env: npm run smtp:verify
`);
    process.exit(1);
  }
}

main();
