# Progetto-Uni-Strategy
## Il tuo percorso accademico, sotto controllo.

L'università non è solo studiare: è gestire scadenze, calcolare medie e pianificare strategie. Spesso l'ansia nasce non dalla difficoltà degli esami, ma dal non sapere esattamente a che punto siamo.

Questo template non è un semplice planner. È uno strumento progettato con mentalità ingegneristica per darti il controllo totale sulla tua carriera universitaria.

### Cosa fa per te:

* **👁️ Visualizza il Futuro:** Un cruscotto centrale che trasforma date sparse in un piano d'azione chiaro, passando dalla visione mensile alla gestione dei task giornalieri.
* **⚙️ Calcola la Strategia:** Niente più calcolatrici manuali. Il motore integrato traccia la tua media ponderata e i tuoi CFU in tempo reale.
* **🔮 Simula Scenari:** Vuoi sapere che voto devi prendere per mantenere la tua media? Il simulatore ti permette di prevedere l'impatto dei prossimi esami sui tuoi obiettivi di laurea.

> **Meno tempo per organizzare, più energia per studiare. Benvenuto nel tuo nuovo metodo.**

---

## 🛠️ Riassunto Tecnico del Progetto

Stiamo costruendo un **Sistema Operativo Ibrido** che unisce:

### 1. Il "Cervello" (Notion) 🧠
Gestisce l'organizzazione visiva e il flusso di lavoro.
* **Database Master:** Esami, scadenze, To-Do list.
* **Viste:** Calendario (Timeline) + Kanban Board (Stato avanzamento).

### 2. Il "Motore" (Google Sheets) 🏎️
Gestisce i calcoli complessi e le previsioni (Embedded in Notion).
* **Funzioni:** Media ponderata automatica, tracking CFU, simulatore voto.*
---

## 🏗️ Student OS: Specifiche Tecniche del Progetto
**Versione:** 1.0 - The "Engineering Approach"

### 🎯 Visione del Progetto
Creare il "Sistema Operativo Definitivo" per lo studente universitario. Un prodotto digitale che elimina il caos organizzativo unendo l'estetica di Notion alla potenza di calcolo di Google Sheets.
* **Filosofia:** "Non insegniamo la materia, forniamo la macchina per gestirla." (Approccio No-Teacher)
* **Target:** Studenti universitari che necessitano di monitorare Media Ponderata e CFU.

---

### 🧠 Il Cervello: Architettura Notion (Frontend)
La parte visiva dove l'utente passa il 90% del tempo.

### 1. Il Database Master ("Centro di Controllo")
Un unico archivio centrale contenente tutte le scadenze e gli esami.
* **Proprietà (Colonne) Essenziali:**
    * 🏷️ **Nome Attività:** (es. "Analisi 1", "Consegna Progetto")
    * 📅 **Data:** (Data esame o scadenza)
    * 📂 **Tipo:** (Select: Scritto, Orale, Progetto, Parziale)
    * 🚦 **Priorità:** (Select: Alta, Media, Bassa) - *Per ordinare le task nei momenti di crisi.*
    * ⚖️ **Peso/CFU:** (Number) - *Cruciale per il collegamento con il motore di calcolo.*
    * ✅ **Stato:** (Status: Da fare, In corso, Ripasso, Fatto) - *Fondamentale per la vista Board.*

### 2. Le Viste Strategiche (Dashboard)
Come i dati vengono presentati all'utente nella Home Page:
* **Vista 1: Timeline Mensile (Calendario)**
    * *Obiettivo:* Visione d'insieme per non perdere le scadenze.
* **Vista 2: Focus Flow (Kanban Board)**
    * *Obiettivo:* Gestione operativa. L'utente trascina le card da "Da fare" a "Fatto".
    * *Transizione:* Switch fluido tra le due viste tramite tab.

### 3. Moduli Aggiuntivi Integrati
* **Diario di Bordo:** To-Do list giornaliera collegata al database principale.
* **Gestore Corsi:** Spazio minimale per link e info logistiche (senza eccessivi dettagli manuali).

---

## 🏎️ Il Motore: Architettura Google Sheets (Backend)
La parte logica, nascosta o "embedded" nella pagina Notion.

### 1. Funzioni "Core" (L'Analisi Attuale)
* **Calcolatore Media Ponderata:**
    * Logica: `(Somma(Voto * CFU)) / (Somma CFU Totali)` -> mettendo anche il grafico della media
    * Aggiornamento automatico all'inserimento dei dati.
* **Tracker CFU:**
    * Visualizzazione grafica (Barra di progresso o Percentuale) per indicare quanto manca alla laurea.

### 2. Funzioni "Premium" (La Strategia Futura)
* **Il Simulatore "What If":**
    * Input utente: Voto ipotetico nel prossimo esame.
    * Output immediato: Come cambierebbe la media e il voto di partenza alla laurea.
* **Il Previsore (Target):**
    * Calcolo inverso: "Che media devo tenere nei prossimi 3 esami per non scendere sotto il 28?"

---

## 🔌 User Experience (UX)
* **Integrazione:** Il Foglio Google viene incorporato (Embed) direttamente dentro Notion.
* **Flusso:** L'utente usa Notion per l'organizzazione quotidiana e tocca il foglio Sheets solo per aggiornare i voti o fare simulazioni strategiche.
