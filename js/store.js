/**
 * @file js/store.js
 *
 * Stato aggiornato manualmente dopo ogni mutazione: non usiamo framework (React/Vue), quindi
 * dopo ogni `apiRequest` che modifica dati il codice chiama `render()` per ricalcolare il DOM.
 *
 * `state` contiene dati serializzabili in JSON inviati o ricevuti dal server.
 * `studyTimePickerState` e `ui` contengono riferimenti a nodi DOM o a timer che non vanno serializzati verso il backend.
 * `currentCalendarDate` è un `Date` mutabile: la navigazione mese solamente aggiorna questo oggetto
 * e richiama `renderCalendar` senza toccare il server.
 */
import { DEFAULT_PROFILE } from "./constants.js";

/**
 * Snapshot applicativo principale. Tutti i campi sono aggiornati da:
 * - `loadAppData()` (GET /api/bootstrap);
 * - handler di form / click che chiamano API e poi `saveExams` ecc.
 *
 * @property {Array<object>} exams
 * @property {Array<object>} studyPlan sessioni `study-sessions`
 * @property {Array<object>} simulatedExams righe simulatore
 * @property {number} targetGpa obiettivo media /30 (0 = non impostato)
 * @property {object} profile vedi DEFAULT_PROFILE + campi server
 * @property {"pending"|"completed"} homeExamFilter filtra la tabella compatta esami in Home (da sostenere vs completati)
 * @property {"dateAsc"|"dateDesc"|"gradeDesc"|"gradeAsc"} homeCompletedSort ordine righe applicato unicamente se `homeExamFilter === "completed"`; scelto dai chip `[data-home-sort]`, non persistito sul server
 * @property {number|null} editingExamId id esame in modifica inline in Gestione, o null
 */
export const state = {
  exams: [],
  studyPlan: [],
  simulatedExams: [],
  targetGpa: 0,
  profile: { ...DEFAULT_PROFILE },
  homeExamFilter: "pending",
  homeCompletedSort: "dateAsc",
  editingExamId: null
};

/**
 * Stato UI del popover orario (Piano studio). `panel` è il `div` creato dinamicamente in `setupStudyTimePicker`.
 * Quando l'utente seleziona un campo ora, `activeInput` punta al relativo `<input>`.
 */
export const studyTimePickerState = {
  panel: null,
  activeInput: null,
  hourSelect: null,
  minuteSelect: null,
  hourHand: null,
  minuteHand: null,
  valueLabel: null
};

/**
 * Timer e identificativi che non appartengono al dominio "esami" ma servono all'interfaccia.
 * - `settingsToastTimer`: timeout per nascondere il toast "Impostazioni salvate"
 * - `authMode`: quale form auth è visibile (viene scritto ma oggi la UI usa classi hidden sui form)
 * - `trendRafId`: handle `requestAnimationFrame` per evitare più disegni canvas sovrapposti
 */
export const ui = {
  settingsToastTimer: null,
  authMode: "login",
  trendRafId: null
};

/** Mese del calendario mostrato in UI: mutare `currentCalendarDate` (es. dai pulsanti mese in `app.js`), poi `renderCalendar`. */
export const currentCalendarDate = new Date();

/** Valore obiettivo media /30 in `state.targetGpa`; `NaN` viene trattato come 0. */
export function getTargetGpa() {
  return Number.isFinite(state.targetGpa) ? state.targetGpa : 0;
}

export function getExams() {
  return state.exams;
}

export function saveExams(exams) {
  state.exams = exams;
}

export function getStudyPlan() {
  return state.studyPlan;
}

export function saveStudyPlan(plan) {
  state.studyPlan = plan;
}

export function getSimulatedExams() {
  return state.simulatedExams;
}

export function saveSimulatedExams(list) {
  state.simulatedExams = list;
}
