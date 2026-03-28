# Issue Backlog — MensSana

## Phase 1 — Fundament

### #1 Backend-Grundstruktur für MensSana
**Labels:** `feature`, `P1-critical`

Ein Backend für persistente Daten wird benötigt (User, Profile, Conversations, Medications, Calendar).

**Akzeptanzkriterien:**
- [ ] API verfügbar
- [ ] User speicherbar
- [ ] Conversations persistent
- [ ] Sync zwischen Geräten möglich

---

### #2 Datenmodell für MensSana definieren
**Labels:** `feature`, `P1-critical`

Ein zentrales Datenmodell für Nutzer, Profile, Gespräche, Stimmung, Medikamente und Termine festlegen.

**Akzeptanzkriterien:**
- [ ] Tabellen/Entitäten dokumentiert
- [ ] Beziehungen beschrieben
- [ ] Pflichtfelder definiert
- [ ] Erweiterbarkeit für Caregiver/Family vorbereitet

---

### #3 Chat-Persistenz statt localStorage
**Labels:** `feature`, `P1-critical`

Gespräche und Nachrichten sollen nicht nur lokal, sondern serverseitig gespeichert werden.

**Akzeptanzkriterien:**
- [ ] Conversations speicherbar
- [ ] Messages speicherbar
- [ ] History serverseitig abrufbar
- [ ] lokaler Fallback sauber definiert

---

### #4 Auth & Rollenmodell einführen
**Labels:** `feature`, `P1-critical`

Ein Rollenmodell für Caregiver und Family Member einführen.

**Akzeptanzkriterien:**
- [ ] Login möglich
- [ ] `caregiver` Rolle definiert
- [ ] `family` Rolle definiert
- [ ] Rechte dokumentiert

---

## Phase 2 — produktiver Kern

### #5 Caregiver-Dashboard als Web-Oberfläche
**Labels:** `feature`, `P2-high`

### #6 Cloud-Sync für Kalender und Medikamente
**Labels:** `feature`, `P2-high`

### #7 Voice-gesteuertes To-do-System
**Labels:** `feature`, `P2-high`

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
