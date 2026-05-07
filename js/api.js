/**
 * @file js/api.js
 *
 * Unico punto di contatto con il backend HTTP per il codice client.
 *
 * Scelte di design:
 * - `credentials: "same-origin"` — invia automaticamente i cookie di sessione (`HttpOnly`) verso lo
 *   stesso host/porta del documento; necessario perché non usiamo header `Authorization` Bearer.
 * - `Content-Type: application/json` di default — allineato a `express.json()` sul server.
 * - Error handling: su status non OK tenta di leggere `{ error }` dal JSON; se la risposta è HTML
 *   (es. proxy che restituisce pagina di errore) evita di mostrare migliaia di caratteri all'utente.
 * - `204 No Content` — corpo assente; `response.json()` fallirebbe, quindi ritorniamo `null`.
 *
 * Quasi tutte le chiamate sono effettuate da handler in `app.js` dentro `try/catch` con `alert(error.message)`.
 * In un'evoluzione futura si potrebbe sostituire con toast o banner non bloccante.
 */

/**
 * Esegue una richiesta verso le API Uni-Strategy (path relativo, stesso origin del sito).
 *
 * @param {string} path es. "/api/bootstrap" o "/api/exams/12"
 * @param {RequestInit} [options] override `method`, `body` (stringa JSON già serializzata), ecc.
 * @returns {Promise<object|null>} oggetto JSON parsato, oppure null su 204
 * @throws {Error} messaggio utente-friendly in caso di fallimento rete o HTTP error
 */
export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options
  });
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    let message = "Request failed";
    let code;
    try {
      if (contentType.includes("application/json")) {
        const body = await response.json();
        message = body.error || message;
        if (body.code) code = body.code;
      } else {
        const bodyText = await response.text();
        if (bodyText.startsWith("<!doctype") || bodyText.startsWith("<html")) {
          message = "Unexpected HTML response from API endpoint.";
        }
      }
    } catch {
      /* Risposta non leggibile come testo (corpo assente, stream interrotto, ecc.): si mantiene `message` iniziale. */
    }
    const err = new Error(message);
    if (code) err.code = code;
    throw err;
  }
  if (response.status === 204) return null;
  if (!contentType.includes("application/json")) {
    throw new Error("API did not return JSON.");
  }
  return response.json();
}
