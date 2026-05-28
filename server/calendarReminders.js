/**
 * @file server/calendarReminders.js
 *
 * Scheduler promemoria calendario:
 * - Esami con data domani → email il giorno prima (oggetto «ESAME IMMINENTE»).
 * - Sessioni piano studio di oggi → email il giorno stesso (oggetto «COSE DA FARE OGGI»).
 *
 * Variabili opzionali in `.env`:
 * - `CALENDAR_REMINDER_HOUR` — ora locale (0–23) in cui inviare; default 8.
 * - `CALENDAR_REMINDER_DISABLED` — se `true`, lo scheduler non parte.
 */
const { db } = require("./database");
const { toExamRow, toStudyRow } = require("./mappers");
const { sendExamImminentEmail, sendDailyTasksEmail } = require("./calendarReminderMail");
const { getUserLanguage } = require("./calendarReminderI18n");

const REMINDER_TYPES = {
  examImminent: "exam_imminent",
  dailyTasks: "daily_tasks"
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getLocalIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToIso(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return getLocalIsoDate(d);
}

function getTodayWeekdayName(date = new Date()) {
  return WEEKDAYS[date.getDay()];
}

function getReminderHour() {
  const raw = Number(process.env.CALENDAR_REMINDER_HOUR);
  if (Number.isFinite(raw) && raw >= 0 && raw <= 23) return Math.floor(raw);
  return 8;
}

function wasReminderSent(userId, reminderType, referenceDate) {
  const row = db
    .prepare(
      `SELECT 1 FROM calendar_reminder_log
       WHERE user_id = ? AND reminder_type = ? AND reference_date = ?`
    )
    .get(userId, reminderType, referenceDate);
  return Boolean(row);
}

function markReminderSent(userId, reminderType, referenceDate) {
  db.prepare(
    `INSERT OR IGNORE INTO calendar_reminder_log (user_id, reminder_type, reference_date)
     VALUES (?, ?, ?)`
  ).run(userId, reminderType, referenceDate);
}

function getVerifiedUsers() {
  return db
    .prepare("SELECT id, email FROM users WHERE email_verified_at IS NOT NULL")
    .all();
}

function getExamsForDate(userId, isoDate) {
  return db
    .prepare(
      `SELECT * FROM exams
       WHERE user_id = ? AND exam_date = ? AND status != 'Completed'`
    )
    .all(userId, isoDate)
    .map(toExamRow);
}

function getStudySessionsForToday(userId, todayIso, weekdayName) {
  const rows = db
    .prepare(
      `SELECT * FROM study_sessions
       WHERE user_id = ?
         AND (
           session_date = ?
           OR (session_date IS NULL AND day = ?)
         )
       ORDER BY start_time`
    )
    .all(userId, todayIso, weekdayName);
  return rows.map(toStudyRow);
}

async function processExamReminders(tomorrowIso) {
  const users = getVerifiedUsers();
  for (const user of users) {
    const exams = getExamsForDate(user.id, tomorrowIso);
    if (!exams.length) continue;
    if (wasReminderSent(user.id, REMINDER_TYPES.examImminent, tomorrowIso)) continue;

    const language = getUserLanguage(user.id);
    const result = await sendExamImminentEmail({ toEmail: user.email, language, exams });
    if (result.sent) {
      markReminderSent(user.id, REMINDER_TYPES.examImminent, tomorrowIso);
      console.log(
        `[calendar-reminders] ESAME IMMINENTE → ${user.email} (${exams.length} esame/i per ${tomorrowIso})`
      );
    }
  }
}

async function processDailyTaskReminders(todayIso, weekdayName) {
  const users = getVerifiedUsers();
  for (const user of users) {
    const sessions = getStudySessionsForToday(user.id, todayIso, weekdayName);
    if (!sessions.length) continue;
    if (wasReminderSent(user.id, REMINDER_TYPES.dailyTasks, todayIso)) continue;

    const language = getUserLanguage(user.id);
    const result = await sendDailyTasksEmail({
      toEmail: user.email,
      language,
      sessions,
      todayIso
    });
    if (result.sent) {
      markReminderSent(user.id, REMINDER_TYPES.dailyTasks, todayIso);
      console.log(
        `[calendar-reminders] COSE DA FARE OGGI → ${user.email} (${sessions.length} attività)`
      );
    }
  }
}

/** Esegue un ciclo completo (esami domani + attività oggi). Utile per test manuali. */
async function runCalendarRemindersNow() {
  const now = new Date();
  const todayIso = getLocalIsoDate(now);
  const tomorrowIso = addDaysToIso(todayIso, 1);
  const weekdayName = getTodayWeekdayName(now);
  await processExamReminders(tomorrowIso);
  await processDailyTaskReminders(todayIso, weekdayName);
}

let lastRunDateKey = "";

async function tickCalendarReminders() {
  const now = new Date();
  const todayIso = getLocalIsoDate(now);
  const hour = now.getHours();
  const targetHour = getReminderHour();

  if (hour !== targetHour) return;
  const runKey = `${todayIso}@${targetHour}`;
  if (lastRunDateKey === runKey) return;
  lastRunDateKey = runKey;

  const tomorrowIso = addDaysToIso(todayIso, 1);
  const weekdayName = getTodayWeekdayName(now);
  console.log(`[calendar-reminders] Avvio invio promemoria (${todayIso}, ore ${targetHour})`);
  await processExamReminders(tomorrowIso);
  await processDailyTaskReminders(todayIso, weekdayName);
}

function startCalendarReminderScheduler() {
  if (String(process.env.CALENDAR_REMINDER_DISABLED || "").toLowerCase() === "true") {
    console.log("[calendar-reminders] Disabilitato (CALENDAR_REMINDER_DISABLED=true)");
    return;
  }
  const hour = getReminderHour();
  console.log(`[calendar-reminders] Scheduler attivo — invio alle ${hour}:00 (ora locale server)`);
  tickCalendarReminders().catch((err) => {
    console.error("[calendar-reminders] Errore nel tick iniziale:", err);
  });
  setInterval(() => {
    tickCalendarReminders().catch((err) => {
      console.error("[calendar-reminders] Errore scheduler:", err);
    });
  }, 60 * 1000);
}

module.exports = {
  startCalendarReminderScheduler,
  runCalendarRemindersNow,
  getLocalIsoDate,
  addDaysToIso
};
