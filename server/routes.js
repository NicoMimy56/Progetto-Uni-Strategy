/**
 * @file server/routes.js
 *
 * Definisce tutte le rotte HTTP dell'API REST sotto il prefisso `/api/...`.
 *
 * Convenzioni generali:
 * - Risposte di errore: JSON `{ error: "messaggio" }` con status 4xx/5xx appropriato.
 * - Operazioni che modificano dati utente richiedono `requireAuth` e filtrano sempre per `req.user.id`
 *   così un utente non può leggere o alterare record di altri anche conoscendo gli ID.
 * - Le DELETE senza body spesso restituiscono `204 No Content` (corpo vuoto); il client `apiRequest` lo gestisce.
 *
 * Tabella rapida endpoint (metodo, path, auth):
 * | POST   | /api/auth/register     | no  |
 * | POST   | /api/auth/login        | no  |
 * | POST   | /api/auth/logout       | no  (invalida sessione se presente) |
 * | GET    | /api/auth/me           | no  (401 se cookie assente/invalido) |
 * | GET    | /api/bootstrap         | sì  |
 * | POST   | /api/exams             | sì  |
 * | PUT    | /api/exams/:id         | sì  |
 * | DELETE | /api/exams/:id         | sì  |
 * | DELETE | /api/exams             | sì  (svuota tutti gli esami utente) |
 * | POST   | /api/study-sessions    | sì  |
 * | DELETE | /api/study-sessions/:id| sì  |
 * | DELETE | /api/study-sessions    | sì  |
 * | POST   | /api/simulated-exams   | sì  |
 * | DELETE | /api/simulated-exams/:id | sì |
 * | DELETE | /api/simulated-exams   | sì  |
 * | PUT    | /api/settings/target-gpa | sì |
 * | PUT    | /api/settings/profile | sì  |
 *
 * In coda: `app.use("/api", ...)` → 404 JSON per path API errati (non HTML).
 */
const { db } = require("./database");
const {
  hashPassword,
  setSessionCookie,
  clearSessionCookie,
  createSession,
  getSessionUser,
  requireAuth
} = require("./auth");
const { toExamRow, toStudyRow, toSimulatedExamRow } = require("./mappers");

/**
 * Registra tutte le route sull'istanza Express passata dall'esterno.
 * @param {import("express").Express} app
 */
function registerApiRoutes(app) {
  /* ---------------------------------------------------------------------------
   * POST /api/auth/register
   * Body: { email, password }
   * - email normalizzata lowercase/trim; controllo rudimentale presenza "@".
   * - password minimo 6 caratteri (allineato al minlength sul form HTML).
   * Risultati: 201 + cookie sessione + { user }; 409 se email duplicata; 400 validazione.
   * --------------------------------------------------------------------------- */
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

  /* ---------------------------------------------------------------------------
   * POST /api/auth/login
   * Stesso formato body. 401 messaggio generico "Invalid credentials" sia se email sconosciuta
   * sia se hash non combacia (non rivelare quale campo è errato — hardening enumeration).
   * --------------------------------------------------------------------------- */
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

  /* ---------------------------------------------------------------------------
   * POST /api/auth/logout
   * Cancella sessione lato DB (se cookie valido) + cookie nel browser.
   * 204 senza corpo anche se già sloggato (idempotente lato UX).
   * --------------------------------------------------------------------------- */
  app.post("/api/auth/logout", (req, res) => {
    const user = getSessionUser(req);
    if (user) {
      db.prepare("DELETE FROM user_sessions WHERE token = ?").run(user.token);
    }
    clearSessionCookie(res);
    return res.status(204).send();
  });

  /* GET /api/auth/me — probing sessione da `initializeApp` sul client */
  app.get("/api/auth/me", (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated." });
    }
    return res.json({ user: { id: user.id, email: user.email } });
  });

  /* ---------------------------------------------------------------------------
   * GET /api/bootstrap — payload unico dopo login/ricarico pagina
   * Combina esami ordinati dal più nuovo (`id DESC`), piano studio ordinato per giorno/orario,
   * simulazioni, media target, profilo JSON (language, tema, CFU…).
   * Se `profile` in DB è JSON invalido ⇒ null e il client userà DEFAULT_PROFILE.
   * --------------------------------------------------------------------------- */
  app.get("/api/bootstrap", requireAuth, (req, res) => {
    const exams = db
      .prepare("SELECT * FROM exams WHERE user_id = ? ORDER BY id DESC")
      .all(req.user.id)
      .map(toExamRow);
    const studyPlan = db
      .prepare("SELECT * FROM study_sessions WHERE user_id = ? ORDER BY day, start_time")
      .all(req.user.id)
      .map(toStudyRow);
    const simulatedExams = db
      .prepare("SELECT * FROM simulated_exams WHERE user_id = ? ORDER BY id DESC")
      .all(req.user.id)
      .map(toSimulatedExamRow);
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

    return res.json({
      exams,
      studyPlan,
      simulatedExams,
      targetGpa,
      profile,
      user: { email: req.user.email }
    });
  });

  /* ---------------------------------------------------------------------------
   * CRUD exams — sempre vincolate a req.user.id
   * POST: stato deve essere uno dei tre ENUM; se Completed serve `grade` numerico finito.
   * PUT: stesse regole; 404 se id non esiste o non appartiene all'utente.
   * --------------------------------------------------------------------------- */
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

  app.put("/api/exams/:id", requireAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid exam id." });
    }
    const existing = db
      .prepare("SELECT * FROM exams WHERE id = ? AND user_id = ?")
      .get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: "Exam not found." });
    }

    const credits = Number(req.body.credits);
    const status = String(req.body.status || "");
    const examDate = req.body.examDate ? String(req.body.examDate) : null;
    const gradeInput = req.body.grade;
    const parsedGrade = gradeInput === null || gradeInput === "" ? null : Number(gradeInput);

    if (!Number.isFinite(credits) || credits <= 0) {
      return res.status(400).json({ error: "Invalid credits." });
    }
    if (!["To Take", "In Preparation", "Completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid exam status." });
    }
    if (status === "Completed" && !Number.isFinite(parsedGrade)) {
      return res.status(400).json({ error: "Completed exam requires a grade." });
    }
    const safeGrade = status === "Completed" ? parsedGrade : null;

    db.prepare(
      `UPDATE exams
       SET credits = ?, grade = ?, exam_date = ?, status = ?
       WHERE id = ? AND user_id = ?`
    ).run(credits, safeGrade, examDate, status, id, req.user.id);

    const updated = db
      .prepare("SELECT * FROM exams WHERE id = ? AND user_id = ?")
      .get(id, req.user.id);
    return res.json(toExamRow(updated));
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

  /* ---------------------------------------------------------------------------
   * Piano studio (`study_sessions`)
   * POST: confronto stringale `start < end` (formato HH:MM coerente con client); id univoco UUID.
   * --------------------------------------------------------------------------- */
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

  /* ---------------------------------------------------------------------------
   * Simulatore — tabella dedicata `simulated_exams` (non marca esami veri come superati).
   * Voto pianificato tra 18 e 31 (scala italiana con lode implicita sul max).
   * --------------------------------------------------------------------------- */
  app.post("/api/simulated-exams", requireAuth, (req, res) => {
    const subject = String(req.body.subject || "").trim();
    const credits = Number(req.body.credits);
    const plannedGrade = Number(req.body.plannedGrade);
    if (!subject || !Number.isFinite(credits) || credits <= 0) {
      return res.status(400).json({ error: "Invalid simulated exam subject/credits." });
    }
    if (!Number.isFinite(plannedGrade) || plannedGrade < 18 || plannedGrade > 31) {
      return res.status(400).json({ error: "Simulated grade must be between 18 and 31." });
    }
    const result = db
      .prepare(
        `INSERT INTO simulated_exams (user_id, subject, credits, planned_grade)
         VALUES (?, ?, ?, ?)`
      )
      .run(req.user.id, subject, credits, plannedGrade);
    const inserted = db
      .prepare("SELECT * FROM simulated_exams WHERE id = ? AND user_id = ?")
      .get(result.lastInsertRowid, req.user.id);
    return res.status(201).json(toSimulatedExamRow(inserted));
  });

  app.delete("/api/simulated-exams/:id", requireAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid simulated exam id." });
    }
    db.prepare("DELETE FROM simulated_exams WHERE id = ? AND user_id = ?").run(id, req.user.id);
    return res.status(204).send();
  });

  app.delete("/api/simulated-exams", requireAuth, (req, res) => {
    db.prepare("DELETE FROM simulated_exams WHERE user_id = ?").run(req.user.id);
    return res.status(204).send();
  });

  /* ---------------------------------------------------------------------------
   * PUT /api/settings/target-gpa — obiettivo media /30 sulla Home (input numerico utente).
   * `value` null o stringa vuota ⇒ DELETE chiave ⇒ client interpreta targetGpa 0.
   * --------------------------------------------------------------------------- */
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

  /**
   * PUT /api/settings/profile — oggetto profilo intero salvato come JSON serialized.
   * Whitelist linguaggi/temi/percorsi e range CFU e `graduationTarget` 66–110 (scala italiana laurea triennale/magistrale tipica).
   * Il server non calcola la media qui: solo validazione e persistenza.
   */
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

  app.use("/api", (_req, res) => {
    return res.status(404).json({ error: "API endpoint not found." });
  });
}

module.exports = { registerApiRoutes };
