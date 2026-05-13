/**
 * @file js/constants.js
 *
 * Dati immutabili condivisi da tutta l'applicazione client senza dipendere dal DOM.
 * Separarli da `app.js` permette:
 * - import chiari e tree-shaking potenziale;
 * - test unitari su funzioni pure che importano solo queste costanti;
 * - un solo posto dove aggiornare versione cache i18n o elenco lingue.
 *
 * Il server e il client usano gli stessi valori di stato esame in inglese (`To Take`, …)
 * per stabilità API; la traduzione in italiano/altro avviene nel browser tramite `t("status.*")`.
 */

/**
 * Ordine giorni per il piano studio (colonne da lunedì a domenica).
 * Le stringhe sono in inglese (`Monday`) per stabilità lato DB/API; il testo visualizzato
 * deriva sempre da `t("days.Monday")` ecc.
 */
export const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Chiavi usate nei file `locales/*.json` sotto `daysShort.*` per intestazioni calendario compatte */
export const CALENDAR_WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Suffisso query string nei `fetch('/locales/xx.json?v=…')`: incrementa quando cambi traduzioni
 * così il browser non serve una copia stale dalla cache durante lo sviluppo.
 */
export const APP_I18N_VERSION = "2026-05-07-verify-email";

/** Lingue per cui esiste effettivamente un file `locales/<codice>.json` nel progetto */
export const SUPPORTED_LANGUAGES = ["it", "en", "fr", "de", "ro", "es"];

/**
 * Mappa codice lingua app → tag `toLocaleDateString`: influenza solo formattazione mese nel titolo calendario.
 */
export const CALENDAR_LOCALES = {
  it: "it-IT",
  en: "en-GB",
  fr: "fr-FR",
  de: "de-DE",
  ro: "ro-RO",
  es: "es-ES"
};

/**
 * Preset di tema: ogni chiave corrisponde a un bottone in Impostazioni (`data-settings-theme`).
 * Le proprietà color spiegano come viene costruita l'interfaccia:
 * - `primary` / `primaryDark`: bottoni principali e header;
 * - `background`: colore corpo pagina;
 * - `card`: sfondo card;
 * - `text` / `muted`: testo principale e secondario;
 * - `border`: linee tabelle e bordi input.
 * `applyTheme` in `app.js` copia questi valori nelle CSS variables `--primary`, …
 */
export const THEME_PRESETS = {
  classic: {
    primary: "#8b5cf6",
    primaryDark: "#4c1d95",
    background: "#f6f3ff",
    card: "#ffffff",
    text: "#2b1f45",
    muted: "#6f6291",
    border: "#e3dafc"
  },
  forest: {
    primary: "#1f6d45",
    primaryDark: "#13412c",
    background: "#eef6f1",
    card: "#ffffff",
    text: "#173629",
    muted: "#51695d",
    border: "#c9ddd0"
  },
  sunset: {
    primary: "#b4533a",
    primaryDark: "#6d3a2f",
    background: "#f8f2eb",
    card: "#ffffff",
    text: "#3f2b24",
    muted: "#7c655c",
    border: "#e6d5c9"
  },
  dark: {
    primary: "#8b9cff",
    primaryDark: "#0b0d14",
    background: "#0f1117",
    card: "#181c25",
    text: "#dbe4f2",
    muted: "#97a3b7",
    border: "#2c3444"
  },
  night: {
    primary: "#b08900",
    primaryDark: "#6c4d0a",
    background: "#f5f1e6",
    card: "#fffaf0",
    text: "#2e2a24",
    muted: "#6a6256",
    border: "#e2d8c4"
  },
  sky: {
    primary: "#5b9df5",
    primaryDark: "#2c5fa9",
    background: "#f0f9ff",
    card: "#ffffff",
    text: "#0f2942",
    muted: "#5f7690",
    border: "#d3e6f6"
  }
};

/**
 * Profilo usato finché il server non restituisce `profile` in `/api/bootstrap`
 * o dopo logout locale per resettare la UI.
 */
export const DEFAULT_PROFILE = {
  language: "it",
  themePreset: "classic",
  degreePath: "bachelor",
  totalCfu: 180,
  graduationTarget: 100
};
