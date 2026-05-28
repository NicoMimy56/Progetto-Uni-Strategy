/**
 * @file js/dom.js
 *
 * Cache centralizzata dei riferimenti agli elementi HTML usati da `app.js`.
 *
 * Perché esiste questo file:
 * - evita decine di `document.getElementById` sparsi e riduce errori di typo negli ID;
 * - documenta in un colpo solo quali ID devono esistere in `index.html` perché l'app funzioni;
 * - l'entry `app.js` resta più leggibile (`examForm` vs `document.getElementById("exam-form")`).
 *
 * Il modulo viene valutato dopo che il parser HTML ha costruito il DOM (script in fondo al `<body>`),
 * quindi `getElementById` non è null per gli elementi presenti nel markup. Se un ID manca, il valore
 * sarà `null` e il primo accesso genererà un’eccezione, così in sviluppo si individua subito un ID mancante nel markup.
 *
 * Convenzione nomi: suffisso `El` per singoli elementi, `Body` per `<tbody>`, collezioni `querySelectorAll`.
 */

/* --- Form e tabelle Gestione / Home / Simulatore --- */
export const examForm = document.getElementById("exam-form");
export const simulatorForm = document.getElementById("simulator-form");
export const examTableBody = document.getElementById("exam-table-body");
export const simTableBody = document.getElementById("sim-table-body");
export const upcomingTableBody = document.getElementById("upcoming-table-body");

/* --- Metriche Home (media, CFU, grafico ad anello CSS conic-gradient) --- */
export const gpaEl = document.getElementById("gpa");
export const acquiredCreditsEl = document.getElementById("acquired-credits");
export const pendingCreditsEl = document.getElementById("pending-credits");
export const pendingCreditsRowEl = document.getElementById("pending-credits-row");
export const totalCreditsEl = document.getElementById("total-credits");
export const totalCreditsInlineEl = document.getElementById("total-credits-inline");
export const remainingCreditsEl = document.getElementById("remaining-credits");
export const projectedCreditsTotalEl = document.getElementById("projected-credits-total");
export const creditsProjectedRowEl = document.getElementById("credits-projected-row");
export const creditsChartEl = document.getElementById("credits-chart");
export const creditsPercentageEl = document.getElementById("credits-percentage");
export const creditsPercentageProjectedEl = document.getElementById("credits-percentage-projected");
export const simulatorResultEl = document.getElementById("simulator-result");

/* --- Pulsanti clear / utility --- */
export const clearSimBtn = document.getElementById("clear-sim-btn");
export const clearBtn = document.getElementById("clear-btn");
export const clearExamFormBtn = document.getElementById("clear-exam-form-btn");

/* --- Andamento media (canvas 2D) e copy associata --- */
export const trendChartEl = document.getElementById("trend-chart");
export const targetAverageHomeEl = document.getElementById("target-average-home");
export const targetAverageTipEl = document.getElementById("target-average-tip");
export const graduationAverageTipEl = document.getElementById("graduation-average-tip");
export const trendHelperMessageEl = document.getElementById("trend-helper-message");

/* --- Calendario esami --- */
export const prevMonthBtn = document.getElementById("prev-month");
export const nextMonthBtn = document.getElementById("next-month");
export const calendarTitleEl = document.getElementById("calendar-title");
export const calendarGridEl = document.getElementById("calendar-grid");

/* --- Piano studio (form + board + anteprima Home) --- */
export const studyForm = document.getElementById("study-form");
export const studyBoardEl = document.getElementById("study-board");
export const homeStudyBoardEl = document.getElementById("home-study-board");
export const clearStudyBtn = document.getElementById("clear-study-btn");
export const studyDateInput = document.getElementById("study-date");
export const prevStudyMonthBtn = document.getElementById("prev-study-month");
export const nextStudyMonthBtn = document.getElementById("next-study-month");
export const studyMonthTitleEl = document.getElementById("study-month-title");
export const studyFilterWrapEl = document.getElementById("study-filter-wrap");
export const studyFilterMonthBtn = document.getElementById("study-filter-month");
export const studyFilterAllBtn = document.getElementById("study-filter-all");

/* --- Navigazione tab principale --- */
export const tabButtons = document.querySelectorAll(".tab-btn");
export const tabContents = document.querySelectorAll(".tab-content");

/*
 * Home — tabella esami compatta: filtri pending/completed + (solo completati) gruppo chip ordinamento `[data-home-sort]`.
 */
export const homeShowPendingBtn = document.getElementById("home-show-pending");
export const homeShowCompletedBtn = document.getElementById("home-show-completed");
export const homeCompletedSortWrap = document.getElementById("home-completed-sort-wrap");

/* --- Form "nuovo esame": voto, stato, data (flatpickr incollato su examDateInput) --- */
export const examGradeInput = document.getElementById("grade");
export const examStatusInput = document.getElementById("status");
export const examDateInput = document.getElementById("exam-date");

/* --- Orari sessione studio (picker custom + stringhe HH:MM) --- */
export const studyStartInput = document.getElementById("study-start");
export const studyEndInput = document.getElementById("study-end");

/* --- Impostazioni: card con tile grado/tema/lingua e CFU --- */
export const settingsTabEl = document.getElementById("settings-tab");
export const totalCfuInput = document.getElementById("total-cfu-input");
export const graduationTargetInput = document.getElementById("graduation-target-input");
export const saveSettingsBtn = document.getElementById("save-settings-btn");
export const settingsSavedToastEl = document.getElementById("settings-saved-toast");

/* --- Autenticazione: maschera login vs shell app --- */
export const authViewEl = document.getElementById("auth-view");
export const appShellEl = document.getElementById("app-shell");
export const authStatusEl = document.getElementById("auth-status");
export const authLoginTabBtn = document.getElementById("auth-login-tab");
export const authRegisterTabBtn = document.getElementById("auth-register-tab");
export const authLoginForm = document.getElementById("auth-login-form");
export const authRegisterForm = document.getElementById("auth-register-form");
export const logoutBtn = document.getElementById("logout-btn");

export const authResendWrap = document.getElementById("auth-resend-wrap");
export const authResendBtn = document.getElementById("auth-resend-btn");
