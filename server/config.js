/**
 * @file server/config.js
 *
 * Parametri di configurazione del backend centralizzati in un solo modulo.
 * Separarli dal codice evita "magic numbers" sparsi in `auth.js` o `routes.js`.
 *
 * Estensioni possibili (non implementate qui): limite lunghezza password, lista CORS,
 * flag `Secure` sul cookie in produzione dietro HTTPS, durata sessione diversa per ambiente.
 *
 * @module server/config
 */

module.exports = {
  /**
   * Durata massima sessione lato server (millisecondi).
   * Dopo `expires_at` il token viene scartato; il browser può ancora avere il cookie fino a Max-Age,
   * ma `getSessionUser` restituirà null e l'utente dovrà rifare login.
   * Valore attuale: 30 giorni.
   */
  SESSION_TTL_MS: 1000 * 60 * 60 * 24 * 30,

  /**
   * Nome attributo nel header `Cookie` inviato dal browser.
   * HttpOnly impedisce lettura da JavaScript della pagina (mitiga molti furti di sessione via XSS).
   * Il valore del cookie è un token opaco, non l'ID utente in chiaro.
   */
  COOKIE_NAME: "unistrategy_sid"
};
