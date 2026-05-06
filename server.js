const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const COOKIE_NAME = "unistrategy_sid";

const db = new Database(path.join(__dirname, "unistrategy.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    subject TEXT NOT NULL,
    credits INTEGER NOT NULL,
    grade REAL,
    exam_date TEXT,
    status TEXT NOT NULL CHECK(status IN ('To Take', 'In Preparation', 'Completed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS study_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    day TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY(user_id, key),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

function hasColumn(tableName, columnName) {
  return db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .some((column) => column.name === columnName);
}

if (!hasColumn("study_sessions", "description")) {
  db.exec("ALTER TABLE study_sessions ADD COLUMN description TEXT");
}
if (!hasColumn("exams", "user_id")) {
  db.exec("ALTER TABLE exams ADD COLUMN user_id INTEGER");
}
if (!hasColumn("study_sessions", "user_id")) {
  db.exec("ALTER TABLE study_sessions ADD COLUMN user_id INTEGER");
}

app.use(express.json());
app.use(
  "/vendor/i18next",
  express.static(path.join(__dirname, "node_modules/i18next/dist/umd"))
);
app.use(express.static(__dirname));

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce((acc, item) => {
    const [key, ...rest] = item.trim().split("=");
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function setSessionCookie(res, token) {
  const maxAge = SESSION_TTL_MS / 1000;
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Max-Age=${maxAge}; HttpOnly; Path=/; SameSite=Lax`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Max-Age=0; HttpOnly; Path=/; SameSite=Lax`
  );
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.prepare(
    `INSERT INTO user_sessions (token, user_id, expires_at)
     VALUES (?, ?, ?)`
  ).run(token, userId, expiresAt);
  return token;
}

function getSessionUser(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT users.id, users.email, user_sessions.expires_at
       FROM user_sessions
       JOIN users ON users.id = user_sessions.user_id
       WHERE user_sessions.token = ?`
    )
    .get(token);
  if (!row) return null;
  if (row.expires_at <= Date.now()) {
    db.prepare("DELETE FROM user_sessions WHERE token = ?").run(token);
    return null;
  }
  return { id: row.id, email: row.email, token };
}

function requireAuth(req, res, next) {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  req.user = user;
  return next();
}

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
    description: row.description || "",
    start: row.start_time,
    end: row.end_time
  };
}

app.post("/api/auth/register", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!email.includes("@") || password.length < 6) {
    return res.status(400).json({ error: "Email or password invalid." });
  }
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) {
    return res.status(409).json({ error: "Email already registered." });
  }
  const { salt, hash } = hashPassword(password);
  const result = db
    .prepare(
      `INSERT INTO users (email, password_hash, password_salt)
       VALUES (?, ?, ?)`
    )
    .run(email, hash, salt);
  const userId = Number(result.lastInsertRowid);
  const token = createSession(userId);
  setSessionCookie(res, token);
  return res.status(201).json({ user: { id: userId, email } });
});

app.post("/api/auth/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = db
    .prepare("SELECT id, email, password_hash, password_salt FROM users WHERE email = ?")
    .get(email);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials." });
  }
  const { hash } = hashPassword(password, user.password_salt);
  if (hash !== user.password_hash) {
    return res.status(401).json({ error: "Invalid credentials." });
  }
  const token = createSession(user.id);
  setSessionCookie(res, token);
  return res.json({ user: { id: user.id, email: user.email } });
});

app.post("/api/auth/logout", (req, res) => {
  const user = getSessionUser(req);
  if (user) {
    db.prepare("DELETE FROM user_sessions WHERE token = ?").run(user.token);
  }
  clearSessionCookie(res);
  return res.status(204).send();
});

app.get("/api/auth/me", (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  return res.json({ user: { id: user.id, email: user.email } });
});

app.get("/api/bootstrap", requireAuth, (req, res) => {
  const exams = db
    .prepare("SELECT * FROM exams WHERE user_id = ? ORDER BY id DESC")
    .all(req.user.id)
    .map(toExamRow);
  const studyPlan = db
    .prepare("SELECT * FROM study_sessions WHERE user_id = ? ORDER BY day, start_time")
    .all(req.user.id)
    .map(toStudyRow);
  const targetRow = db
    .prepare("SELECT value FROM user_settings WHERE user_id = ? AND key = 'target_gpa'")
    .get(req.user.id);
  const targetGpa = targetRow ? Number(targetRow.value) : 0;
  const profileRow = db
    .prepare("SELECT value FROM user_settings WHERE user_id = ? AND key = 'profile'")
    .get(req.user.id);
  let profile = null;
  if (profileRow) {
    try {
      profile = JSON.parse(profileRow.value);
    } catch {
      profile = null;
    }
  }

  return res.json({ exams, studyPlan, targetGpa, profile, user: { email: req.user.email } });
});

app.post("/api/exams", requireAuth, (req, res) => {
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
      `INSERT INTO exams (user_id, subject, credits, grade, exam_date, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.id, subject.trim(), credits, safeGrade, examDate || null, status);

  const inserted = db
    .prepare("SELECT * FROM exams WHERE id = ? AND user_id = ?")
    .get(result.lastInsertRowid, req.user.id);
  return res.status(201).json(toExamRow(inserted));
});

app.delete("/api/exams/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid exam id." });
  }
  db.prepare("DELETE FROM exams WHERE id = ? AND user_id = ?").run(id, req.user.id);
  return res.status(204).send();
});

app.delete("/api/exams", requireAuth, (req, res) => {
  db.prepare("DELETE FROM exams WHERE user_id = ?").run(req.user.id);
  return res.status(204).send();
});

app.post("/api/study-sessions", requireAuth, (req, res) => {
  const { id, day, subject, description, start, end } = req.body;
  if (!id || !day || !subject || !start || !end) {
    return res.status(400).json({ error: "Missing study session fields." });
  }
  if (start >= end) {
    return res.status(400).json({ error: "Start time must be before end time." });
  }

  db.prepare(
    `INSERT INTO study_sessions (id, user_id, day, subject, description, start_time, end_time)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.user.id, day, subject.trim(), (description || "").trim(), start, end);

  const inserted = db
    .prepare("SELECT * FROM study_sessions WHERE id = ? AND user_id = ?")
    .get(id, req.user.id);
  return res.status(201).json(toStudyRow(inserted));
});

app.delete("/api/study-sessions/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM study_sessions WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  return res.status(204).send();
});

app.delete("/api/study-sessions", requireAuth, (req, res) => {
  db.prepare("DELETE FROM study_sessions WHERE user_id = ?").run(req.user.id);
  return res.status(204).send();
});

app.put("/api/settings/target-gpa", requireAuth, (req, res) => {
  const { value } = req.body;
  if (value === null || value === "") {
    db.prepare("DELETE FROM user_settings WHERE user_id = ? AND key = 'target_gpa'").run(req.user.id);
    return res.json({ targetGpa: 0 });
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 18 || numeric > 31) {
    return res.status(400).json({ error: "Target GPA must be between 18 and 31." });
  }
  db.prepare(
    `INSERT INTO user_settings (user_id, key, value)
     VALUES (?, 'target_gpa', ?)
     ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value`
  ).run(req.user.id, String(numeric));
  return res.json({ targetGpa: numeric });
});

app.put("/api/settings/profile", requireAuth, (req, res) => {
  const { profile } = req.body;
  if (!profile || typeof profile !== "object") {
    return res.status(400).json({ error: "Invalid profile payload." });
  }
  const allowedLanguages = ["it", "en", "fr", "de", "ro", "es"];
  const allowedThemePresets = ["classic", "forest", "sunset", "dark", "night", "sky"];
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
  if (
    !Number.isFinite(profile.graduationTarget) ||
    profile.graduationTarget < 66 ||
    profile.graduationTarget > 110
  ) {
    return res.status(400).json({ error: "Invalid graduation target." });
  }

  db.prepare(
    `INSERT INTO user_settings (user_id, key, value)
     VALUES (?, 'profile', ?)
     ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value`
  ).run(req.user.id, JSON.stringify(profile));

  return res.json({ profile });
});

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Uni-Strategy server running on http://localhost:${PORT}`);
});
