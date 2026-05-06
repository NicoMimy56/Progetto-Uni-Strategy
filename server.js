/**
 * @file server.js
 *
 * Punto di ingresso del processo Node.js per Uni-Strategy.
 *
 * Ruolo:
 * - Legge la porta da `process.env.PORT` (utile su PaaS come Heroku, Railway) o usa 3000 in locale.
 * - Ottiene un'istanza Express già configurata tramite `createApp()` (middleware, statici, API, fallback SPA).
 * - Avvia `listen` e stampa l'URL in console per il debug.
 *
 * Perché questo file è minimale: tutta la logica applicativa del server vive sotto `server/`
 * (`createApp`, `database`, `routes`, `auth`, …) così da testare/modificare i moduli senza
 * toccare l'avvio. Riavvia il processo dopo modifiche al codice (`npm run dev`).
 */
const { createApp } = require("./server/createApp");

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Uni-Strategy server running on http://localhost:${PORT}`);
});
