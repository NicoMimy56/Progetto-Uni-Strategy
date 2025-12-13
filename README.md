# 🎓 Progetto: Uni-Strategy (Student OS)
**Versione:** 1.0 (Hybrid Tech Stack)
**Stato:** 🚧 In Sviluppo

## 📖 Visione del Progetto
**"Il tuo percorso accademico, sotto controllo."**

L'università non è solo studiare: è gestire scadenze, calcolare medie e pianificare strategie. Spesso l'ansia nasce non dalla difficoltà degli esami, ma dal non sapere esattamente a che punto siamo.
Questo progetto non è un semplice planner. È un **Sistema Operativo Ibrido** progettato con mentalità ingegneristica per dare allo studente il controllo totale sulla carriera universitaria, unendo l'organizzazione visiva alla potenza di calcolo e automazione.

### Cosa risolviamo:
* **👁️ Visualizzazione:** Un cruscotto centrale che trasforma date sparse in un piano d'azione chiaro.
* **⚙️ Strategia:** Calcolo automatico di media ponderata e CFU (niente calcoli manuali).
* **🔮 Simulazione:** Previsione dell'impatto dei voti futuri sulla media di laurea.
* **🔔 Automazione:** Notifiche intelligenti (Telegram) per scadenze imminenti.

---

## 🏗️ Architettura Tecnica

Il sistema si basa su tre pilastri integrati:

1.  **Frontend Organizzativo (Notion):** Gestione visiva, note, materiali di studio e Kanban board.
2.  **Frontend Mobile (Glide Apps):** Interfaccia rapida da telefono per consultare voti e ricevere status.
3.  **Backend & Logic (Google Sheets + Apps Script):** Il "motore" che gestisce i dati, i calcoli complessi e invia le notifiche al bot Telegram.

---

## 🛠️ Specifiche Tecniche (The Blueprint)

### 1. Il Database & Motore (Google Sheets)
*Il cuore del sistema. Tutto parte da qui.*

* **Tab `DB_Esami`:**
    * `ID_Materia`: Identificativo univoco.
    * `Materia`: Nome del corso.
    * `CFU`: Peso in crediti (Fondamentale per la media ponderata).
    * `Voto`: Input numerico (30L = 31 o logica separata).
    * `Data_Appello`: Data esame.
    * `Stato`: Dropdown (Da dare, Preparazione, Fatto).
    * `Giorni_Mancanti`: Formula array (`Data - OGGI`).
* **Calcoli Core:**
    * **Media Ponderata:** `SUMPRODUCT(Voti, CFU) / SUM(CFU_Totali)`.
    * **Grafici:** Grafico andamento media temporale + Pie chart crediti acquisiti vs mancanti.
* **Funzioni Premium (Simulatore):**
    * Logica "What If": Calcolo dinamico della media inserendo un voto ipotetico.

### 2. Il Cervello Visivo (Notion)
*L'ambiente di studio desktop.*

* **Database Master:** Embeddato o sincronizzato.
* **Viste:**
    * 📅 *Timeline Mensile:* Per scadenze a lungo termine.
    * 📋 *Kanban Board:* Workflow operativo (To Do -> Doing -> Done).
* **Moduli:** Diario di bordo giornaliero e archivio link/materiali per corso.

### 3. L'Automazione Mobile (Glide + Apps Script)
*L'assistente tascabile.*

* **App Interface (Glide):**
    * Visualizzazione pulita della Dashboard (Media, CFU).
    * Lista esami con edit rapido (inserimento voto).
* **Smart Notifications (Apps Script):**
    * **Cron Job:** Script che gira ogni mattina (es. 08:00).
    * **Logica:** `IF (Giorni_Mancanti == 3) THEN Send_Telegram_Msg`.
    * **Bot Telegram:** Invia messaggi tipo *"⚠️ Attenzione! Mancano 3 giorni ad Analisi 1. Dacci dentro!"*.

---

## 🚀 Roadmap di Sviluppo
*Spunta le caselle man mano che avanzi per tenere traccia dei progressi.*

### FASE 1: Architettura Dati (Google Sheets) 🗃️
- [ ] Creazione file `Backend_StudentOS` su Google Sheets.
- [ ] Setup Tab `DB_Esami` con colonne (Materia, CFU, Voto, Data, Stato).
- [ ] Setup Tab `DB_Config` (Dati utente, Token Bot Telegram).
- [ ] Implementazione formula **Media Ponderata** (con `MATR.SOMMA.PRODOTTO`).
- [ ] Implementazione formula **Conteggio CFU** (Acquisiti vs Totali).

### FASE 2: Interfaccia App (Glide) 📱
- [ ] Creazione account Glide e collegamento al Foglio Google.
- [ ] Design **Dashboard Home**: Componenti "Big Number" per Media e CFU.
- [ ] Design **Lista Esami**: Filtro per vedere solo esami "Da dare".
- [ ] Setup **Edit Mode**: Permettere all'utente di scrivere il voto dall'app.

### FASE 3: Logica & Bot (Google Apps Script) 🤖
- [ ] Creazione Bot Telegram con `@BotFather` (Salvataggio Token).
- [ ] Scrittura script `telegramBot.gs` (Funzione per inviare messaggi).
- [ ] Scrittura script `checkDeadlines.gs` (Loop che controlla le date).
- [ ] Impostazione del **Trigger** orario (es. ogni giorno alle 08:00).
- [ ] Test di invio notifica automatica.

### FASE 4: Integrazione Notion & Packaging 📦
- [ ] Creazione Template Notion (Pagina Home, Database, Viste).
- [ ] Embed del Grafico andamento media da Sheets a Notion.
- [ ] Scrittura manuale PDF/Notion "Come installare Student OS".
- [ ] Pulizia dati personali e preparazione link per la vendita/distribuzione.

---

## 📝 Note di Sviluppo (Log)
*Usa questo spazio per segnarti problemi o idee al volo.*
* *Idea:* Aggiungere calcolo previsionale per voto di laurea?
* *Todo:* Verificare se Glide permette le notifiche push native nel piano free (altrimenti restiamo su Telegram).
