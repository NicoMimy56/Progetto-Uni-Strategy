/**
 * @file server/calendarReminderMail.js
 *
 * Email promemoria calendario nella lingua scelta in Impostazioni (`profile.language`).
 */
const { sendTransactionalEmail } = require("./featureRequestMail");
const { t, formatLocalizedDate, examStatusLabel, normalizeLanguage } = require("./calendarReminderI18n");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapEmailBox(innerHtml, language) {
  const lang = normalizeLanguage(language);
  const footer = escapeHtml(t(lang, "calendarReminders.footer"));
  return `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;padding:28px;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
    ${innerHtml}
    <p style="margin:24px 0 0;font-size:12px;color:#64748b;">${footer}</p>
  </div>
</body>
</html>`.trim();
}

/**
 * @param {{ toEmail: string, language: string, exams: Array<{ subject: string, credits: number, examDate: string, status: string }> }} opts
 */
async function sendExamImminentEmail({ toEmail, language, exams }) {
  const lang = normalizeLanguage(language);
  const labelSubject = escapeHtml(t(lang, "calendarReminders.labelSubject"));
  const labelCredits = escapeHtml(t(lang, "calendarReminders.labelCredits"));
  const labelExamDate = escapeHtml(t(lang, "calendarReminders.labelExamDate"));
  const labelStatus = escapeHtml(t(lang, "calendarReminders.labelStatus"));

  const examBlocks = exams
    .map(
      (exam) => `
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0 0;font-size:14px;">
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;width:38%;">${labelSubject}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;">${escapeHtml(exam.subject)}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;">${labelCredits}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${escapeHtml(exam.credits)}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;">${labelExamDate}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${escapeHtml(formatLocalizedDate(exam.examDate, lang))}</td></tr>
          <tr><td style="padding:8px 12px;color:#64748b;">${labelStatus}</td><td style="padding:8px 12px;">${escapeHtml(examStatusLabel(exam.status, lang))}</td></tr>
        </table>`
    )
    .join("");

  const intro =
    exams.length === 1
      ? t(lang, "calendarReminders.examIntroOne")
      : t(lang, "calendarReminders.examIntroMany", { count: exams.length });

  const subject = t(lang, "calendarReminders.examSubject");
  const greeting = escapeHtml(t(lang, "calendarReminders.greeting"));
  const detailsTitle = escapeHtml(t(lang, "calendarReminders.examDetailsTitle"));
  const closing = escapeHtml(t(lang, "calendarReminders.examClosing"));

  const html = wrapEmailBox(
    `
    <h1 style="margin:0 0 8px;font-size:20px;color:#1e3a8a;">${escapeHtml(subject)}</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.5;">${greeting}</p>
    <p style="margin:0;font-size:15px;line-height:1.6;">${escapeHtml(intro)}</p>
    <div style="margin-top:20px;padding:16px 18px;background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.04em;">${detailsTitle}</p>
      ${examBlocks}
    </div>
    <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#334155;">${closing}</p>
  `,
    lang
  );

  const textLines = [
    subject,
    "",
    t(lang, "calendarReminders.greeting"),
    "",
    intro,
    "",
    ...exams.flatMap((exam) => [
      `${t(lang, "calendarReminders.labelSubject")}: ${exam.subject}`,
      `${t(lang, "calendarReminders.labelCredits")}: ${exam.credits}`,
      `${t(lang, "calendarReminders.labelExamDate")}: ${formatLocalizedDate(exam.examDate, lang)}`,
      `${t(lang, "calendarReminders.labelStatus")}: ${examStatusLabel(exam.status, lang)}`,
      ""
    ]),
    t(lang, "calendarReminders.examClosing")
  ];

  return sendTransactionalEmail({
    to: toEmail,
    subject,
    html,
    text: textLines.join("\n")
  });
}

/**
 * @param {{ toEmail: string, language: string, sessions: Array<{ subject: string, description: string, start: string, end: string }>, todayIso: string }} opts
 */
async function sendDailyTasksEmail({ toEmail, language, sessions, todayIso }) {
  const lang = normalizeLanguage(language);
  const formattedDate = formatLocalizedDate(todayIso, lang);
  const emptyDesc = t(lang, "calendarReminders.emptyDescription");

  const rows = sessions
    .map(
      (s) => `
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;">${escapeHtml(s.subject)}</td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;">${escapeHtml(s.description || emptyDesc)}</td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;white-space:nowrap;">${escapeHtml(s.start)} – ${escapeHtml(s.end)}</td>
      </tr>`
    )
    .join("");

  const intro =
    sessions.length === 1
      ? t(lang, "calendarReminders.dailyIntroOne", { date: formattedDate })
      : t(lang, "calendarReminders.dailyIntroMany", { date: formattedDate, count: sessions.length });

  const subject = t(lang, "calendarReminders.dailySubject");
  const greeting = escapeHtml(t(lang, "calendarReminders.greeting"));
  const closing = escapeHtml(t(lang, "calendarReminders.dailyClosing"));
  const thSubject = escapeHtml(t(lang, "calendarReminders.tableSubject"));
  const thDescription = escapeHtml(t(lang, "calendarReminders.tableDescription"));
  const thTime = escapeHtml(t(lang, "calendarReminders.tableTime"));

  const html = wrapEmailBox(
    `
    <h1 style="margin:0 0 8px;font-size:20px;color:#1e3a8a;">${escapeHtml(subject)}</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.5;">${greeting}</p>
    <p style="margin:0;font-size:15px;line-height:1.6;">${escapeHtml(intro)}</p>
    <div style="margin-top:20px;padding:16px 18px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;overflow-x:auto;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;background:#fff;">
        <thead>
          <tr style="background:#ecfdf5;">
            <th style="padding:10px 12px;border:1px solid #e2e8f0;text-align:left;color:#166534;">${thSubject}</th>
            <th style="padding:10px 12px;border:1px solid #e2e8f0;text-align:left;color:#166534;">${thDescription}</th>
            <th style="padding:10px 12px;border:1px solid #e2e8f0;text-align:left;color:#166534;">${thTime}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#334155;">${closing}</p>
  `,
    lang
  );

  const text = [
    subject,
    "",
    intro,
    "",
    ...sessions.map(
      (s) =>
        `${s.start}–${s.end} | ${s.subject}${s.description ? ` — ${s.description}` : ""}`
    ),
    "",
    t(lang, "calendarReminders.dailyClosing")
  ].join("\n");

  return sendTransactionalEmail({
    to: toEmail,
    subject,
    html,
    text
  });
}

module.exports = { sendExamImminentEmail, sendDailyTasksEmail };
