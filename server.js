const path = require("path");
const Database = require("better-sqlite3");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database(path.join(__dirname, "unistrategy.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    credits INTEGER NOT NULL,
    grade REAL,
    exam_date TEXT,
    status TEXT NOT NULL CHECK(status IN ('To Take', 'In Preparation', 'Completed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS study_sessions (
    id TEXT PRIMARY KEY,
    day TEXT NOT NULL,
    subject TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

app.use(express.json());
app.use(
  "/vendor/i18next",
  express.static(path.join(__dirname, "node_modules/i18next/dist/umd"))
);
app.use(express.static(__dirname));

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

function toStudyRow(row) {
  return {
    id: row.id,
    day: row.day,
    subject: row.subject,
    start: row.start_time,
    end: row.end_time
  };
}

app.get("/api/bootstrap", (_req, res) => {
  const exams = db.prepare("SELECT * FROM exams ORDER BY id DESC").all().map(toExamRow);
  const studyPlan = db
    .prepare("SELECT * FROM study_sessions ORDER BY day, start_time")
    .all()
    .map(toStudyRow);
  const targetRow = db.prepare("SELECT value FROM settings WHERE key = 'target_gpa'").get();
  const targetGpa = targetRow ? Number(targetRow.value) : 0;
  const profileRow = db.prepare("SELECT value FROM settings WHERE key = 'profile'").get();
  let profile = null;
  if (profileRow) {
    try {
      profile = JSON.parse(profileRow.value);
    } catch {
      profile = null;
    }
  }

  res.json({ exams, studyPlan, targetGpa, profile });
});

app.post("/api/exams", (req, res) => {
  const { subject, credits, grade, examDate, status } = req.body;
  if (!subject || !Number.isFinite(credits) || credits <= 0) {
    return res.status(400).json({ error: "Invalid subject or credits." });
  }
  if (!["To Take", "In Preparation", "Completed"].includes(status)) {
    return res.status(400).json({ error: "Invalid exam status." });
  }

  const safeGrade = status === "Completed" && Number.isFinite(grade) ? grade : null;
  if (status === "Completed" && safeGrade === null) {
    return res.status(400).json({ error: "Completed exam requires a grade." });
  }

  const result = db
    .prepare(
      `INSERT INTO exams (subject, credits, grade, exam_date, status)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(subject.trim(), credits, safeGrade, examDate || null, status);

  const inserted = db.prepare("SELECT * FROM exams WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json(toExamRow(inserted));
});

app.delete("/api/exams/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid exam id." });
  }
  db.prepare("DELETE FROM exams WHERE id = ?").run(id);
  return res.status(204).send();
});

app.delete("/api/exams", (_req, res) => {
  db.prepare("DELETE FROM exams").run();
  res.status(204).send();
});

app.post("/api/study-sessions", (req, res) => {
  const { id, day, subject, start, end } = req.body;
  if (!id || !day || !subject || !start || !end) {
    return res.status(400).json({ error: "Missing study session fields." });
  }
  if (start >= end) {
    return res.status(400).json({ error: "Start time must be before end time." });
  }

  db.prepare(
    `INSERT INTO study_sessions (id, day, subject, start_time, end_time)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, day, subject.trim(), start, end);

  const inserted = db.prepare("SELECT * FROM study_sessions WHERE id = ?").get(id);
  return res.status(201).json(toStudyRow(inserted));
});

app.delete("/api/study-sessions/:id", (req, res) => {
  db.prepare("DELETE FROM study_sessions WHERE id = ?").run(req.params.id);
  res.status(204).send();
});

app.delete("/api/study-sessions", (_req, res) => {
  db.prepare("DELETE FROM study_sessions").run();
  res.status(204).send();
});

app.put("/api/settings/target-gpa", (req, res) => {
  const { value } = req.body;
  if (value === null || value === "") {
    db.prepare("DELETE FROM settings WHERE key = 'target_gpa'").run();
    return res.json({ targetGpa: 0 });
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 18 || numeric > 31) {
    return res.status(400).json({ error: "Target GPA must be between 18 and 31." });
  }
  db.prepare(
    `INSERT INTO settings (key, value)
     VALUES ('target_gpa', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(String(numeric));
  return res.json({ targetGpa: numeric });
});

app.put("/api/settings/profile", (req, res) => {
  const { profile } = req.body;
  if (!profile || typeof profile !== "object") {
    return res.status(400).json({ error: "Invalid profile payload." });
  }
  const allowedLanguages = ["it", "en"];
  const allowedThemePresets = ["classic", "forest", "sunset", "dark"];
  const allowedDegreePaths = ["bachelor", "master", "postgraduate", "custom"];
  if (!allowedLanguages.includes(profile.language)) {
    return res.status(400).json({ error: "Invalid language." });
  }
  if (!allowedThemePresets.includes(profile.themePreset)) {
    return res.status(400).json({ error: "Invalid theme preset." });
  }
  if (!allowedDegreePaths.includes(profile.degreePath)) {
    return res.status(400).json({ error: "Invalid degree path." });
  }
  if (!Number.isFinite(profile.totalCfu) || profile.totalCfu <= 0) {
    return res.status(400).json({ error: "Invalid total CFU." });
  }
  if (!Number.isFinite(profile.graduationTarget) || profile.graduationTarget < 66 || profile.graduationTarget > 110) {
    return res.status(400).json({ error: "Invalid graduation target." });
  }

  db.prepare(
    `INSERT INTO settings (key, value)
     VALUES ('profile', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(JSON.stringify(profile));

  return res.json({ profile });
});

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Uni-Strategy server running on http://localhost:${PORT}`);
});
