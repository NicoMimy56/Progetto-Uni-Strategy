const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const CALENDAR_WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const APP_I18N_VERSION = "2026-05-05-3";

const examForm = document.getElementById("exam-form");
const simulatorForm = document.getElementById("simulator-form");
const examTableBody = document.getElementById("exam-table-body");
const upcomingTableBody = document.getElementById("upcoming-table-body");
const gpaEl = document.getElementById("gpa");
const acquiredCreditsEl = document.getElementById("acquired-credits");
const totalCreditsEl = document.getElementById("total-credits");
const remainingCreditsEl = document.getElementById("remaining-credits");
const creditsChartEl = document.getElementById("credits-chart");
const creditsPercentageEl = document.getElementById("credits-percentage");
const simulatorResultEl = document.getElementById("simulator-result");
const clearBtn = document.getElementById("clear-btn");
const trendChartEl = document.getElementById("trend-chart");
const targetAverageHomeEl = document.getElementById("target-average-home");
const targetAverageTipEl = document.getElementById("target-average-tip");
const trendHelperMessageEl = document.getElementById("trend-helper-message");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const calendarTitleEl = document.getElementById("calendar-title");
const calendarGridEl = document.getElementById("calendar-grid");
const studyForm = document.getElementById("study-form");
const studyBoardEl = document.getElementById("study-board");
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

const THEME_PRESETS = {
  classic: {
    primary: "#1d4ed8",
    primaryDark: "#0f2f6f",
    background: "#eef2f7",
    card: "#ffffff",
    text: "#10233e",
    muted: "#5a6c83",
    border: "#d9e1eb"
  },
  forest: {
    primary: "#166534",
    primaryDark: "#0b3a24",
    background: "#edf7f0",
    card: "#ffffff",
    text: "#133424",
    muted: "#4f6e60",
    border: "#c5ddcc"
  },
  sunset: {
    primary: "#c2410c",
    primaryDark: "#7c2d12",
    background: "#fff5ee",
    card: "#ffffff",
    text: "#3b1f12",
    muted: "#7f6053",
    border: "#f0d8c8"
  },
  dark: {
    primary: "#a5b4fc",
    primaryDark: "#0c0c0f",
    background: "#09090b",
    card: "#18181b",
    text: "#fafafa",
    muted: "#a1a1aa",
    border: "#27272a"
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
  targetGpa: 0,
  profile: { ...DEFAULT_PROFILE },
  homeExamFilter: "pending"
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
let translationResources = { it: {}, en: {} };

async function initI18n(language) {
  const [it, en] = await Promise.all([
    fetch(`/locales/it.json?v=${APP_I18N_VERSION}`).then((res) => res.json()),
    fetch(`/locales/en.json?v=${APP_I18N_VERSION}`).then((res) => res.json())
  ]);
  translationResources = { it, en };
  await i18next.init({
    lng: language,
    fallbackLng: "it",
    resources: {
      it: { translation: it },
      en: { translation: en }
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
  const lang = state.profile.language || "it";
  const map = {
    it: {
      Monday: "Lunedì",
      Tuesday: "Martedì",
      Wednesday: "Mercoledì",
      Thursday: "Giovedì",
      Friday: "Venerdì",
      Saturday: "Sabato",
      Sunday: "Domenica"
    },
    en: {
      Monday: "Monday",
      Tuesday: "Tuesday",
      Wednesday: "Wednesday",
      Thursday: "Thursday",
      Friday: "Friday",
      Saturday: "Saturday",
      Sunday: "Sunday"
    }
  };
  return map[lang]?.[day] || t(`days.${day}`);
}

function getNoSessionLabel() {
  const lang = state.profile.language || "it";
  return lang === "it" ? "Nessuna sessione." : "No sessions.";
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

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) {
    let message = "Request failed";
    try {
      const body = await response.json();
      message = body.error || message;
    } catch {
      // noop
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
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

function drawTrendChart(exams, targetGpa) {
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
  const localeTag = state.profile.language === "en" ? "en-GB" : "it-IT";
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
  const plan = getStudyPlan();
  studyBoardEl.innerHTML = "";

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
        item.innerHTML = `
          <strong>${session.subject}</strong><br />
          ${session.start} - ${session.end}
          <button class="danger" data-session-id="${session.id}" type="button">${t("study.deleteBtn")}</button>
        `;
        column.appendChild(item);
      });
    }

    studyBoardEl.appendChild(column);
  });
}

function render() {
  const language = state.profile.language;
  document.documentElement.lang = language;
  homeShowPendingBtn.textContent = t("pendingBtn");
  homeShowCompletedBtn.textContent = t("completedBtn");

  const exams = getExams();
  examTableBody.innerHTML = "";
  upcomingTableBody.innerHTML = "";

  exams.forEach((exam) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${exam.subject}</td>
      <td>${exam.credits}</td>
      <td>${exam.grade ?? "-"}</td>
      <td>${exam.examDate || "-"}</td>
      <td>${formatExamStatus(exam.status)}</td>
      <td>${formatDaysRemaining(exam)}</td>
      <td><button data-id="${exam.id}" class="danger">${t("study.deleteBtn")}</button></td>
    `;
    examTableBody.appendChild(tr);
  });

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
  const parts = [];
  if (targetGpa > 0) {
    const neededForFuture = (targetGpa * total - gpa * acquired) / Math.max(1, remaining);
    parts.push(
      t("targetTip", {
        target: targetGpa.toFixed(2),
        needed: neededForFuture.toFixed(2)
      })
    );
  } else {
    parts.push(t("targetPrompt"));
  }

  const graduationAvgTarget = (state.profile.graduationTarget * 30) / 110;
  parts.push(
    t("graduationTip", {
      target: state.profile.graduationTarget.toFixed(1),
      avg: graduationAvgTarget.toFixed(2)
    })
  );
  targetAverageTipEl.textContent = parts.join(" ");

  const completedWithGrade = exams.filter(
    (e) => e.status === "Completed" && Number.isFinite(e.grade)
  );
  if (completedWithGrade.length === 0) {
    trendHelperMessageEl.textContent = t("trendEmpty");
  } else {
    trendHelperMessageEl.textContent = t("trendInfo");
  }
  drawTrendChart(exams, targetGpa);
  renderCalendar(exams);
  renderStudyPlan();
}

examForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const subject = document.getElementById("subject").value.trim();
  const credits = Number(document.getElementById("credits").value);
  const gradeValue = document.getElementById("grade").value;
  const rawGrade = gradeValue === "" ? null : Number(gradeValue);
  const examDate = document.getElementById("exam-date").value;
  const status = document.getElementById("status").value;
  const grade = status === "Completed" ? rawGrade : null;

  if (!subject || !Number.isFinite(credits) || credits <= 0) return;
  if (status === "Completed" && !Number.isFinite(grade)) return;

  try {
    const created = await apiRequest("/api/exams", {
      method: "POST",
      body: JSON.stringify({ subject, credits, grade, examDate, status })
    });
    saveExams([created, ...getExams()]);
    examForm.reset();
    syncGradeInputByStatus();
    render();
  } catch (error) {
    alert(error.message);
  }
});

examTableBody.addEventListener("click", async (event) => {
  const target = event.target;
  if (target.tagName !== "BUTTON") return;
  const id = Number(target.dataset.id);
  if (!Number.isFinite(id)) return;
  try {
    await apiRequest(`/api/exams/${id}`, { method: "DELETE" });
    saveExams(getExams().filter((exam) => exam.id !== id));
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
  const start = document.getElementById("study-start").value;
  const end = document.getElementById("study-end").value;
  if (!subject || !start || !end || start >= end) return;

  const session = {
    id: crypto.randomUUID(),
    day,
    subject,
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
    renderStudyPlan();
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
    renderStudyPlan();
  } catch (error) {
    alert(error.message);
  }
});

clearStudyBtn.addEventListener("click", async () => {
  try {
    await apiRequest("/api/study-sessions", { method: "DELETE" });
    saveStudyPlan([]);
    renderStudyPlan();
  } catch (error) {
    alert(error.message);
  }
});

examStatusInput.addEventListener("change", syncGradeInputByStatus);
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
  } catch (error) {
    alert(error.message);
  }
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedTab = button.dataset.tab;
    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabContents.forEach((content) => content.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(`${selectedTab}-tab`).classList.add("active");
  });
});

simulatorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const targetGpa = Number(document.getElementById("target-gpa").value);
  const nextCredits = Number(document.getElementById("next-credits").value);
  const exams = getExams();

  if (!Number.isFinite(targetGpa) || !Number.isFinite(nextCredits) || nextCredits <= 0) {
    return;
  }

  const completed = exams.filter(
    (e) => e.status === "Completed" && Number.isFinite(e.grade)
  );
  const weighted = completed.reduce((acc, e) => acc + e.grade * e.credits, 0);
  const credits = completed.reduce((acc, e) => acc + e.credits, 0);

  const required = (targetGpa * (credits + nextCredits) - weighted) / nextCredits;

  if (required > 31) {
    simulatorResultEl.textContent = t("manage.simTooHigh");
  } else if (required < 18) {
    simulatorResultEl.textContent = t("manage.simAlreadyThere");
  } else {
    simulatorResultEl.textContent = t("manage.simNeed", { grade: required.toFixed(2) });
  }
});

setDeviceMode();
syncGradeInputByStatus();
async function initializeApp() {
  try {
    const data = await apiRequest("/api/bootstrap");
    state.exams = (data.exams || []).map((exam) => ({
      ...exam,
      status: normalizeExamStatus(exam.status)
    }));
    state.studyPlan = (data.studyPlan || []).map((session) => ({
      ...session,
      day: normalizeStudyDay(session.day)
    }));
    state.targetGpa = Number.isFinite(data.targetGpa) ? data.targetGpa : 0;
    state.profile = data.profile ? { ...DEFAULT_PROFILE, ...data.profile } : { ...DEFAULT_PROFILE };
    if (!["it", "en"].includes(state.profile.language)) {
      state.profile.language = DEFAULT_PROFILE.language;
    }
    await initI18n(state.profile.language);
    document.documentElement.lang = state.profile.language;
    translateStaticUi();
    syncProfileInputs();
    applyTheme(getCurrentTheme());
    setupDateTimePickers();
    render();
  } catch (error) {
    alert(i18nReady ? t("loadError", { message: error.message }) : error.message);
  }
}

initializeApp();
window.addEventListener("resize", () => {
  setDeviceMode();
  drawTrendChart(getExams(), getTargetGpa());
});
