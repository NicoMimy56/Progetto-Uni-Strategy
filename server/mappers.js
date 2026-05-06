/**
 * @file server/mappers.js
 *
 * Adattatori tra il modello dati del database SQLite e il contratto JSON del client.
 *
 * Convenzioni:
 * - In SQLite le colonne seguono spesso lo stile `snake_case` (`exam_date`, `planned_grade`).
 * - Il frontend JavaScript usa `camelCase` (`examDate`, `plannedGrade`) per comodità e coerenza con JSON.
 *
 * Ogni funzione qui è pura (nessun side effect): riceve un oggetto riga e restituisce un POJO
 * serializzabile in risposta HTTP. Se aggiungi colonne al DB, aggiorna sia lo schema in
 * `database.js` sia i mapper corrispondenti.
 */

/**
 * Trasforma una riga della tabella `exams`.
 * @param {object} row risultato di better-sqlite3 (.get / .all)
 * @returns {{ id: number, subject: string, credits: number, grade: number|null, examDate: string|null, status: string }}
 */
function toExamRow(row) {
  return {
    id: row.id,
    subject: row.subject,
    credits: row.credits,
    grade: row.grade,
    examDate: row.exam_date,
    status: row.status
  };
}

/**
 * Trasforma una riga della tabella `study_sessions`.
 * `start` / `end` sono stringhe orario come salvate dal client (es. "09:00").
 * @param {object} row
 * @returns {{ id: string, day: string, subject: string, description: string, start: string, end: string }}
 */
function toStudyRow(row) {
  return {
    id: row.id,
    day: row.day,
    subject: row.subject,
    description: row.description || "",
    start: row.start_time,
    end: row.end_time
  };
}

/**
 * Trasforma una riga della tabella `simulated_exams` (simulatore "what-if" sul piano di studi).
 * @param {object} row
 * @returns {{ id: number, subject: string, credits: number, plannedGrade: number }}
 */
function toSimulatedExamRow(row) {
  return {
    id: row.id,
    subject: row.subject,
    credits: row.credits,
    plannedGrade: row.planned_grade
  };
}

module.exports = { toExamRow, toStudyRow, toSimulatedExamRow };
