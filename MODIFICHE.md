# Modifiche al progetto

Registro delle modifiche fatte da qui in avanti.

---

## 2026-06-18 — Piano di studi: pulsanti e aggiunta sessioni non funzionanti sul server

**Problema:** sul server (HTTP via LAN/Tailscale) non si potevano aggiungere sessioni al piano di studi; i pulsanti sembravano non rispondere.

**Cause individuate:**
- `crypto.randomUUID()` non funziona su contesti non sicuri (HTTP, es. `http://100.x.x.x:3000`)
- Validazione form silenziosa (mancavano data/ora senza messaggio)
- Orari vuoti di default se l’utente non apriva il selettore ore
- Dipendenza totale da flatpickr CDN (se non carica, data non selezionabile)

**File modificati:**

| File | Cartella |
|------|----------|
| `app.js` | `js/` |
| `academic.js` | `js/` |
| `routes.js` | `server/` |
| `index.html` | radice |
| `it.json`, `en.json`, `de.json`, `es.json`, `fr.json`, `ro.json` | `locales/` |

**Cosa è cambiato:**
- UUID con fallback compatibile HTTP (`generateClientId`)
- Orari predefiniti 09:00–10:00 e reset dopo aggiunta
- Messaggi di errore se mancano campi o data passata
- Fallback date picker nativo se flatpickr non è disponibile
- Server genera UUID se il client non lo invia
- Cache bust su `app.js` in `index.html`

**Deploy sul server:** copiare i file aggiornati e riavviare il container/processo Node.

---

## 2026-06-18 — Layout mobile (topbar, calendari, gestione esami)

**Problema:** su telefono la barra superiore spariva scrollando; testi uscivano dai box settimanali; calendario a lista verticale poco leggibile; tabella gestione esami non a tutta larghezza.

**File modificati:**

| File | Cartella |
|------|----------|
| `styles.css` | radice |
| `app.js` | `js/` |
| `dom.js` | `js/` |
| `index.html` | radice |
| `it.json`, `en.json`, `de.json`, `es.json`, `fr.json`, `ro.json` | `locales/` |

**Cosa è cambiato:**
1. **Topbar fissa** in alto durante lo scroll (mobile)
2. **Organizzazione settimanale (Home):** giorni in colonna singola su mobile, testi con a capo automatico
3. **Gestione esami:** tabella con scroll orizzontale a tutta larghezza; header card allineato
4. **Calendario:** griglia 7×7 compatta (come piano studio) + elenco «Appuntamenti del mese» sotto
5. **Piano studio:** stessa griglia compatta + elenco dettagliato sotto (con elimina sessione)

**Deploy:** aggiornare file e ricaricare pagina (Ctrl+F5 / svuota cache).

---

<!-- Nuove voci sotto questa riga -->
