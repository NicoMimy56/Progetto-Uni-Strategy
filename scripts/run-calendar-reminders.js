/**
 * Esegue subito i promemoria calendario (senza attendere l'ora programmata).
 * Uso: npm run reminders:run
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { runCalendarRemindersNow } = require("../server/calendarReminders");

runCalendarRemindersNow()
  .then(() => {
    console.log("[calendar-reminders] Ciclo manuale completato.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[calendar-reminders] Errore:", err);
    process.exit(1);
  });
