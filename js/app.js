/**
 * Uni-Strategy — applicazione browser (entry `type="module"`).
 *
 * Struttura:
 * - `constants.js` — costanti e palette temi
 * - `store.js` — stato applicativo e timer UI
 * - `dom.js` — cache elementi HTML
 * - `api.js` — fetch autenticato
 * - `academic.js` — medie e giorni all'esame
 */
import {
  WEEK_DAYS,
  CALENDAR_WEEK_DAYS,
  APP_I18N_VERSION,
  SUPPORTED_LANGUAGES,
  CALENDAR_LOCALES,
  THEME_PRESETS,
  DEFAULT_PROFILE
} from "./constants.js";
import {
  state,
  studyTimePickerState,
  ui,
  currentCalendarDate,
  getTargetGpa,
  getExams,
  saveExams,
  getStudyPlan,
  saveStudyPlan,
  getSimulatedExams,
  saveSimulatedExams
} from "./store.js";
import {
  examForm,
  simulatorForm,
  examTableBody,
  simTableBody,
  upcomingTableBody,
  gpaEl,
  acquiredCreditsEl,
  totalCreditsEl,
  remainingCreditsEl,
  creditsChartEl,
  creditsPercentageEl,
  simulatorResultEl,
  clearSimBtn,
  clearBtn,
  clearExamFormBtn,
  trendChartEl,
  targetAverageHomeEl,
  targetAverageTipEl,
  graduationAverageTipEl,
  trendHelperMessageEl,
  prevMonthBtn,
  nextMonthBtn,
  calendarTitleEl,
  calendarGridEl,
  studyForm,
  studyBoardEl,
  homeStudyBoardEl,
  clearStudyBtn,
  tabButtons,
  tabContents,
  homeShowPendingBtn,
  homeShowCompletedBtn,
  homeCompletedSortWrap,
  examGradeInput,
  examStatusInput,
  examDateInput,
  studyStartInput,
  studyEndInput,
  settingsTabEl,
  totalCfuInput,
  graduationTargetInput,
  saveSettingsBtn,
  settingsSavedToastEl,
  authViewEl,
  appShellEl,
  authStatusEl,
  authLoginTabBtn,
  authRegisterTabBtn,
  authLoginForm,
  authRegisterForm,
  logoutBtn,
  featureRequestForm,
  featureRequestSubject,
  featureRequestMessage,
  featureRequestStatusEl
} from "./dom.js";
import { apiRequest } from "./api.js";
import { weightedGpa, simulatedGpa, daysRemaining } from "./academic.js";

// =============================================================================
// Guida rapida — js/app.js (orchestrazione UI Uni-Strategy)
//
// DIPENDENZE GLOBALI NON IMPORTATE:
// - `flatpickr` e `flatpickr.l10ns.it` caricati da CDN in index.html (date form esami).
// - `i18next` / `window.i18next` caricato da /vendor/i18next (traduzioni runtime).
//
// FLUSSO AVVIO BROWSER:
// 1. Il parser HTML costruisce il DOM → dom.js può leggere gli ID.
// 2. Questo modulo viene eseguito: `setDeviceMode()` + `syncGradeInputByStatus()` immediati.
// 3. `initializeApp()` prova GET /api/auth/me; se cookie valido → loadAppData() → render().
//    Altrimenti showAuthView() e l’utente vede Login/Registrati.
//
// MODELLO AGGIORNAMENTO UI:
// Nessun Virtual DOM: dopo quasi ogni mutation API aggiorni `state` (store.js) e chiami `render()`.
// Questo ricostruisce innerHTML delle tabelle e ridisegna canvas dove necessario — semplice ma O(n).
//
// | Sezione codice                         | Responsabilità principale |
// |---------------------------------------|---------------------------|
// | settingsDraft*, getProfileForUi       | Bozza Impostazioni vs profilo salvato; tab discard/save |
// | compareCompletedBy* …                 | Ordinamento tabella Home → filtro «Completati» |
// | applyTheme … setDegreeFromTile        | Variabili CSS + tile Impostazioni |
// | initI18n, t, translateStaticUi …      | Lingue / testi DOM / stato esame tradotto |
// | picker esame + studio                 | Flatpickr, analog clock popover HH:MM |
// | weightedGpa (import), render()        | KPI, tabelle Home/Gestione, simulatore |
// | drawTrendChart                        | Canvas: media progressive, target, laurea |
// | renderCalendar / renderStudyBoard     | Calendario mese + colonne giorno studio |
// | Auth / Device                         | Schede login, classe body mobile-desktop |
// | Listener in coda                      | Tutti gli addEventListener (API + render) |
// | loadAppData / initializeApp           | Bootstrap dati dopo sessione OK |
//
// VERSIONE QUERY su index.html (?v=...) — incrementala quando questo file cambia in modo compatibile/incompatibile col cache browser.
// =============================================================================

/** Tema -> file logo header (favicon tab resta fissa su `assets/logo-tab.svg`). */
const HEADER_LOGO_BY_THEME = {
  classic: "./assets/logo-header-classic.svg",
  forest: "./assets/logo-header-forest.svg",
  sunset: "./assets/logo-header-sunset.svg",
  dark: "./assets/logo-header-dark.svg",
  night: "./assets/logo-header-night.svg",
  sky: "./assets/logo-header-sky.svg"
};

/** Aggiorna tutte le occorrenze `.brand-logo` (auth + topbar) in base al preset attivo. */
function syncHeaderLogoByTheme() {
  const preset = getProfileForUi().themePreset;
  const src = HEADER_LOGO_BY_THEME[preset] || HEADER_LOGO_BY_THEME.classic;
  document.querySelectorAll(".brand-logo").forEach((img) => {
    if (img.getAttribute("src") !== src) img.setAttribute("src", src);
  });
}

/**
 * Applica una palette (da THEME_PRESETS) alle variabili CSS globali (`--primary`, `--bg`, …).
 * Aggiunge/rimuove `html.theme-dark` in base al **preset nome** letto da `getProfileForUi()` così la bozza Impostazioni
 * aggiorna subito classe scura anche se `state.profile` non è ancora salvato sul server.
 * @param {typeof import("./constants.js").THEME_PRESETS.classic} theme oggetto colori derivato dal preset selezionato
 */
function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--primary-dark", theme.primaryDark);
  root.style.setProperty("--bg", theme.background);
  root.style.setProperty("--card-bg", theme.card);
  root.style.setProperty("--text", theme.text);
  root.style.setProperty("--muted", theme.muted);
  root.style.setProperty("--border", theme.border || "#d9e1eb");
  document.documentElement.classList.toggle("theme-dark", getProfileForUi().themePreset === "dark");
  syncHeaderLogoByTheme();
}

/** @returns {object} preset colore da profilo UI (bozza Impostazioni o `state.profile` committato) */
function getCurrentTheme() {
  return THEME_PRESETS[getProfileForUi().themePreset] || THEME_PRESETS.classic;
}

/**
 * CFU di default quando l'utente sceglie triennale/magistrale/dottorato (non custom).
 * @param {"bachelor"|"master"|"postgraduate"|string} path
 */
function getDefaultCfuByPath(path) {
  if (path === "bachelor") return 180;
  if (path === "master") return 120;
  if (path === "postgraduate") return 60;
  return getProfileForUi().totalCfu || 180;
}

/**
 * Allinea input `#total-cfu-input` / `#graduation-target-input` e classe `.active` sulle tile dentro `#settings-tab`
 * usando `getProfileForUi()` (bozza o profilo dopo discard). Early return se `#settings-tab` assente nel DOM di test.
 */
function syncProfileInputs() {
  if (!settingsTabEl) return;
  const p = getProfileForUi();
  totalCfuInput.value = String(p.totalCfu);
  graduationTargetInput.value = String(p.graduationTarget);
  totalCfuInput.disabled = p.degreePath !== "custom";

  settingsTabEl.querySelectorAll("[data-settings-degree]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.settingsDegree === p.degreePath);
  });
  settingsTabEl.querySelectorAll("[data-settings-theme]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.settingsTheme === p.themePreset);
  });
  settingsTabEl.querySelectorAll("[data-settings-lang]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.settingsLang === p.language);
  });
}

/**
 * Flag settato true solo dopo `i18next.init` completato. Finché è false `t()` ritorna la chiave
 * grezza così si vede subito in dev se init non è stata chiamata.
 */
let i18nReady = false;

/**
 * Bozza profilo mentre il tab Impostazioni è aperto. `null` ⇒ niente bozza (tema/lingua/form seguono `state.profile`).
 * Le modifiche restano qui finché non premi «Salva»; uscire dal tab senza salvare chiama `discardSettingsDraft`.
 */
let settingsDraftProfile = null;

/**
 * Oggetto profilo da cui leggere tema, lingua, tile CFU mentre l’utente modifica Impostazioni.
 * Con bozza attiva (`settingsDraftProfile`) le modifiche **non** aggiornano `state.profile` finché non si salva;
 * così KPI e altre tab continuano a usare i valori confermati. Senza bozza torna sempre `state.profile`.
 * @returns {object} snapshot profilo (stessa forma di `state.profile` / `DEFAULT_PROFILE`)
 */
function getProfileForUi() {
  return settingsDraftProfile !== null ? settingsDraftProfile : state.profile;
}

/**
 * Abbandono tab Impostazioni senza salvataggio: scarta la bozza e riporta interfaccia tema/lingua/form
 * allo stato **committato** (`state.profile`). Usato dalla navigazione tab prima di montare la nuova sezione.
 */
async function discardSettingsDraft() {
  if (settingsDraftProfile === null) return;
  settingsDraftProfile = null;
  applyTheme(getCurrentTheme());
  document.documentElement.lang = state.profile.language;
  if (i18nReady && window.i18next) {
    await i18next.changeLanguage(state.profile.language);
    translateStaticUi();
    setupDateTimePickers();
    syncProfileInputs();
    render();
  } else {
    syncProfileInputs();
    render();
  }
}

/**
 * Chiamato **solo** quando si entra nel tab Impostazioni da un altro tab (`!wasOnSettings`).
 * Copia superficiale `state.profile` → `settingsDraftProfile`: da qui le tile e gli input modificano la bozza.
 * Se si ri-clicca «Impostazioni» restandoci sopra non si reinizializza (evita perdere modifiche non salvate).
 */
function startSettingsDraft() {
  settingsDraftProfile = { ...state.profile };
  syncProfileInputs();
}

/** Dizionario annidato lingua → JSON caricato manualmente — usato da `t()` come fallback deterministico */
let translationResources = {};

/**
 * Per ogni file in `SUPPORTED_LANGUAGES` scarica `/locales/{lng}.json` in parallelo.
 * Popola `translationResources`, poi chiama `i18next.init` con `resources` strutturate come i18next
 * si aspetta (`{ it: { translation: jsonIta } }`).
 *
 * `keySeparator: "."` permette chiavi tipo `tabs.home`; `ignoreJSONStructure: false` fa sì che
 * le chiavi annidate nei JSON delle lingue rimappino alla notazione punto.
 *
 * @param {string} language codice lingua iniziale es. dall’oggetto `profile` salvato sul server.
 */
async function initI18n(language) {
  const resources = {};
  await Promise.all(
    SUPPORTED_LANGUAGES.map(async (lng) => {
      const res = await fetch(`/locales/${lng}.json?v=${APP_I18N_VERSION}`);
      if (!res.ok) return;
      resources[lng] = await res.json();
    })
  );
  translationResources = resources;
  await i18next.init({
    lng: language,
    fallbackLng: "it",
    resources: {
      ...Object.fromEntries(
        Object.entries(resources).map(([lng, json]) => [lng, { translation: json }])
      )
    },
    keySeparator: ".",
    ignoreJSONStructure: false,
    interpolation: {
      escapeValue: true
    }
  });
  i18nReady = true;
}

/**
 * Traduzione corrente; usa i18next con fallback manuale su translationResources.
 * @param {string} key es. "tabs.home"
 * @param {object} [options] interpolazione i18next
 */
function t(key, options) {
  if (!window.i18next || !i18nReady) return key;
  const translated = i18next.t(key, options);
  if (translated !== key) return translated;

  // Safety fallback for nested keys in case i18next config/cache mismatches.
  const lang = getProfileForUi().language || "it";
  const dict = translationResources[lang] || {};
  const fallback = key.split(".").reduce((acc, part) => (acc && typeof acc === "object" ? acc[part] : undefined), dict);
  return typeof fallback === "string" ? fallback : translated;
}

/** Nome giorno nella lingua UI (chiave `days.<WEEK_DAYS>`). */
function getLocalizedDay(day) {
  return t(`days.${day}`);
}

/** Testo placeholder colonna vuota piano studio. */
function getNoSessionLabel() {
  return t("study.noSession");
}

/**
 * Lingua preferita del browser normalizzata ai codici app (`it`, `en`, ...).
 * Esempio: `en-US` -> `en`. Fallback: lingua di DEFAULT_PROFILE.
 */
function getBrowserPreferredLanguage() {
  const browserCandidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language
  ]
    .filter((lng) => typeof lng === "string" && lng.trim() !== "")
    .map((lng) => lng.toLowerCase());

  for (const lang of browserCandidates) {
    const base = lang.split("-")[0];
    if (SUPPORTED_LANGUAGES.includes(base)) {
      return base;
    }
  }

  return DEFAULT_PROFILE.language;
}

/** Aggiorna testi statici marcati data-i18n e le option dei select dipendenti dalla lingua. */
async function translateStaticUi() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  const statusMap = {
    "To Take": "status.toTake",
    Completed: "status.completed"
  };
  examStatusInput.querySelectorAll("option").forEach((option) => {
    const mapKey = statusMap[option.value];
    option.textContent = mapKey ? t(mapKey) : option.value;
  });
  studyForm.querySelectorAll("#study-day option").forEach((option) => {
    option.textContent = t(`days.${option.value}`);
  });
}

/** Converte stato macchina (inglese) nella stringa localizzata mostrata in tabella. */
function formatExamStatus(raw) {
  const map = {
    "To Take": "status.toTake",
    Completed: "status.completed"
  };
  const key = map[raw];
  return key ? t(key) : raw;
}

/** Allinea valori legacy o tradotti agli enum API correnti: To Take | Completed. */
function normalizeExamStatus(rawStatus) {
  const normalizedMap = {
    "status.toTake": "To Take",
    "status.inPrep": "To Take",
    "status.completed": "Completed",
    "Da sostenere": "To Take",
    "In preparazione": "To Take",
    Completato: "Completed",
    "To take": "To Take",
    "In preparation": "To Take",
    Completed: "Completed"
  };
  return normalizedMap[rawStatus] || rawStatus;
}

/** Accetta giorno salvato come "Monday" o prefisso days.Monday → chiave WEEK_DAYS */
function normalizeStudyDay(rawDay) {
  if (typeof rawDay !== "string") return rawDay;
  const cleaned = rawDay.startsWith("days.") ? rawDay.slice(5) : rawDay;
  return WEEK_DAYS.includes(cleaned) ? cleaned : rawDay;
}

/** Click su tile triennale/magistrale/... aggiorna CFU e stato custom (bozza Impostazioni). */
function setDegreeFromTile(path) {
  const p = getProfileForUi();
  p.degreePath = path;
  if (path !== "custom") {
    p.totalCfu = getDefaultCfuByPath(path);
  }
  totalCfuInput.value = String(p.totalCfu);
  totalCfuInput.disabled = path !== "custom";
  syncProfileInputs();
}

// --- Flatpickr (data esame) + popover ora studio ---
/** Rimuove istanza flatpickr precedente prima di ricrearla (cambio lingua). */
function destroyDatePickers() {
  [examDateInput].forEach((el) => {
    if (el._flatpickr) el._flatpickr.destroy();
  });
}

/** Ora "HH:MM" sempre a due cifre per input studio. */
function formatTimeValue(hour, minute) {
  const safeHour = String(Math.max(0, Math.min(23, Number(hour) || 0))).padStart(2, "0");
  const safeMinute = String(Math.max(0, Math.min(59, Number(minute) || 0))).padStart(2, "0");
  return `${safeHour}:${safeMinute}`;
}

/** Estrae ora/minuti da stringa utente oppure default 09:00. */
function parseTimeValue(raw) {
  if (typeof raw !== "string") return { hour: 9, minute: 0 };
  const match = raw.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return { hour: 9, minute: 0 };
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/** Ruota lancette SVG/CSS del popover e aggiorna label testuale orario. */
function updateStudyClockPreview(hour, minute) {
  const { hourHand, minuteHand, valueLabel } = studyTimePickerState;
  if (!hourHand || !minuteHand || !valueLabel) return;
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;
  hourHand.style.transform = `translateX(-50%) rotate(${hourAngle}deg)`;
  minuteHand.style.transform = `translateX(-50%) rotate(${minuteAngle}deg)`;
  valueLabel.textContent = formatTimeValue(hour, minute);
}

/** Scrive nel campo attivo il valore corrente da select ora/minuti. */
function applyStudyPickerSelection() {
  const { activeInput, hourSelect, minuteSelect } = studyTimePickerState;
  if (!activeInput || !hourSelect || !minuteSelect) return;
  activeInput.value = formatTimeValue(hourSelect.value, minuteSelect.value);
  activeInput.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Chiude popover quando click fuori o dopo Applica. */
function hideStudyTimePicker() {
  const { panel } = studyTimePickerState;
  if (!panel) return;
  panel.hidden = true;
  studyTimePickerState.activeInput = null;
}

/** Posiziona il popover sotto il campo che ha focus. */
function placeStudyTimePicker(targetInput) {
  const { panel } = studyTimePickerState;
  if (!panel) return;
  const rect = targetInput.getBoundingClientRect();
  panel.style.top = `${window.scrollY + rect.bottom + 8}px`;
  panel.style.left = `${Math.max(12, window.scrollX + rect.left)}px`;
}

/** Apre popover e sincronizza select con valore stringa del campo. */
function showStudyTimePicker(targetInput) {
  if (!studyTimePickerState.panel) return;
  const parsed = parseTimeValue(targetInput.value);
  studyTimePickerState.activeInput = targetInput;
  studyTimePickerState.hourSelect.value = String(parsed.hour).padStart(2, "0");
  studyTimePickerState.minuteSelect.value = String(Math.round(parsed.minute / 5) * 5 % 60).padStart(2, "0");
  updateStudyClockPreview(parsed.hour, Number(studyTimePickerState.minuteSelect.value));
  placeStudyTimePicker(targetInput);
  studyTimePickerState.panel.hidden = false;
}

/** Crea DOM popover analogico ore/minuti collegato a campi studio inizio/fine. */
/**
 * Crea una sola volta il popover DOM con orologio + due `<select>` (ora 24h e minuti a step 5).
 * Collegamento campi `#study-start` / `#study-end`: focus/click apre; click fuori chiude (listener document).
 * Anche cambio viewport (resize/scroll) riposiziona il popover vicino all’input attivo.
 */
function setupStudyTimePicker() {
  if (studyTimePickerState.panel) return;
  const panel = document.createElement("div");
  panel.className = "study-time-popover";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="study-time-clock-wrap">
      <div class="study-time-value">09:00</div>
      <div class="study-time-clock">
        <span class="study-time-tick t12">12</span>
        <span class="study-time-tick t3">3</span>
        <span class="study-time-tick t6">6</span>
        <span class="study-time-tick t9">9</span>
        <span class="study-time-hand hour"></span>
        <span class="study-time-hand minute"></span>
        <span class="study-time-center"></span>
      </div>
    </div>
    <div class="study-time-controls">
      <label>Ora
        <select class="study-time-hour"></select>
      </label>
      <label>Min
        <select class="study-time-minute"></select>
      </label>
      <button type="button" class="study-time-apply">Applica</button>
    </div>
  `;
  document.body.appendChild(panel);

  const hourSelect = panel.querySelector(".study-time-hour");
  const minuteSelect = panel.querySelector(".study-time-minute");
  for (let h = 0; h < 24; h += 1) {
    const opt = document.createElement("option");
    opt.value = String(h).padStart(2, "0");
    opt.textContent = String(h).padStart(2, "0");
    hourSelect.appendChild(opt);
  }
  for (let m = 0; m < 60; m += 5) {
    const opt = document.createElement("option");
    opt.value = String(m).padStart(2, "0");
    opt.textContent = String(m).padStart(2, "0");
    minuteSelect.appendChild(opt);
  }

  const handlePreviewUpdate = () => {
    const hour = Number(hourSelect.value);
    const minute = Number(minuteSelect.value);
    updateStudyClockPreview(hour, minute);
    applyStudyPickerSelection();
  };

  hourSelect.addEventListener("change", handlePreviewUpdate);
  minuteSelect.addEventListener("change", handlePreviewUpdate);
  panel.querySelector(".study-time-apply").addEventListener("click", () => {
    applyStudyPickerSelection();
    hideStudyTimePicker();
  });
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (
      target.closest(".study-time-popover") ||
      target === studyStartInput ||
      target === studyEndInput
    ) {
      return;
    }
    hideStudyTimePicker();
  });
  window.addEventListener("resize", () => {
    if (studyTimePickerState.activeInput && !panel.hidden) {
      placeStudyTimePicker(studyTimePickerState.activeInput);
    }
  });
  window.addEventListener("scroll", () => {
    if (studyTimePickerState.activeInput && !panel.hidden) {
      placeStudyTimePicker(studyTimePickerState.activeInput);
    }
  });

  [studyStartInput, studyEndInput].forEach((input) => {
    input.addEventListener("focus", () => showStudyTimePicker(input));
    input.addEventListener("click", () => showStudyTimePicker(input));
    input.addEventListener("input", () => {
      const parsed = parseTimeValue(input.value);
      if (studyTimePickerState.activeInput === input && !panel.hidden) {
        hourSelect.value = String(parsed.hour).padStart(2, "0");
        minuteSelect.value = String(Math.round(parsed.minute / 5) * 5 % 60).padStart(2, "0");
        updateStudyClockPreview(parsed.hour, Number(minuteSelect.value));
      }
    });
  });

  studyTimePickerState.panel = panel;
  studyTimePickerState.hourSelect = hourSelect;
  studyTimePickerState.minuteSelect = minuteSelect;
  studyTimePickerState.hourHand = panel.querySelector(".study-time-hand.hour");
  studyTimePickerState.minuteHand = panel.querySelector(".study-time-hand.minute");
  studyTimePickerState.valueLabel = panel.querySelector(".study-time-value");
}

/** Nel form nuovo esame: voto obbligatorio solo se stato = Completato. */
function syncGradeInputByStatus() {
  const isCompleted = examStatusInput.value === "Completed";
  examGradeInput.disabled = !isCompleted;
  examGradeInput.required = isCompleted;
  if (!isCompleted) {
    examGradeInput.value = "";
  }
}

/** Data odierna in UTC slice usata per confronti ISO `YYYY-MM-DD`. */
function getTodayIsoDate() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString().slice(0, 10);
}

/** true se examDate è strettamente nel passato (regola stato Completato). */
function isDateBeforeToday(dateStr) {
  return typeof dateStr === "string" && dateStr !== "" && dateStr < getTodayIsoDate();
}

/** Nel form nuovo esame: data passata forza stato Completato + voto. */
function applyExamDateStatusRule() {
  if (isDateBeforeToday(examDateInput.value)) {
    examStatusInput.value = "Completed";
  }
  syncGradeInputByStatus();
}

/** Abilita/disabilita campo voto inline quando cambia stato riga modificata. */
function syncExamEditGradeInput(row) {
  const statusSelect = row.querySelector(".exam-edit-status");
  const gradeInput = row.querySelector(".exam-edit-grade");
  if (!statusSelect || !gradeInput) return;
  const isCompleted = statusSelect.value === "Completed";
  gradeInput.disabled = !isCompleted;
  gradeInput.required = isCompleted;
  if (!isCompleted) {
    gradeInput.value = "";
  }
}

/** Listener sulla riga in modifica nella tab Gestione Esami (stato/data → voto). */
function bindExamEditRowInputs() {
  examTableBody.querySelectorAll("tr[data-editing='true']").forEach((row) => {
    const statusSelect = row.querySelector(".exam-edit-status");
    const dateInput = row.querySelector(".exam-edit-date");
    if (statusSelect) {
      statusSelect.addEventListener("change", () => {
        syncExamEditGradeInput(row);
      });
    }
    if (dateInput) {
      dateInput.addEventListener("change", () => {
        if (isDateBeforeToday(dateInput.value) && statusSelect) {
          statusSelect.value = "Completed";
        }
        syncExamEditGradeInput(row);
      });
    }
  });
}

/** Reinizializza date picker esame (+ crea picker orario studio se assente). */
function setupDateTimePickers() {
  if (typeof flatpickr === "function") {
    destroyDatePickers();

    const useIt = getProfileForUi().language === "it";
    flatpickr(examDateInput, {
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: useIt ? "d/m/Y" : "m/d/Y",
      allowInput: false,
      ...(useIt && flatpickr.l10ns?.it ? { locale: flatpickr.l10ns.it } : {})
    });
  }
  setupStudyTimePicker();
}

/** Messaggio fugace dopo salvataggio profilo Impostazioni. */
function showSettingsSavedToast() {
  if (!settingsSavedToastEl) return;
  settingsSavedToastEl.textContent = t("settings.saved");
  settingsSavedToastEl.classList.add("show");
  if (ui.settingsToastTimer) {
    clearTimeout(ui.settingsToastTimer);
  }
  ui.settingsToastTimer = setTimeout(() => {
    settingsSavedToastEl.classList.remove("show");
  }, 2200);
}


/** Ripulisce il form Aggiungi esame e riallinea stato voto/data. */
function resetAddExamForm() {
  examForm.reset();
  syncGradeInputByStatus();
  applyExamDateStatusRule();
}

/** Schede Login / Registrati sulla schermata auth. */
function setAuthMode(mode) {
  ui.authMode = mode;
  authLoginTabBtn.classList.toggle("active", mode === "login");
  authRegisterTabBtn.classList.toggle("active", mode === "register");
  authLoginForm.classList.toggle("hidden", mode !== "login");
  authRegisterForm.classList.toggle("hidden", mode !== "register");
  if (authStatusEl) authStatusEl.textContent = "";
}

/** Mostra card login e nasconde shell principale (utente sloggato o errore). */
function showAuthView(message = "") {
  authViewEl.classList.remove("hidden");
  appShellEl.classList.add("hidden");
  if (authStatusEl) authStatusEl.textContent = message;
}

/** Nasconde auth e mostra app dopo sessione valida. */
function showAppView() {
  authViewEl.classList.add("hidden");
  appShellEl.classList.remove("hidden");
}

/** Imposta classi CSS body per layout mobile/desktop (media query + pointer coarse). */
function setDeviceMode() {
  const isMobileWidth = window.matchMedia("(max-width: 900px)").matches;
  const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const isMobile = isMobileWidth || hasCoarsePointer;
  document.body.classList.toggle("device-mobile", isMobile);
  document.body.classList.toggle("device-desktop", !isMobile);
}

// ---------------------------------------------------------------------------
// Home — ordinamenti tabella Esami (#upcoming-table-body)
//
// - **Da sostenere** (non Completed): sempre `comparePendingExamsClosestFirst` (nessuna scelta utente): ordine è
//   priorità alla data nell’assieme “quanto manca allo scadere” usando `daysRemaining` (coerenza con la colonna Giorni):
//   giorni più piccoli (anche negativi = passati) prima, poi elenco alfabetico se pari giorno.
// - **Completati**: comparators più sotto solo dopo `.filter(Completed)`, `state.homeCompletedSort` sugli chip.
//
// Regole comuni liste completate per data/voto: senza data/voto verso fondo del criterio; tie-break sempre materia (`compareExamSubjectStable`).
// ---------------------------------------------------------------------------

/** Tie-break alfabetico su `subject`: evita ordine oscillante quando data o voto coincidono. */
function compareExamSubjectStable(a, b) {
  return String(a.subject || "").localeCompare(String(b.subject || ""), undefined, { sensitivity: "base" });
}

/** Voto `/30` come numero o `null` se mancante / non numerico (`grade` può essere assente nei completati). */
function getExamGradeNullable(exam) {
  const g = exam.grade;
  return g != null && Number.isFinite(Number(g)) ? Number(g) : null;
}

/** Chiave ordinamento “vicinanza”: esami senza data efficaci vanno sempre **dopo** quelli calendarizzati. */
function pendingExamProximitySortKey(exam) {
  if (!exam.examDate) return Number.POSITIVE_INFINITY;
  const dr = daysRemaining(exam.examDate);
  if (dr === "-") return Number.POSITIVE_INFINITY;
  return Number(dr);
}

/**
 * Da sostenere: ordine fisso (**non** modificabile dall’utente): dal più urgente cronologicamente.
 * Usa anche `daysRemaining` come la colonna «Giorni» su Home (↑ scaduti/oggi/imminenti sopra dei lontani, senza data in coda).
 */
function comparePendingExamsClosestFirst(a, b) {
  const ka = pendingExamProximitySortKey(a);
  const kb = pendingExamProximitySortKey(b);
  if (ka !== kb) return ka - kb;
  return compareExamSubjectStable(a, b);
}

/** Ordine cronologico data esame ascendente (`YYYY-MM-DD` parseabile da `Date`). */
function compareCompletedByDateAsc(a, b) {
  if (!a.examDate && !b.examDate) return compareExamSubjectStable(a, b);
  if (!a.examDate) return 1;
  if (!b.examDate) return -1;
  const delta = new Date(a.examDate) - new Date(b.examDate);
  return delta !== 0 ? delta : compareExamSubjectStable(a, b);
}

/** Cronologia invertita: esami più recenti in alto. */
function compareCompletedByDateDesc(a, b) {
  return compareCompletedByDateAsc(b, a);
}

/** Migliori voti prima; pari voto ⇒ materia. */
function compareCompletedByGradeDesc(a, b) {
  const ga = getExamGradeNullable(a);
  const gb = getExamGradeNullable(b);
  if (ga == null && gb == null) return compareCompletedByDateAsc(a, b);
  if (ga == null) return 1;
  if (gb == null) return -1;
  const delta = gb - ga;
  return delta !== 0 ? delta : compareExamSubjectStable(a, b);
}

/** Voti più bassi prima (stesse regole «senza voto in coda» di gradeDesc). */
function compareCompletedByGradeAsc(a, b) {
  const ga = getExamGradeNullable(a);
  const gb = getExamGradeNullable(b);
  if (ga == null && gb == null) return compareCompletedByDateAsc(a, b);
  if (ga == null) return 1;
  if (gb == null) return -1;
  const delta = ga - gb;
  return delta !== 0 ? delta : compareExamSubjectStable(a, b);
}

/** Testo colonna giorni sulla Home / Gestione ("Fatto", scaduti, countdown). */
function formatDaysRemaining(exam) {
  if (exam.status === "Completed") return t("done");
  const days = daysRemaining(exam.examDate);
  if (days === "-") return "-";
  if (days < 0) return t("expired");
  if (days === 0) return t("today");
  return String(days);
}

/** Evita calcoli canvas costosi quando la tab Home è nascosta. */
function isTrendChartVisible() {
  if (!trendChartEl) return false;
  const homeTab = document.getElementById("home-tab");
  if (!homeTab || !homeTab.classList.contains("active")) return false;
  return trendChartEl.clientWidth > 0;
}

/** Accoda ridisegno grafico andamento sulla prossima anim frame. */
function scheduleTrendChartDraw() {
  if (ui.trendRafId) {
    cancelAnimationFrame(ui.trendRafId);
  }
  ui.trendRafId = requestAnimationFrame(() => {
    ui.trendRafId = null;
    drawTrendChart(getExams(), getTargetGpa(), state.profile.graduationTarget);
  });
}

/**
 * Disegna su canvas media progressiva, punti singoli esame, fascia target e soglia laurea (/110 scalata a /30).
 * @param {Array} exams elenco dalla state
 * @param {number} targetGpa obiettivo utente scala /30 (0..31)
 * @param {number} graduationTarget es. voto laurea target su 110 (da profilo)
 */
function drawTrendChart(exams, targetGpa, graduationTarget) {
  if (!isTrendChartVisible()) return;
  const ctx = trendChartEl.getContext("2d");
  /** Larghezza logica responsive (minimo 280px così il grafico non collassa su mobile stretto). */
  const cssWidth = Math.max(280, trendChartEl.clientWidth || 300);
  const cssHeight = 260;
  /** Retina/high-DPI: buffer interno canvas moltiplicato prima di scala — linee più nitide. */
  const dpr = window.devicePixelRatio || 1;
  trendChartEl.width = Math.floor(cssWidth * dpr);
  trendChartEl.height = Math.floor(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const width = cssWidth;
  const height = cssHeight;
  const chart = {
    left: 42,
    right: width - 18,
    top: 44,
    bottom: height - 34
  };
  const chartWidth = chart.right - chart.left;
  const chartHeight = chart.bottom - chart.top;
  const minY = 18;
  const maxY = 31;
  const yTicks = [18, 20, 22, 24, 26, 28, 30];

  const xAt = (index, count) => chart.left + (index * chartWidth) / Math.max(1, count - 1);
  const yAt = (value) => {
    const clamped = Math.max(minY, Math.min(maxY, value));
    return chart.bottom - ((clamped - minY) / (maxY - minY)) * chartHeight;
  };

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  /* Griglia orizzontale fissa e etichette asse Y (Scala voti italiana sintetizzata tra 18 e 30 nel tick helper). */
  ctx.strokeStyle = "#e2e8f0";
  ctx.fillStyle = "#64748b";
  ctx.font = "12px sans-serif";
  yTicks.forEach((tick) => {
    const y = yAt(tick);
    ctx.beginPath();
    ctx.moveTo(chart.left, y);
    ctx.lineTo(chart.right, y);
    ctx.stroke();
    ctx.fillText(String(tick), 10, y + 4);
  });

  const completed = exams.filter(
    (e) => e.status === "Completed" && Number.isFinite(e.grade)
  );

  if (completed.length === 0) {
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(chart.left, chart.top, chartWidth, chartHeight);
    ctx.strokeStyle = "#e2e8f0";
    ctx.strokeRect(chart.left, chart.top, chartWidth, chartHeight);
    return;
  }

  /** Una coordinata X per ogni esame nell’ordine corrente dell’array `completed` (non ordinato cronologicamente dai voti!). */
  const examPoints = completed.map((e) => e.grade);
  /**
   * `runningAvg[i]` = media ponderata usando solo i primi i+1 esami completati nell’array.
   * Interpretazione: come evolve la media man mano che “consideri” le prove concluse nell’ordine listato dal DB/UI.
   */
  const runningAvg = [];
  let weighted = 0;
  let credits = 0;
  completed.forEach((e) => {
    weighted += e.grade * e.credits;
    credits += e.credits;
    runningAvg.push(weighted / credits);
  });

  /* Linea tratteggiata rossa: obiettivo media /30 scelto dall’utente in Home (`targetGpa`). */
  if (targetGpa >= 18 && targetGpa <= 31) {
    const targetY = yAt(targetGpa);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(chart.left, targetY);
    ctx.lineTo(chart.right, targetY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ef4444";
    ctx.font = "11px sans-serif";
    ctx.fillText(`Target ${targetGpa.toFixed(2)}`, chart.right - 86, targetY - 6);
  }

  /**
   * Linea tratteggiata arancione: traduce il target di laurea (profilo utente su scala /110 nominale triennale)
   * nella scala /30 delle medie degli esami. È una **conversione proporzionale semplificata**, non la formula ministeriale dei voti ai fini leggali.
   */
  const graduationTargetAvg = (graduationTarget * 30) / 110;
  if (graduationTargetAvg >= 18 && graduationTargetAvg <= 31) {
    const gradY = yAt(graduationTargetAvg);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(chart.left, gradY);
    ctx.lineTo(chart.right, gradY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#b45309";
    ctx.font = "11px sans-serif";
    ctx.fillText(`Media for ${graduationTarget.toFixed(1)}/110`, chart.right - 136, gradY - 6);
  }

  /** Canvas path ha bisogno di almeno 2 punti: se c’è un solo esame duplichiamo la coordinata così si disegna un segmento stabile sotto-area. */
  const lineValues = runningAvg.length === 1 ? [runningAvg[0], runningAvg[0]] : runningAvg;

  /* Area riempimento sotto la curva smoothed della media progressive (due quadratic curve segments per tratto — estetico). */
  ctx.beginPath();
  lineValues.forEach((value, index) => {
    const x = xAt(index, lineValues.length);
    const y = yAt(value);
    if (index === 0) ctx.moveTo(x, y);
    else {
      const prevX = xAt(index - 1, lineValues.length);
      const prevY = yAt(lineValues[index - 1]);
      const midX = (prevX + x) / 2;
      ctx.quadraticCurveTo(prevX, prevY, midX, (prevY + y) / 2);
      ctx.quadraticCurveTo(midX, (prevY + y) / 2, x, y);
    }
  });
  ctx.lineTo(chart.right, chart.bottom);
  ctx.lineTo(chart.left, chart.bottom);
  ctx.closePath();
  const gradient = ctx.createLinearGradient(0, chart.top, 0, chart.bottom);
  gradient.addColorStop(0, "rgba(37, 99, 235, 0.18)");
  gradient.addColorStop(1, "rgba(37, 99, 235, 0.02)");
  ctx.fillStyle = gradient;
  ctx.fill();

  /* Contorno della stessa serie ma con Bézier quadratiche per smoothing diverso dall’area (leggermente più “fluido”). */
  ctx.beginPath();
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2.4;
  lineValues.forEach((value, index) => {
    const x = xAt(index, lineValues.length);
    const y = yAt(value);
    if (index === 0) ctx.moveTo(x, y);
    else {
      const prevX = xAt(index - 1, lineValues.length);
      const prevY = yAt(lineValues[index - 1]);
      const controlX = (prevX + x) / 2;
      ctx.bezierCurveTo(controlX, prevY, controlX, y, x, y);
    }
  });
  ctx.stroke();

  /* Punti scuri: singolo esame (solo voto, non pesato) sulla colonna ordinale dello stesso indice dell’asse X. */
  ctx.fillStyle = "#1e3a8a";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  examPoints.forEach((value, index) => {
    const x = xAt(index, examPoints.length);
    const y = yAt(value);
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  /* Asse a L e baseline inferiore (asse X = posizioni ordinali esami, non calendario date). */
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chart.left, chart.top);
  ctx.lineTo(chart.left, chart.bottom);
  ctx.lineTo(chart.right, chart.bottom);
  ctx.stroke();

  /* Etichette 1 … N sulla X: numero progressivo nell’insieme Completed, NON ID database. */
  ctx.fillStyle = "#64748b";
  ctx.font = "11px sans-serif";
  examPoints.forEach((_, index) => {
    const x = xAt(index, examPoints.length);
    const label = String(index + 1);
    ctx.fillText(label, x - 3, chart.bottom + 14);
  });

  /* Legenda grafica fisso in alto a sinistra (testi abbreviati; stringhe non ancora tutte dietro i18n). */
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(chart.left, 16, 12, 3);
  ctx.fillStyle = "#334155";
  ctx.fillText("Media andamento", chart.left + 16, 20);

  ctx.fillStyle = "#1e3a8a";
  ctx.beginPath();
  ctx.arc(chart.left + 132, 17.5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#334155";
  ctx.fillText("Esito esame", chart.left + 140, 20);
}

/**
 * Vista mensile degli esami pianificati o in corso (`status !== "Completed"`).
 * Completati con data restano nella tab lista ma qui non sporcano il calendario (semantic choice product).
 *
 * Padding iniziale: parte la griglia dalla colonna lunedi europea usando `(getDay()+6)%7`.
 * `toISOString().slice(0,10)` per il confronto giorno ↔ `exam_date` preserva coerenza con stringhe salvate dal client.
 */
function renderCalendar(exams) {
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const localeTag = CALENDAR_LOCALES[state.profile.language] || "it-IT";
  const monthName = currentCalendarDate.toLocaleDateString(localeTag, { month: "long", year: "numeric" });
  calendarTitleEl.textContent = monthName;
  calendarGridEl.innerHTML = "";

  const calendarWeekLabels = CALENDAR_WEEK_DAYS.map((dayKey) => t(`daysShort.${dayKey}`));
  calendarWeekLabels.forEach((label) => {
    const cell = document.createElement("div");
    cell.className = "calendar-weekday";
    cell.textContent = label;
    calendarGridEl.appendChild(cell);
  });

  const firstOfMonth = new Date(year, month, 1);
  const startIndex = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < startIndex; i += 1) {
    const empty = document.createElement("div");
    empty.className = "calendar-day muted";
    calendarGridEl.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cellDate = new Date(year, month, day);
    cellDate.setHours(0, 0, 0, 0);
    const cell = document.createElement("div");
    cell.className = "calendar-day";
    if (cellDate.getTime() === today.getTime()) {
      cell.classList.add("today");
    }

    const dayNumber = document.createElement("p");
    dayNumber.className = "calendar-day-number";
    dayNumber.textContent = String(day);
    cell.appendChild(dayNumber);

    const dayIso = cellDate.toISOString().slice(0, 10);
    exams
      .filter((e) => e.examDate === dayIso && e.status !== "Completed")
      .forEach((e) => {
        const chip = document.createElement("div");
        chip.className = "exam-chip";
        chip.textContent = `${e.subject} (${formatExamStatus(e.status)})`;
        cell.appendChild(chip);
      });

    calendarGridEl.appendChild(cell);
  }
}

/** Tab Piano Studio: colonne giorni con pulsanti elimina sessione. */
function renderStudyPlan() {
  renderStudyBoard(studyBoardEl, true);
}

/** Home: stesso layout ma senza rimozioni (solo lettura planner). */
function renderHomeStudyPlan() {
  renderStudyBoard(homeStudyBoardEl, false);
}

/**
 * Sette colonne WEEK_DAYS, sessioni aggregate per giorno e ordinamento orario.
 * @param {HTMLElement|null} containerEl
 * @param {boolean} showDeleteButton se true mostra delete su ogni item (tab Studio)
 */
function renderStudyBoard(containerEl, showDeleteButton) {
  if (!containerEl) return;
  const plan = getStudyPlan();
  containerEl.innerHTML = "";

  WEEK_DAYS.forEach((day) => {
    const column = document.createElement("div");
    column.className = "study-column";
    const title = document.createElement("h3");
    title.textContent = getLocalizedDay(day);
    column.appendChild(title);

    const sessions = plan
      .filter((item) => item.day === day)
      .sort((a, b) => a.start.localeCompare(b.start));

    if (sessions.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-text";
      empty.textContent = getNoSessionLabel();
      column.appendChild(empty);
    } else {
      sessions.forEach((session) => {
        const item = document.createElement("div");
        item.className = "study-item";
        const descriptionHtml = session.description
          ? `<p class="study-item-description">${session.description}</p>`
          : "";
        const deleteBtnHtml = showDeleteButton
          ? `<button class="delete-btn" data-session-id="${session.id}" type="button">${t("study.deleteBtn")}</button>`
          : "";
        item.innerHTML = `
          <strong>${session.subject}</strong>
          <p class="study-item-time">${session.start} - ${session.end}</p>
          ${descriptionHtml}
          ${deleteBtnHtml}
        `;
        column.appendChild(item);
      });
    }

    containerEl.appendChild(column);
  });
}

/**
 * Punto centrale di repaint: sincronizza KPI, tabelle (home, gestione, simulatore),
 * grafici, calendario e board studio con `state` corrente.
 *
 * Accortezze Home tabella esami: filtro `state.homeExamFilter`, ordinamento completati `state.homeCompletedSort` (chip `#home-completed-sort-wrap`),
 * thead con 4 vs 5 colonne, toolbar ordinamento solo se filtro = completati.
 */
function render() {
  const language = state.profile.language;
  document.documentElement.lang = language;
  /* Safety sync: assicura logo header coerente col tema anche dopo transizioni UI/cache strane. */
  syncHeaderLogoByTheme();
  homeShowPendingBtn.textContent = t("pendingBtn");
  homeShowCompletedBtn.textContent = t("completedBtn");

  const exams = getExams();
  const simulatedExams = getSimulatedExams();

  /* Svuota i tre tbody ricostruiti ad ogni passata (costo O(n): accettabile per centinaia di righe max). */
  examTableBody.innerHTML = "";
  upcomingTableBody.innerHTML = "";
  simTableBody.innerHTML = "";

  /* --- Gestione Esami (tabella completa Colonna Azione edit/delete) --- */
  exams.forEach((exam) => {
    const tr = document.createElement("tr");
    if (state.editingExamId === exam.id) {
      tr.classList.add("exam-edit-row");
      tr.dataset.editing = "true";
      tr.innerHTML = `
        <td class="exam-edit-subject-cell">${exam.subject}</td>
        <td class="exam-edit-cell exam-edit-cell-credits"><input class="exam-edit-credits row-field" type="number" min="1" step="1" value="${exam.credits}" /></td>
        <td class="exam-edit-cell exam-edit-cell-grade"><input class="exam-edit-grade row-field" type="number" min="18" max="31" step="0.1" value="${exam.grade ?? ""}" /></td>
        <td class="exam-edit-cell exam-edit-cell-date"><input class="exam-edit-date row-field" type="date" value="${exam.examDate || ""}" /></td>
        <td class="exam-edit-cell exam-edit-status-cell">
          <select class="exam-edit-status row-field">
            <option value="To Take">${t("status.toTake")}</option>
            <option value="Completed">${t("status.completed")}</option>
          </select>
        </td>
        <td class="exam-edit-days-cell">${formatDaysRemaining(exam)}</td>
        <td class="exam-row-actions exam-edit-actions-cell">
          <button type="button" data-id="${exam.id}" data-action="save" class="exam-edit-action-btn">${t("manage.saveEditBtn")}</button>
          <button type="button" data-id="${exam.id}" data-action="cancel" class="ghost-btn exam-edit-action-btn">${t("manage.cancelEditBtn")}</button>
        </td>
      `;
      const statusSelect = tr.querySelector(".exam-edit-status");
      if (statusSelect) {
        statusSelect.value = normalizeExamStatus(exam.status);
      }
      syncExamEditGradeInput(tr);
    } else {
      tr.innerHTML = `
        <td>${exam.subject}</td>
        <td>${exam.credits}</td>
        <td>${exam.grade ?? "-"}</td>
        <td>${exam.examDate || "-"}</td>
        <td>${formatExamStatus(exam.status)}</td>
        <td>${formatDaysRemaining(exam)}</td>
        <td class="exam-row-actions">
          <button type="button" data-id="${exam.id}" data-action="edit" class="ghost-btn">${t("manage.editBtn")}</button>
          <button type="button" data-id="${exam.id}" data-action="delete" class="delete-btn">${t("study.deleteBtn")}</button>
        </td>
      `;
    }
    examTableBody.appendChild(tr);
  });
  bindExamEditRowInputs();

  /* --- Home — tabella compatta esami (`#upcoming-table-body`) --- */
  const isCompletedView = state.homeExamFilter === "completed";

  /*
   * `homeCompletedSort` è impostato dai chip `[data-home-sort]` (solo vista completati). Se il valore fosse alterato nel DOM,
   * normalizziamo a `dateAsc` per non lasciare uno switch senza caso valido dopo refresh o debug console.
   */
  const allowedCompletedSorts = new Set(["dateAsc", "dateDesc", "gradeDesc", "gradeAsc"]);
  if (!allowedCompletedSorts.has(state.homeCompletedSort)) {
    state.homeCompletedSort = "dateAsc";
  }

  /*
   * Da sostenere: `comparePendingExamsClosestFirst` (dettaglio in intestazione sopra comparatori Home).
   * Completati: chip `compareCompleted*` e `homeCompletedSort`.
   */
  const upcomingExams = exams
    .filter((e) =>
      isCompletedView ? e.status === "Completed" : e.status !== "Completed"
    )
    .sort((a, b) => {
      if (isCompletedView) {
        switch (state.homeCompletedSort) {
          case "dateDesc":
            return compareCompletedByDateDesc(a, b);
          case "gradeDesc":
            return compareCompletedByGradeDesc(a, b);
          case "gradeAsc":
            return compareCompletedByGradeAsc(a, b);
          case "dateAsc":
          default:
            return compareCompletedByDateAsc(a, b);
        }
      }
      return comparePendingExamsClosestFirst(a, b);
    });

  /* Toolbar ordinamento: chip visibili solo su «Completati»; `aria-pressed` indica scelta corrente (accessibilità). */
  if (homeCompletedSortWrap) {
    homeCompletedSortWrap.classList.toggle("hidden", !isCompletedView);
    homeCompletedSortWrap.setAttribute("aria-label", t("home.sortLabel"));
    homeCompletedSortWrap.querySelectorAll("[data-home-sort]").forEach((btn) => {
      const active = btn.dataset.homeSort === state.homeCompletedSort;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  /*
   * Intestazioni colonne mutate a runtime perché vista completati toglie «Giorni» e «Stato» e mostra solo «Voto».
   * (Prima colonne stato/giorni servono alla pianificazione; nei completati l’informazione prioritaria è il voto.)
   */
  const upcomingHeaderRow = upcomingTableBody.parentElement.querySelector("thead tr");
  if (upcomingHeaderRow) {
    upcomingHeaderRow.innerHTML = isCompletedView
      ? `
        <th>${t("tableSubject")}</th>
        <th>${t("tableCfu")}</th>
        <th>${t("tableDate")}</th>
        <th>${t("tableGrade")}</th>
      `
      : `
        <th>${t("tableSubject")}</th>
        <th>${t("tableCfu")}</th>
        <th>${t("tableDate")}</th>
        <th>${t("tableStatus")}</th>
        <th>${t("tableDays")}</th>
      `;
  }

  if (upcomingExams.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML =
      isCompletedView
        ? `<td colspan="4">${t("noneCompleted")}</td>`
        : `<td colspan="5">${t("nonePlanned")}</td>`;
    upcomingTableBody.appendChild(emptyRow);
  } else {
    upcomingExams.forEach((exam) => {
      const tr = document.createElement("tr");
      tr.innerHTML = isCompletedView
        ? `
          <td>${exam.subject}</td>
          <td>${exam.credits}</td>
          <td>${exam.examDate || "-"}</td>
          <td>${
            exam.grade != null && Number.isFinite(Number(exam.grade)) ? exam.grade : "-"
          }</td>
        `
        : `
          <td>${exam.subject}</td>
          <td>${exam.credits}</td>
          <td>${exam.examDate || "-"}</td>
          <td>${formatExamStatus(exam.status)}</td>
          <td>${formatDaysRemaining(exam)}</td>
        `;
      upcomingTableBody.appendChild(tr);
    });
  }

  /* Evidenziazione visiva quale filtro Home è attivo (stile `.small-filter-btn.active`). */
  homeShowPendingBtn.classList.toggle("active", state.homeExamFilter === "pending");
  homeShowCompletedBtn.classList.toggle("active", state.homeExamFilter === "completed");

  /* --- KPI Home card: media, CFU dal profilo (`totalCfu`), anello CSS conico --- */
  const gpa = weightedGpa(exams);
  const simGpa = simulatedGpa(exams, simulatedExams);
  const acquired = exams
    .filter((e) => e.status === "Completed")
    .reduce((acc, e) => acc + e.credits, 0);
  const total = state.profile.totalCfu;
  const remaining = Math.max(total - acquired, 0);
  const percentage = total > 0 ? (acquired / total) * 100 : 0;
  const degree = Math.round((percentage / 100) * 360);
  const targetGpa = getTargetGpa();

  gpaEl.textContent = gpa.toFixed(2);
  acquiredCreditsEl.textContent = String(acquired);
  totalCreditsEl.textContent = String(total);
  remainingCreditsEl.textContent = String(remaining);
  creditsPercentageEl.textContent = `${percentage.toFixed(0)}%`;
  creditsChartEl.style.background = `conic-gradient(#22c55e ${degree}deg, var(--muted) ${degree}deg 360deg)`;

  /**
   * «Obiettivo media»: se impostato, stima naive della media ponderata futura sulle CFU rimanenti
   * usando risoluzione primo grado: ( Σ target*total − current_weighted_completed ) / remaining_credits.
   */
  targetAverageHomeEl.value = targetGpa > 0 ? targetGpa.toFixed(2) : "";
  if (targetGpa > 0) {
    const neededForFuture = (targetGpa * total - gpa * acquired) / Math.max(1, remaining);
    targetAverageTipEl.textContent = t("targetTip", {
      target: targetGpa.toFixed(2),
      needed: neededForFuture.toFixed(2)
    });
  } else {
    targetAverageTipEl.textContent = t("targetPrompt");
  }

  const graduationAvgTarget = (state.profile.graduationTarget * 30) / 110;
  graduationAverageTipEl.textContent = t("graduationTip", {
    target: state.profile.graduationTarget.toFixed(1),
    avg: graduationAvgTarget.toFixed(2)
  });

  const completedWithGrade = exams.filter(
    (e) => e.status === "Completed" && Number.isFinite(e.grade)
  );
  if (completedWithGrade.length === 0) {
    trendHelperMessageEl.textContent = t("trendEmpty");
  } else {
    trendHelperMessageEl.textContent = t("trendInfo");
  }
  drawTrendChart(exams, targetGpa, state.profile.graduationTarget);
  renderCalendar(exams);
  renderStudyPlan();
  renderHomeStudyPlan();

  /* --- Tab Gestione — paragrafo sotto tabella simulatore --- */
  simulatorResultEl.textContent = simulatedExams.length
    ? t("manage.simCurrentVsSim", { current: gpa.toFixed(2), simulated: simGpa.toFixed(2) })
    : t("manage.simCurrentOnly", { current: gpa.toFixed(2) });

  simulatedExams.forEach((exam) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${exam.subject}</td>
      <td>${exam.credits}</td>
      <td>${exam.plannedGrade}</td>
      <td><button class="delete-btn" data-sim-id="${exam.id}" type="button">${t("study.deleteBtn")}</button></td>
    `;
    simTableBody.appendChild(tr);
  });
}

// =============================================================================
// Listener DOM — pattern comune: event.preventDefault, validazioni rapide JS, apiRequest(await),
// aggiorni state tramite helper save*, poi render(). Gli alert sono fallback UX minimo senza libreria toast.
//
// IMPORTANTE su examTableBody/simTableBody/studyBoard: si usa delegation laddove possibile
// (examTableBody un solo listener per edit/save/delete) per ridurre registrazioni su righe dinamiche.
// =============================================================================

/** Form Gestione nuovo esame — POST poi prepend in lista come fa il server ORDER BY id DESC */
examForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const subject = document.getElementById("subject").value.trim();
  const credits = Number(document.getElementById("credits").value);
  const gradeValue = document.getElementById("grade").value;
  const rawGrade = gradeValue === "" ? null : Number(gradeValue);
  const examDate = document.getElementById("exam-date").value;
  let status = document.getElementById("status").value;
  if (isDateBeforeToday(examDate)) {
    status = "Completed";
    examStatusInput.value = status;
  }
  const grade = status === "Completed" ? rawGrade : null;

  if (!subject || !Number.isFinite(credits) || credits <= 0) return;
  if (status === "Completed" && !Number.isFinite(grade)) return;

  try {
    const created = await apiRequest("/api/exams", {
      method: "POST",
      body: JSON.stringify({ subject, credits, grade, examDate, status })
    });
    saveExams([created, ...getExams()]);
    resetAddExamForm();
    render();
  } catch (error) {
    alert(error.message);
  }
});

clearExamFormBtn?.addEventListener("click", () => {
  resetAddExamForm();
});

/** Azioni modifica/eliminazione riga Gestione tramite pulsanti `[data-action][data-id]` */
examTableBody.addEventListener("click", async (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  const id = Number(target.dataset.id);
  const action = target.dataset.action;
  if (!Number.isFinite(id)) return;

  if (action === "edit") {
    state.editingExamId = id;
    render();
    return;
  }
  if (action === "cancel") {
    state.editingExamId = null;
    render();
    return;
  }
  if (action === "save") {
    const row = target.closest("tr");
    if (!row) return;
    const credits = Number(row.querySelector(".exam-edit-credits")?.value);
    const status = row.querySelector(".exam-edit-status")?.value;
    const examDate = row.querySelector(".exam-edit-date")?.value || null;
    const gradeValue = row.querySelector(".exam-edit-grade")?.value ?? "";
    const rawGrade = gradeValue === "" ? null : Number(gradeValue);
    const grade = status === "Completed" ? rawGrade : null;
    if (!Number.isFinite(credits) || credits <= 0) return;
    if (!["To Take", "Completed"].includes(status)) return;
    if (status === "Completed" && !Number.isFinite(grade)) return;
    try {
      const updated = await apiRequest(`/api/exams/${id}`, {
        method: "PUT",
        body: JSON.stringify({ credits, grade, examDate, status })
      });
      saveExams(getExams().map((exam) => (exam.id === id ? updated : exam)));
      state.editingExamId = null;
      render();
    } catch (error) {
      alert(error.message);
    }
    return;
  }
  if (action !== "delete") return;
  try {
    await apiRequest(`/api/exams/${id}`, { method: "DELETE" });
    saveExams(getExams().filter((exam) => exam.id !== id));
    if (state.editingExamId === id) {
      state.editingExamId = null;
    }
    render();
  } catch (error) {
    alert(error.message);
  }
});

/** Svuota tutto — DELETE collezione esami lato API (azione distruttiva senza conferma modal) */
clearBtn.addEventListener("click", async () => {
  try {
    await apiRequest("/api/exams", { method: "DELETE" });
    saveExams([]);
    simulatorResultEl.textContent = "";
    render();
  } catch (error) {
    alert(error.message);
  }
});

/** Sync obiettivo media dopo blur/change campo numerico nella card Andamento della Home */
targetAverageHomeEl.addEventListener("change", async () => {
  const value = Number(targetAverageHomeEl.value);
  const payload = Number.isFinite(value) && value >= 18 && value <= 31 ? value : null;
  if (targetAverageHomeEl.value !== "" && payload === null) {
    return;
  }
  try {
    const data = await apiRequest("/api/settings/target-gpa", {
      method: "PUT",
      body: JSON.stringify({ value: payload })
    });
    state.targetGpa = data.targetGpa;
    render();
  } catch (error) {
    alert(error.message);
  }
});

/** Naviga calendario senza ricaricare gli esami dalla rete — solo repaint calendario */
prevMonthBtn.addEventListener("click", () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
  renderCalendar(getExams());
});

nextMonthBtn.addEventListener("click", () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
  renderCalendar(getExams());
});

/** Aggiungi sessione studio — UUID generato nel client come richiesto da API */
studyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const day = document.getElementById("study-day").value;
  const subject = document.getElementById("study-subject").value.trim();
  const description = document.getElementById("study-description").value.trim();
  const start = document.getElementById("study-start").value;
  const end = document.getElementById("study-end").value;
  if (!subject || !start || !end || start >= end) return;

  const session = {
    id: crypto.randomUUID(),
    day,
    subject,
    description,
    start,
    end
  };
  try {
    const created = await apiRequest("/api/study-sessions", {
      method: "POST",
      body: JSON.stringify(session)
    });
    saveStudyPlan([...getStudyPlan(), created]);
    studyForm.reset();
    render();
  } catch (error) {
    alert(error.message);
  }
});

/** Remove singola sessione — il bottone porta `data-session-id` generato dalla renderStudyBoard HTML string */
studyBoardEl.addEventListener("click", async (event) => {
  const target = event.target;
  if (target.tagName !== "BUTTON") return;
  const id = target.dataset.sessionId;
  try {
    await apiRequest(`/api/study-sessions/${id}`, { method: "DELETE" });
    const updated = getStudyPlan().filter((item) => item.id !== id);
    saveStudyPlan(updated);
    render();
  } catch (error) {
    alert(error.message);
  }
});

/** DELETE REST che elimina tutte le righe piano studio sul server dell’utente corrente */
clearStudyBtn.addEventListener("click", async () => {
  try {
    await apiRequest("/api/study-sessions", { method: "DELETE" });
    saveStudyPlan([]);
    render();
  } catch (error) {
    alert(error.message);
  }
});

examStatusInput.addEventListener("change", syncGradeInputByStatus);
examDateInput.addEventListener("change", applyExamDateStatusRule);

/** Toggle filtro tabella Home: nasconde select ordinamento (`render` riattacca `.hidden`). */
homeShowPendingBtn.addEventListener("click", () => {
  state.homeExamFilter = "pending";
  render();
});
homeShowCompletedBtn.addEventListener("click", () => {
  state.homeExamFilter = "completed";
  render();
});

/** Ordinamento esami completati: click su uno dei chip `[data-home-sort]` (delegation sul wrapper). */
homeCompletedSortWrap?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-home-sort]");
  if (!btn || !homeCompletedSortWrap.contains(btn)) return;
  state.homeCompletedSort = btn.dataset.homeSort || "dateAsc";
  render();
});

/**
 * Impostazioni: event delegation dentro `#settings-tab`.
 * Aggiorna **solo la bozza** (`getProfileForUi`) per tile grado/tema/lingua; preset voto laurea scrive nell’`<input>`
 * (persistenza numeri inclusa al click «Salva impostazioni» insieme al resto del profilo).
 */
settingsTabEl.addEventListener("click", (event) => {
  const degreeBtn = event.target.closest("[data-settings-degree]");
  if (degreeBtn) {
    setDegreeFromTile(degreeBtn.dataset.settingsDegree);
    return;
  }

  const themeBtn = event.target.closest("[data-settings-theme]");
  if (themeBtn) {
    getProfileForUi().themePreset = themeBtn.dataset.settingsTheme;
    applyTheme(getCurrentTheme());
    syncProfileInputs();
    return;
  }

  const gradBtn = event.target.closest("[data-grad-preset]");
  if (gradBtn) {
    graduationTargetInput.value = gradBtn.dataset.gradPreset;
    return;
  }

  const langBtn = event.target.closest("[data-settings-lang]");
  if (langBtn) {
    if (!window.i18next || !i18nReady) return;
    const lng = langBtn.dataset.settingsLang;
    getProfileForUi().language = lng;
    document.documentElement.lang = lng;
    i18next
      .changeLanguage(lng)
      .then(() => {
        translateStaticUi();
        setupDateTimePickers();
        syncProfileInputs();
        render();
      })
      .catch((error) => {
        alert(error.message);
      });
  }
});

/**
 * Persiste la bozza Impostazioni su `/api/settings/profile` e aggiorna `state.profile`;
 * la bozza diventa una copia del profilo salvato (resti in modalità modifica sullo stesso tab).
 */
saveSettingsBtn.addEventListener("click", async () => {
  /*
   * `startSettingsDraft` di sicurezza: se qualcuno clicca Salva prima che il click tab abbia mai creato la bozza
   * (edge case tooling), cloniamo comunque il profilo attuale invece di dereferenziare null.
   */
  if (!settingsDraftProfile) {
    startSettingsDraft();
  }
  const totalCfu = Number(totalCfuInput.value);
  const graduationTarget = Number(graduationTargetInput.value);
  if (!Number.isFinite(totalCfu) || totalCfu <= 0) return;
  if (!Number.isFinite(graduationTarget) || graduationTarget < 66 || graduationTarget > 110) return;
  Object.assign(settingsDraftProfile, { totalCfu, graduationTarget });
  const profile = {
    language: settingsDraftProfile.language,
    themePreset: settingsDraftProfile.themePreset,
    degreePath: settingsDraftProfile.degreePath,
    totalCfu: settingsDraftProfile.totalCfu,
    graduationTarget: settingsDraftProfile.graduationTarget
  };
  try {
    const data = await apiRequest("/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify({ profile })
    });
    state.profile = { ...DEFAULT_PROFILE, ...data.profile };
    settingsDraftProfile = { ...state.profile };
    syncProfileInputs();
    applyTheme(getCurrentTheme());
    await translateStaticUi();
    render();
    showSettingsSavedToast();
  } catch (error) {
    alert(error.message);
  }
});

authLoginTabBtn.addEventListener("click", () => setAuthMode("login"));
authRegisterTabBtn.addEventListener("click", () => setAuthMode("register"));

/** Login: cookie HttpOnly dalla risposta, poi caricamento stato completo e ridisegno grafico quando torni in Home */
authLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("auth-login-email").value.trim();
  const password = document.getElementById("auth-login-password").value;
  try {
    await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    authLoginForm.reset();
    await loadAppData();
    showAppView();
    scheduleTrendChartDraw();
  } catch (error) {
    showAuthView(error.message);
  }
});

/** Registrazione: POST crea anche sessione logged-in sul server così esperienza continua direttamente nell’area app */
authRegisterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("auth-register-email").value.trim();
  const password = document.getElementById("auth-register-password").value;
  try {
    await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    authRegisterForm.reset();
    await loadAppData();
    showAppView();
    scheduleTrendChartDraw();
  } catch (error) {
    showAuthView(error.message);
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch {
    /* Reale network fail: comunque wipe locale per non tenere sullo schermo dati sensibili */
  }
  /* Resetta state memoria anche se logout server fallisce così shell auth non rimane zombie */
  state.exams = [];
  state.studyPlan = [];
  state.targetGpa = 0;
  /* Nessuna bozza UI dopo logout — al prossimo login `loadAppData` riparte dal profilo remoto soltanto */
  settingsDraftProfile = null;
  state.profile = { ...DEFAULT_PROFILE };
  showAuthView("Disconnesso.");
});

/**
 * Tab principali SPA senza routing: toggle `.active` su bottoni nav e `#<id>-tab` corrispondente.
 *
 * Eccezione **Impostazioni**:
 * - uscendo (`leavingSettings`) senza salvare → `discardSettingsDraft()` ripristina tema/lingua/form da server;
 * - entrando da altro tab → `startSettingsDraft()` fotografa profilo così modifiche successive restano una bozza;
 * - re-click su Impostazioni da già su Impostazioni **non** resetta bozza (`enteringSettingsFromElsewhere` falso).
 */
tabButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const selectedTab = button.dataset.tab;
    const currentSection = document.querySelector(".tab-content.active");
    const wasOnSettings = currentSection?.id === "settings-tab";
    const leavingSettings = wasOnSettings && selectedTab !== "settings";
    const enteringSettingsFromElsewhere = selectedTab === "settings" && !wasOnSettings;
    if (leavingSettings) {
      await discardSettingsDraft();
    }
    if (enteringSettingsFromElsewhere) {
      startSettingsDraft();
    }
    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabContents.forEach((content) => content.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(`${selectedTab}-tab`).classList.add("active");
    if (selectedTab === "home") {
      scheduleTrendChartDraw();
    }
  });
});

/** Simulatore: non crea righe nella tab exams — solo simulated_exams; render aggiorna testo confrontation media vs sim avg */
simulatorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const subject = document.getElementById("sim-subject").value.trim();
  const credits = Number(document.getElementById("sim-credits").value);
  const plannedGrade = Number(document.getElementById("sim-grade").value);
  if (!subject || !Number.isFinite(credits) || credits <= 0 || !Number.isFinite(plannedGrade)) {
    return;
  }
  try {
    const created = await apiRequest("/api/simulated-exams", {
      method: "POST",
      body: JSON.stringify({ subject, credits, plannedGrade })
    });
    saveSimulatedExams([created, ...getSimulatedExams()]);
    simulatorForm.reset();
    render();
  } catch (error) {
    alert(error.message);
  }
});

/** Click su pulsante elimina dentro tabella righe simulator */
simTableBody.addEventListener("click", async (event) => {
  const target = event.target;
  if (target.tagName !== "BUTTON") return;
  const id = Number(target.dataset.simId);
  if (!Number.isFinite(id)) return;
  try {
    await apiRequest(`/api/simulated-exams/${id}`, { method: "DELETE" });
    saveSimulatedExams(getSimulatedExams().filter((item) => item.id !== id));
    render();
  } catch (error) {
    alert(error.message);
  }
});

/** DELETE bulk simulated exams */
clearSimBtn.addEventListener("click", async () => {
  try {
    await apiRequest("/api/simulated-exams", { method: "DELETE" });
    saveSimulatedExams([]);
    render();
  } catch (error) {
    alert(error.message);
  }
});

/**
 * Tab Richieste: POST `/api/feature-requests` (auth obbligatoria).
 * Il server salva sempre su SQLite; se SMTP è configurato e l'invio riesce, `emailed: true`.
 * Altrimenti `emailStatus` indica il motivo (messaggio tradotto sotto il form).
 */
featureRequestForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const subject = featureRequestSubject?.value.trim() ?? "";
  const message = featureRequestMessage?.value.trim() ?? "";
  if (!subject || !message) {
    if (featureRequestStatusEl) featureRequestStatusEl.textContent = t("requests.validation");
    return;
  }
  if (featureRequestStatusEl) featureRequestStatusEl.textContent = "";
  try {
    const data = await apiRequest("/api/feature-requests", {
      method: "POST",
      body: JSON.stringify({ subject, message })
    });
    featureRequestForm?.reset();
    if (featureRequestStatusEl) {
      if (data.emailed) {
        featureRequestStatusEl.textContent = t("requests.successEmailed");
      } else {
        const hintKey =
          data.emailStatus === "missing_smtp_password"
            ? "requests.hintSmtpPassword"
            : data.emailStatus === "missing_smtp_host"
              ? "requests.hintSmtpHost"
              : data.emailStatus === "smtp_error"
                ? "requests.hintSmtpFailed"
                : "requests.successQueued";
        featureRequestStatusEl.textContent = t(hintKey);
      }
    }
  } catch (error) {
    alert(error.message);
    if (featureRequestStatusEl) featureRequestStatusEl.textContent = "";
  }
});

setDeviceMode();
syncGradeInputByStatus();
/**
 * Chiamato dopo login/registro o ricarico pagina con sessione ancora valida.
 * Passi in ordine:
 * 1. GET `/api/bootstrap` atomico con tutti i dataset necessari alla UI corrente.
 * 2. Normalizzazioni difensive (`normalizeExamStatus`, `normalizeStudyDay`) per compat JSON vecchi/errori storici lingua.
 * 3. Profilo fuse con DEFAULT per chiavi nuove mai salvate prima sul server (forward compatibility).
 * 4. Lingua sconosciuta (es. dopo rimozione file locale) ⇒ fallback sicuro alla default app.
 * 5. Prima init i18next full resources vs cambio lingua se già caricata (evita doppio fetch massiccio dei JSON da client).
 * 6. Ritraduzione etichette statiche DOM, tile impostazioni, CSS variables tema, picker data/ora eventualmente ricreati.
 * 7. render() finale mostra stato coerente con server.
 */
async function loadAppData() {
  /* Nuovo dataset server ⇒ niente bozza Impostazioni incoerente col profilo appena caricato. */
  settingsDraftProfile = null;
  const browserPreferredLanguage = getBrowserPreferredLanguage();
  const data = await apiRequest("/api/bootstrap");
  state.exams = (data.exams || []).map((exam) => ({
    ...exam,
    status: normalizeExamStatus(exam.status)
  }));
  state.studyPlan = (data.studyPlan || []).map((session) => ({
    ...session,
    day: normalizeStudyDay(session.day),
    description: session.description || ""
  }));
  state.simulatedExams = (data.simulatedExams || []).map((exam) => ({
    ...exam,
    plannedGrade: Number(exam.plannedGrade)
  }));
  state.targetGpa = Number.isFinite(data.targetGpa) ? data.targetGpa : 0;
  state.profile = data.profile ? { ...DEFAULT_PROFILE, ...data.profile } : { ...DEFAULT_PROFILE };
  if (!data.profile?.language) {
    state.profile.language = browserPreferredLanguage;
  } else if (!SUPPORTED_LANGUAGES.includes(state.profile.language)) {
    state.profile.language = browserPreferredLanguage;
  }
  if (!i18nReady) await initI18n(state.profile.language);
  else await i18next.changeLanguage(state.profile.language);
  document.documentElement.lang = state.profile.language;
  await translateStaticUi();
  syncProfileInputs();
  applyTheme(getCurrentTheme());
  setupDateTimePickers();
  render();
}

/**
 * Entry applicativa client modulo:
 * Tentativo HEAD-like leggero sulla session col GET `/api/auth/me` (riceve sempre JSON anche se errore ⇒ catch).
 * - OK ⇒ loadAppData + shell app ;
 * - 401 ⇒ mostra vista auth vuota (`showAuthView`) e predisponde form login (`setAuthMode`).
 */
async function initializeApp() {
  try {
    await apiRequest("/api/auth/me");
    await loadAppData();
    showAppView();
    scheduleTrendChartDraw();
  } catch {
    showAuthView();
    setAuthMode("login");
  }
}

initializeApp();

/** Responsive: classe body device-mobile/device-desktop influenza layout CSS (sticky tab, ecc.) ; canvas grafico deve ridimensionarsi al resize finestra */
window.addEventListener("resize", () => {
  setDeviceMode();
  scheduleTrendChartDraw();
});
