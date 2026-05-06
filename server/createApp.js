/**
 * @file server/createApp.js
 *
 * Fabbrica configurata dell'app Express Uni-Strategy.
 *
 * Ordine dei middleware (rilevante: Express esegue in sequenza):
 * 1. `express.json()` — parse body JSON sulle POST/PUT.
 * 2. Static `/vendor/i18next` — bundle UMD i18next per `<script>` in index.html senza CDN aggiuntive.
 * 3. Static `ROOT` — serve `index.html`, `styles.css`, `js/*.js`, `locales/*.json`, …
 * 4. `registerApiRoutes(app)` — monta tutte le `/api/*` incluso handler 404 JSON per path API sconosciuti.
 * 5. Catch-all finale — qualunque GET non gestita restituisce `index.html` (supporto refresh su route client-side virtuali).
 *
 * Il side-effect `require("./database")` assicura che all'import di questo modulo il file SQLite
 * esista e le tabelle siano create prima che arrivi la prima richiesta HTTP.
 */
const path = require("path");
const express = require("express");
const { ROOT } = require("./paths");
const { registerApiRoutes } = require("./routes");

require("./database");

/**
 * @returns {import("express").Express}
 */
function createApp() {
  const app = express();

  app.use(express.json());
  app.use(
    "/vendor/i18next",
    express.static(path.join(ROOT, "node_modules/i18next/dist/umd"))
  );
  app.use(express.static(ROOT));

  registerApiRoutes(app);

  app.use((_req, res) => {
    res.sendFile(path.join(ROOT, "index.html"));
  });

  return app;
}

module.exports = { createApp };
