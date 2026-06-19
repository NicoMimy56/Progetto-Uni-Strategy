/**
 * @file js/academic.js
 *
 * Funzioni pure (senza lettura di `state` o `document`) per calcoli sul piano di studi.
 * Separarle facilita:
 * - capire la formula della media senza scorrere l'interfaccia;
 * - riusare le stesse formule in test automatici o in un worker;
 * - tenere `app.js` focalizzato su DOM e flussi.
 *
 * Scala voti: sistema italiano universitario tipico 18–30 (eventuale lode trattata come 31
 * in alcuni contesti; `simulatedGpa` e le validazioni server accettano fino a 31).
 */

/**
 * Media ponderata degli esami già superati con voto numerico valido.
 * Esclude: esami non `Completed`, o `Completed` senza `grade` numerico.
 *
 * Formula: Σ(voto × CFU) / Σ(CFU) sul sottoinsieme filtrato.
 *
 * @param {Array<{ status: string, grade?: number|null, credits: number }>} exams
 * @returns {number} media ponderata oppure 0 se denominatore nullo (nessun CFU conta).
 */
export function weightedGpa(exams) {
  const completed = exams.filter((e) => e.status === "Completed" && Number.isFinite(e.grade));
  const weighted = completed.reduce((acc, e) => acc + e.grade * e.credits, 0);
  const credits = completed.reduce((acc, e) => acc + e.credits, 0);
  return credits > 0 ? weighted / credits : 0;
}

/**
 * Media ipotetica che mescola:
 * - esami realmente superati (come `weightedGpa`);
 * - righe del simulatore, con voti pianificati e CFU dichiarati.
 *
 * Serve alla UI per mostrare “se passassi anche questi con voto X la media sarebbe Y”.
 * Non altera il database degli esami veri finché l'utente non li inserisce come Completed.
 *
 * @param {Array} exams lista esami utente (`state.exams`)
 * @param {Array<{ plannedGrade: number, credits: number }>} simulatedExams
 * @returns {number}
 */
export function simulatedGpa(exams, simulatedExams) {
  const completed = exams.filter((e) => e.status === "Completed" && Number.isFinite(e.grade));
  const weightedReal = completed.reduce((acc, e) => acc + e.grade * e.credits, 0);
  const creditsReal = completed.reduce((acc, e) => acc + e.credits, 0);
  const weightedSim = simulatedExams.reduce((acc, e) => acc + e.plannedGrade * e.credits, 0);
  const creditsSim = simulatedExams.reduce((acc, e) => acc + e.credits, 0);
  const totalCredits = creditsReal + creditsSim;
  return totalCredits > 0 ? (weightedReal + weightedSim) / totalCredits : 0;
}

/**
 * Differenza in giorni di calendario tra «oggi» (mezzanotte locale) e una data ISO `YYYY-MM-DD`.
 *
 * Attenzione: `new Date("YYYY-MM-DD")` è interpretato come UTC in molti motori; poi `setHours(0…)`
 * sposta nella timezone locale. Per gli esami salvati solo come data senza ora è il compromesso usuale.
 *
 * @param {string|null|undefined} dateStr
 * @returns {number|string} intero giorni (può essere negativo se data passata) oppure "-" se input assente
 */
export function daysRemaining(dateStr) {
  if (!dateStr) return "-";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

/**
 * UUID lato client per nuove sessioni studio. Su HTTP (LAN/Tailscale) `crypto.randomUUID`
 * non è disponibile: si usa un fallback compatibile.
 * @returns {string}
 */
export function generateClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      /* contesto non sicuro (es. http://100.x.x.x) */
    }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
