/**
 * @file server/calendarReminderI18n.js
 *
 * Lingua promemoria calendario: legge `profile.language` da user_settings
 * e stringhe da `locales/<codice>.json` (sezione calendarReminders + status).
 */
const fs = require("fs");
const path = require("path");
const { db } = require("./database");
const { ROOT } = require("./paths");

const SUPPORTED_LANGUAGES = ["it", "en", "fr", "de", "ro", "es"];
const DEFAULT_LANGUAGE = "it";

const DATE_LOCALES = {
  it: "it-IT",
  en: "en-GB",
  fr: "fr-FR",
  de: "de-DE",
  ro: "ro-RO",
  es: "es-ES"
};

const bundleCache = new Map();

function normalizeLanguage(code) {
  const lang = String(code || "").trim().toLowerCase();
  return SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
}

function loadLocaleBundle(language) {
  const lang = normalizeLanguage(language);
  if (bundleCache.has(lang)) return bundleCache.get(lang);
  const filePath = path.join(ROOT, "locales", `${lang}.json`);
  const raw = fs.readFileSync(filePath, "utf8");
  const bundle = JSON.parse(raw);
  bundleCache.set(lang, bundle);
  return bundle;
}

function getNestedValue(obj, keyPath) {
  return keyPath.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), obj);
}

/**
 * @param {string} language codice lingua (it, en, …)
 * @param {string} keyPath es. `calendarReminders.greeting`
 * @param {Record<string, string|number>} [vars]
 */
function t(language, keyPath, vars = {}) {
  const bundle = loadLocaleBundle(language);
  let text = getNestedValue(bundle, keyPath);
  if (typeof text !== "string") {
    const fallback = loadLocaleBundle(DEFAULT_LANGUAGE);
    text = getNestedValue(fallback, keyPath);
  }
  if (typeof text !== "string") return keyPath;
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`{{${key}}}`, "g"), String(value)),
    text
  );
}

function getUserLanguage(userId) {
  const row = db
    .prepare("SELECT value FROM user_settings WHERE user_id = ? AND key = 'profile'")
    .get(userId);
  if (!row) return DEFAULT_LANGUAGE;
  try {
    const profile = JSON.parse(row.value);
    return normalizeLanguage(profile?.language);
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function formatLocalizedDate(isoDate, language) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate || "—";
  const lang = normalizeLanguage(language);
  const locale = DATE_LOCALES[lang] || DATE_LOCALES[DEFAULT_LANGUAGE];
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function examStatusLabel(status, language) {
  if (status === "Completed") return t(language, "status.completed");
  if (status === "In Preparation") return t(language, "status.inPrep");
  return t(language, "status.toTake");
}

module.exports = {
  t,
  getUserLanguage,
  formatLocalizedDate,
  examStatusLabel,
  normalizeLanguage,
  SUPPORTED_LANGUAGES
};
