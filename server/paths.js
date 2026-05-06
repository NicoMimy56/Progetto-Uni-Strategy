/**
 * @file server/paths.js
 *
 * Normalizza i percorsi file system rispetto alla struttura delle cartelle del progetto.
 *
 * Quando Node carica un modulo, `__dirname` è la directory che contiene quel file.
 * Poiché questo file si trova in `server/`, la radice del progetto (dove stanno
 * `package.json`, `index.html`, `styles.css`, `unistrategy.db`) è un livello sopra.
 *
 * Uso tipico:
 * - `path.join(ROOT, "index.html")` per il fallback Single Page Application.
 * - `path.join(ROOT, "node_modules", ...)` per servire bundle vendor (es. i18next UMD).
 *
 * Non esportare percorsi relativi ambigui: sempre `path.join` con `ROOT` per OS diversi (Windows/macOS/Linux).
 */
const path = require("path");

/** Directory principale Uni-Strategy (un livello sopra la cartella `server/`) */
const ROOT = path.join(__dirname, "..");

module.exports = { ROOT };
