const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const CALENDAR_WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const APP_I18N_VERSION = "2026-05-06-9";
const SUPPORTED_LANGUAGES = ["it", "en", "fr", "de", "ro", "es"];
const CALENDAR_LOCALES = {
  it: "it-IT",
  en: "en-GB",
  fr: "fr-FR",
  de: "de-DE",
  ro: "ro-RO",
  es: "es-ES"
};

const examForm = document.getElementById("exam-form");
const simulatorForm = document.getElementById("simulator-form");
const examTableBody = document.getElementById("exam-table-body");
const simTableBody = document.getElementById("sim-table-body");
const upcomingTableBody = document.getElementById("upcoming-table-body");
const gpaEl = document.getElementById("gpa");
const acquiredCreditsEl = document.getElementById("acquired-credits");
const totalCreditsEl = document.getElementById("total-credits");
const remainingCreditsEl = document.getElementById("remaining-credits");
const creditsChartEl = document.getElementById("credits-chart");
const creditsPercentageEl = document.getElementById("credits-percentage");
const simulatorResultEl = document.getElementById("simulator-result");
const clearSimBtn = document.getElementById("clear-sim-btn");
const clearBtn = document.getElementById("clear-btn");
const clearExamFormBtn = document.getElementById("clear-exam-form-btn");
const trendChartEl = document.getElementById("trend-chart");
const targetAverageHomeEl = document.getElementById("target-average-home");
const targetAverageTipEl = document.getElementById("target-average-tip");
const graduationAverageTipEl = document.getElementById("graduation-average-tip");
const trendHelperMessageEl = document.getElementById("trend-helper-message");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const calendarTitleEl = document.getElementById("calendar-title");
const calendarGridEl = document.getElementById("calendar-grid");
const studyForm = document.getElementById("study-form");
const studyBoardEl = document.getElementById("study-board");
const homeStudyBoardEl = document.getElementById("home-study-board");
const clearStudyBtn = document.getElementById("clear-study-btn");
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
const currentCalendarDate = new Date();
const homeShowPendingBtn = document.getElementById("home-show-pending");
const homeShowCompletedBtn = document.getElementById("home-show-completed");
const examGradeInput = document.getElementById("grade");
const examStatusInput = document.getElementById("status");
const examDateInput = document.getElementById("exam-date");
const studyStartInput = document.getElementById("study-start");
const studyEndInput = document.getElementById("study-end");
const settingsTabEl = document.getElementById("settings-tab");
const totalCfuInput = document.getElementById("total-cfu-input");
const graduationTargetInput = document.getElementById("graduation-target-input");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const settingsSavedToastEl = document.getElementById("settings-saved-toast");
const authViewEl = document.getElementById("auth-view");
const appShellEl = document.getElementById("app-shell");
const authStatusEl = document.getElementById("auth-status");
const authLoginTabBtn = document.getElementById("auth-login-tab");
const authRegisterTabBtn = document.getElementById("auth-register-tab");
const authLoginForm = document.getElementById("auth-login-form");
const authRegisterForm = document.getElementById("auth-register-form");
const logoutBtn = document.getElementById("logout-btn");

const THEME_PRESETS = {
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
const DEFAULT_PROFILE = {
  language: "it",
  themePreset: "classic",
  degreePath: "bachelor",
  totalCfu: 180,
  graduationTarget: 100
};
const state = {
  exams: [],
  studyPlan: [],
  simulatedExams: [],
  targetGpa: 0,
  profile: { ...DEFAULT_PROFILE },
  homeExamFilter: "pending",
  editingExamId: null
};
const studyTimePickerState = {
  panel: null,
  activeInput: null,
  hourSelect: null,
  minuteSelect: null,
  hourHand: null,
  minuteHand: null,
  valueLabel: null
};
let settingsToastTimer = null;
let authMode = "login";
let trendRafId = null;

function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--primary-dark", theme.primaryDark);
  root.style.setProperty("--bg", theme.background);
  root.style.setProperty("--card-bg", theme.card);
  root.style.setProperty("--text", theme.text);
  root.style.setProperty("--muted", theme.muted);
  root.style.setProperty("--border", theme.border || "#d9e1eb");
  document.documentElement.classList.toggle("theme-dark", state.profile.themePreset === "dark");
}

function getCurrentTheme() {
  return THEME_PRESETS[state.profile.themePreset] || THEME_PRESETS.classic;
}

function getDefaultCfuByPath(path) {
  if (path === "bachelor") return 180;
  if (path === "master") return 120;
  if (path === "postgraduate") return 60;
  return state.profile.totalCfu || 180;
}

function syncProfileInputs() {
  if (!settingsTabEl) return;
  totalCfuInput.value = String(state.profile.totalCfu);
  graduationTargetInput.value = String(state.profile.graduationTarget);
  totalCfuInput.disabled = state.profile.degreePath !== "custom";

  settingsTabEl.querySelectorAll("[data-settings-degree]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.settingsDegree === state.profile.degreePath);
  });
  settingsTabEl.querySelectorAll("[data-settings-theme]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.settingsTheme === state.profile.themePreset);
  });
  settingsTabEl.querySelectorAll("[data-settings-lang]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.settingsLang === state.profile.language);
  });
}

let i18nReady = false;
let translationResources = {};

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

function t(key, options) {
  if (!window.i18next || !i18nReady) return key;
  const translated = i18next.t(key, options);
  if (translated !== key) return translated;

  // Safety fallback for nested keys in case i18next config/cache mismatches.
  const lang = state.profile.language || "it";
  const dict = translationResources[lang] || {};
  const fallback = key.split(".").reduce((acc, part) => (acc && typeof acc === "object" ? acc[part] : undefined), dict);
  return typeof fallback === "string" ? fallback : translated;
}

function getLocalizedDay(day) {
  return t(`days.${day}`);
}

function getNoSessionLabel() {
  return t("study.noSession");
}

async function translateStaticUi() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  const statusMap = {
    "To Take": "status.toTake",
    "In Preparation": "status.inPrep",
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

function formatExamStatus(raw) {
  const map = {
    "To Take": "status.toTake",
    "In Preparation": "status.inPrep",
    Completed: "status.completed"
  };
  const key = map[raw];
  return key ? t(key) : raw;
}

function normalizeExamStatus(rawStatus) {
  const normalizedMap = {
    "status.toTake": "To Take",
    "status.inPrep": "In Preparation",
    "status.completed": "Completed",
    "Da sostenere": "To Take",
    "In preparazione": "In Preparation",
    Completato: "Completed",
    "To take": "To Take",
    "In preparation": "In Preparation",
    Completed: "Completed"
  };
  return normalizedMap[rawStatus] || rawStatus;
}

function normalizeStudyDay(rawDay) {
  if (typeof rawDay !== "string") return rawDay;
  const cleaned = rawDay.startsWith("days.") ? rawDay.slice(5) : rawDay;
  return WEEK_DAYS.includes(cleaned) ? cleaned : rawDay;
}

function setDegreeFromTile(path) {
  state.profile.degreePath = path;
  if (path !== "custom") {
    state.profile.totalCfu = getDefaultCfuByPath(path);
  }
  totalCfuInput.value = String(state.profile.totalCfu);
  totalCfuInput.disabled = path !== "custom";
  syncProfileInputs();
}

function destroyDatePickers() {
  [examDateInput].forEach((el) => {
    if (el._flatpickr) el._flatpickr.destroy();
  });
}

function formatTimeValue(hour, minute) {
  const safeHour = String(Math.max(0, Math.min(23, Number(hour) || 0))).padStart(2, "0");
  const safeMinute = String(Math.max(0, Math.min(59, Number(minute) || 0))).padStart(2, "0");
  return `${safeHour}:${safeMinute}`;
}

function parseTimeValue(raw) {
  if (typeof raw !== "string") return { hour: 9, minute: 0 };
  const match = raw.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return { hour: 9, minute: 0 };
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function updateStudyClockPreview(hour, minute) {
  const { hourHand, minuteHand, valueLabel } = studyTimePickerState;
  if (!hourHand || !minuteHand || !valueLabel) return;
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;
  hourHand.style.transform = `translateX(-50%) rotate(${hourAngle}deg)`;
  minuteHand.style.transform = `translateX(-50%) rotate(${minuteAngle}deg)`;
  valueLabel.textContent = formatTimeValue(hour, minute);
}

function applyStudyPickerSelection() {
  const { activeInput, hourSelect, minuteSelect } = studyTimePickerState;
  if (!activeInput || !hourSelect || !minuteSelect) return;
  activeInput.value = formatTimeValue(hourSelect.value, minuteSelect.value);
  activeInput.dispatchEvent(new Event("change", { bubbles: true }));
}

function hideStudyTimePicker() {
  const { panel } = studyTimePickerState;
  if (!panel) return;
  panel.hidden = true;
  studyTimePickerState.activeInput = null;
}

function placeStudyTimePicker(targetInput) {
  const { panel } = studyTimePickerState;
  if (!panel) return;
  const rect = targetInput.getBoundingClientRect();
  panel.style.top = `${window.scrollY + rect.bottom + 8}px`;
  panel.style.left = `${Math.max(12, window.scrollX + rect.left)}px`;
}

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

function syncGradeInputByStatus() {
  const isCompleted = examStatusInput.value === "Completed";
  examGradeInput.disabled = !isCompleted;
  examGradeInput.required = isCompleted;
  if (!isCompleted) {
    examGradeInput.value = "";
  }
}

function getTodayIsoDate() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString().slice(0, 10);
}

function isDateBeforeToday(dateStr) {
  return typeof dateStr === "string" && dateStr !== "" && dateStr < getTodayIsoDate();
}

function applyExamDateStatusRule() {
  if (isDateBeforeToday(examDateInput.value)) {
    examStatusInput.value = "Completed";
  }
  syncGradeInputByStatus();
}

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

function setupDateTimePickers() {
  if (typeof flatpickr === "function") {
    destroyDatePickers();

    const useIt = state.profile.language === "it";
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

function showSettingsSavedToast() {
  if (!settingsSavedToastEl) return;
  settingsSavedToastEl.textContent = t("settings.saved");
  settingsSavedToastEl.classList.add("show");
  if (settingsToastTimer) {
    clearTimeout(settingsToastTimer);
  }
  settingsToastTimer = setTimeout(() => {
    settingsSavedToastEl.classList.remove("show");
  }, 2200);
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options
  });
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    let message = "Request failed";
    try {
      if (contentType.includes("application/json")) {
        const body = await response.json();
        message = body.error || message;
      } else {
        const bodyText = await response.text();
        if (bodyText.startsWith("<!doctype") || bodyText.startsWith("<html")) {
          message = "Unexpected HTML response from API endpoint.";
        }
      }
    } catch {
      // noop
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  if (!contentType.includes("application/json")) {
    throw new Error("API did not return JSON.");
  }
  return response.json();
}

function resetAddExamForm() {
  examForm.reset();
  syncGradeInputByStatus();
  applyExamDateStatusRule();
}

function setAuthMode(mode) {
  authMode = mode;
  authLoginTabBtn.classList.toggle("active", mode === "login");
  authRegisterTabBtn.classList.toggle("active", mode === "register");
  authLoginForm.classList.toggle("hidden", mode !== "login");
  authRegisterForm.classList.toggle("hidden", mode !== "register");
  if (authStatusEl) authStatusEl.textContent = "";
}

function showAuthView(message = "") {
  authViewEl.classList.remove("hidden");
  appShellEl.classList.add("hidden");
  if (authStatusEl) authStatusEl.textContent = message;
}

function showAppView() {
  authViewEl.classList.add("hidden");
  appShellEl.classList.remove("hidden");
}

function setDeviceMode() {
  const isMobileWidth = window.matchMedia("(max-width: 900px)").matches;
  const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const isMobile = isMobileWidth || hasCoarsePointer;
  document.body.classList.toggle("device-mobile", isMobile);
  document.body.classList.toggle("device-desktop", !isMobile);
}

function getTargetGpa() {
  return Number.isFinite(state.targetGpa) ? state.targetGpa : 0;
}

function getExams() {
  return state.exams;
}

function saveExams(exams) {
  state.exams = exams;
}

function getStudyPlan() {
  return state.studyPlan;
}

function saveStudyPlan(plan) {
  state.studyPlan = plan;
}

function getSimulatedExams() {
  return state.simulatedExams;
}

function saveSimulatedExams(list) {
  state.simulatedExams = list;
}

function daysRemaining(dateStr) {
  if (!dateStr) return "-";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function formatDaysRemaining(exam) {
  if (exam.status === "Completed") return t("done");
  const days = daysRemaining(exam.examDate);
  if (days === "-") return "-";
  if (days < 0) return t("expired");
  if (days === 0) return t("today");
  return String(days);
}

function weightedGpa(exams) {
  const completed = exams.filter(
    (e) => e.status === "Completed" && Number.isFinite(e.grade)
  );
  const weighted = completed.reduce((acc, e) => acc + e.grade * e.credits, 0);
  const credits = completed.reduce((acc, e) => acc + e.credits, 0);
  return credits > 0 ? weighted / credits : 0;
}

function simulatedGpa(exams, simulatedExams) {
  const completed = exams.filter((e) => e.status === "Completed" && Number.isFinite(e.grade));
  const weightedReal = completed.reduce((acc, e) => acc + e.grade * e.credits, 0);
  const creditsReal = completed.reduce((acc, e) => acc + e.credits, 0);
  const weightedSim = simulatedExams.reduce((acc, e) => acc + e.plannedGrade * e.credits, 0);
  const creditsSim = simulatedExams.reduce((acc, e) => acc + e.credits, 0);
  const totalCredits = creditsReal + creditsSim;
  return totalCredits > 0 ? (weightedReal + weightedSim) / totalCredits : 0;
}

function isTrendChartVisible() {
  if (!trendChartEl) return false;
  const homeTab = document.getElementById("home-tab");
  if (!homeTab || !homeTab.classList.contains("active")) return false;
  return trendChartEl.clientWidth > 0;
}

function scheduleTrendChartDraw() {
  if (trendRafId) {
    cancelAnimationFrame(trendRafId);
  }
  trendRafId = requestAnimationFrame(() => {
    trendRafId = null;
    drawTrendChart(getExams(), getTargetGpa(), state.profile.graduationTarget);
  });
}

function drawTrendChart(exams, targetGpa, graduationTarget) {
  if (!isTrendChartVisible()) return;
  const ctx = trendChartEl.getContext("2d");
  const cssWidth = Math.max(280, trendChartEl.clientWidth || 300);
  const cssHeight = 260;
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

  // Grid + Y axis labels.
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

  const examPoints = completed.map((e) => e.grade);
  const runningAvg = [];
  let weighted = 0;
  let credits = 0;
  completed.forEach((e) => {
    weighted += e.grade * e.credits;
    credits += e.credits;
    runningAvg.push(weighted / credits);
  });

  // Target line.
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

  // Graduation target line converted from /110 to /30.
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

  const lineValues = runningAvg.length === 1 ? [runningAvg[0], runningAvg[0]] : runningAvg;

  // Running average area.
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

  // Running average line.
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

  // Exam points.
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

  // Axes.
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chart.left, chart.top);
  ctx.lineTo(chart.left, chart.bottom);
  ctx.lineTo(chart.right, chart.bottom);
  ctx.stroke();

  // X axis labels (exam sequence).
  ctx.fillStyle = "#64748b";
  ctx.font = "11px sans-serif";
  examPoints.forEach((_, index) => {
    const x = xAt(index, examPoints.length);
    const label = String(index + 1);
    ctx.fillText(label, x - 3, chart.bottom + 14);
  });

  // Legend.
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

function renderStudyPlan() {
  renderStudyBoard(studyBoardEl, true);
}

function renderHomeStudyPlan() {
  renderStudyBoard(homeStudyBoardEl, false);
}

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

function render() {
  const language = state.profile.language;
  document.documentElement.lang = language;
  homeShowPendingBtn.textContent = t("pendingBtn");
  homeShowCompletedBtn.textContent = t("completedBtn");

  const exams = getExams();
  const simulatedExams = getSimulatedExams();
  examTableBody.innerHTML = "";
  upcomingTableBody.innerHTML = "";
  simTableBody.innerHTML = "";

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
            <option value="In Preparation">${t("status.inPrep")}</option>
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
        statusSelect.value = exam.status;
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

  const upcomingExams = exams
    .filter((e) =>
      state.homeExamFilter === "completed" ? e.status === "Completed" : e.status !== "Completed"
    )
    .sort((a, b) => {
      if (!a.examDate && !b.examDate) return 0;
      if (!a.examDate) return 1;
      if (!b.examDate) return -1;
      return new Date(a.examDate) - new Date(b.examDate);
    });

  const isCompletedView = state.homeExamFilter === "completed";
  const upcomingHeaderRow = upcomingTableBody.parentElement.querySelector("thead tr");
  if (upcomingHeaderRow) {
    upcomingHeaderRow.innerHTML = isCompletedView
      ? `
        <th>${t("tableSubject")}</th>
        <th>${t("tableCfu")}</th>
        <th>${t("tableDate")}</th>
        <th>${t("tableStatus")}</th>
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
      state.homeExamFilter === "completed"
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
          <td>${formatExamStatus(exam.status)}</td>
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

  homeShowPendingBtn.classList.toggle("active", state.homeExamFilter === "pending");
  homeShowCompletedBtn.classList.toggle("active", state.homeExamFilter === "completed");

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
    if (!["To Take", "In Preparation", "Completed"].includes(status)) return;
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

prevMonthBtn.addEventListener("click", () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
  renderCalendar(getExams());
});

nextMonthBtn.addEventListener("click", () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
  renderCalendar(getExams());
});

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
homeShowPendingBtn.addEventListener("click", () => {
  state.homeExamFilter = "pending";
  render();
});
homeShowCompletedBtn.addEventListener("click", () => {
  state.homeExamFilter = "completed";
  render();
});
settingsTabEl.addEventListener("click", (event) => {
  const degreeBtn = event.target.closest("[data-settings-degree]");
  if (degreeBtn) {
    setDegreeFromTile(degreeBtn.dataset.settingsDegree);
    return;
  }

  const themeBtn = event.target.closest("[data-settings-theme]");
  if (themeBtn) {
    state.profile.themePreset = themeBtn.dataset.settingsTheme;
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
    state.profile.language = lng;
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

saveSettingsBtn.addEventListener("click", async () => {
  const totalCfu = Number(totalCfuInput.value);
  const graduationTarget = Number(graduationTargetInput.value);
  if (!Number.isFinite(totalCfu) || totalCfu <= 0) return;
  if (!Number.isFinite(graduationTarget) || graduationTarget < 66 || graduationTarget > 110) return;
  const profile = {
    language: state.profile.language,
    themePreset: state.profile.themePreset,
    degreePath: state.profile.degreePath,
    totalCfu,
    graduationTarget
  };
  try {
    const data = await apiRequest("/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify({ profile })
    });
    state.profile = { ...DEFAULT_PROFILE, ...data.profile };
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
    // noop
  }
  state.exams = [];
  state.studyPlan = [];
  state.targetGpa = 0;
  state.profile = { ...DEFAULT_PROFILE };
  showAuthView("Disconnesso.");
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedTab = button.dataset.tab;
    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabContents.forEach((content) => content.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(`${selectedTab}-tab`).classList.add("active");
    if (selectedTab === "home") {
      scheduleTrendChartDraw();
    }
  });
});

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

clearSimBtn.addEventListener("click", async () => {
  try {
    await apiRequest("/api/simulated-exams", { method: "DELETE" });
    saveSimulatedExams([]);
    render();
  } catch (error) {
    alert(error.message);
  }
});

setDeviceMode();
syncGradeInputByStatus();
async function loadAppData() {
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
  if (!SUPPORTED_LANGUAGES.includes(state.profile.language)) {
    state.profile.language = DEFAULT_PROFILE.language;
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
window.addEventListener("resize", () => {
  setDeviceMode();
  scheduleTrendChartDraw();
});
