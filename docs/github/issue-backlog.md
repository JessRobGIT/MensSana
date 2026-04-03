# Issue Backlog — MensSana

## Phase 1 — Fundament ✅

### #1 Backend-Grundstruktur für MensSana ✅
**Labels:** `feature`, `P1-critical`

Supabase als Backend eingerichtet: Auth, DB, Edge Functions, RLS-Policies.

**Akzeptanzkriterien:**
- [x] API verfügbar (Supabase)
- [x] User speicherbar (profiles-Tabelle)
- [x] Conversations persistent
- [x] Sync zwischen Geräten möglich

---

### #2 Datenmodell für MensSana definieren ✅
**Labels:** `feature`, `P1-critical`

**Akzeptanzkriterien:**
- [x] Tabellen/Entitäten dokumentiert (profiles, conversations, messages, mood_entries, medications, calendar_events, caregiver_assignments)
- [x] Beziehungen beschrieben
- [x] Pflichtfelder definiert
- [x] Erweiterbarkeit für Caregiver/Family umgesetzt

---

### #3 Chat-Persistenz statt localStorage ✅
**Labels:** `feature`, `P1-critical`

**Akzeptanzkriterien:**
- [x] Conversations speicherbar
- [x] Messages speicherbar
- [x] History serverseitig abrufbar
- [x] Offline-Queue mit Pending-Anzeige und Retry-Button

---

### #4 Auth & Rollenmodell einführen ✅
**Labels:** `feature`, `P1-critical`

**Akzeptanzkriterien:**
- [x] Login / Signup möglich
- [x] `caregiver` Rolle definiert und implementiert
- [x] `family` Rolle definiert und implementiert
- [x] Rechte dokumentiert (docs/roles-and-permissions.md)

---

## Phase 2 — produktiver Kern

### #5 Caregiver-Dashboard als Web-Oberfläche ✅
**Labels:** `feature`, `P2-high`

Separates dashboard.html auf GitHub Pages. Login mit Rollen-Routing (caregiver/family → Dashboard, user → Companion-App).

**Umgesetzt:**
- [x] Benutzerübersicht mit Stimmungsdot, letzter Aktivität, Medikament, Termin
- [x] Detail-Panel: 7-Tage-Stimmungschart mit Durchschnitt + Trend
- [x] Detail-Panel: letzte Gespräche, Medikamente (scrollbar), Termine (Mini-Kalender)
- [x] Caregiver-Schreibrechte: Medikamente und Termine anlegen / bearbeiten / löschen
- [x] Wiederholung mit End-Datum
- [x] Timezone-korrektes Speichern von Terminen

---

### #6 Cloud-Sync für Kalender und Medikamente ✅
**Labels:** `feature`, `P2-high`

Medikamente und Termine werden in Supabase gespeichert und zwischen Geräten synchronisiert. RLS-Policies für Caregiver-Schreibzugriff in docs/sql/caregiver-write-policies.sql.

---

### #7 Voice-gesteuertes To-do- und Reminder-System
**Labels:** `feature`, `P2-high`

Sprachgesteuerte Eingabe und Erinnerungen für Termine und Medikamente.

**Akzeptanzkriterien:**
- [ ] Spracheingabe zum Anlegen von Terminen / Medikamenten
- [ ] Erinnerungen (Push-Notification oder in-App)
- [ ] Verknüpfung mit bestehendem Kalender- und Medikamenten-System

---

## Phase 3 — Differenzierung

### #8 Musik-Integration vorbereiten
**Labels:** `feature`, `P3-medium`

### #9 Familienfotos und Erinnerungsslides
**Labels:** `feature`, `P3-medium`

### #10 Voice Experience mit OpenAI evaluieren
**Labels:** `enhancement`, `P3-medium`

---

## Phase 4 — Ausbau

### #11 Video-Call-Gatekeeper
**Labels:** `feature`, `P4-low`

---

## Phase 5 — Vision

### #12 Vertraute Stimmen / Voice Cloning
**Labels:** `feature`, `P5-vision`

---

## Offen / Technische Schulden

### B5 — Audit-Strategie (created_by / updated_by)
**Labels:** `enhancement`, `P2-high`

Nachvollziehbarkeit wer Medikamente/Termine angelegt oder geändert hat. Spalten `created_by` und `updated_by` in medications und calendar_events einführen, bei Caregiver-Aktionen befüllen.

### B7 — Caregiver Write Tests
**Labels:** `test`, `P2-high`

Testspezifikationen für rollenbasierte CRUD-Operationen (Caregiver darf schreiben, Family darf nicht, User sieht eigene Daten).
