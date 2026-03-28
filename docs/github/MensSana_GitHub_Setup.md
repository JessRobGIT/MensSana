# MensSana — GitHub- und Projektstruktur

Stand: 2026-03-28

Dieses Dokument beschreibt die empfohlene Struktur für das Repository **MensSana** sowie die ersten GitHub-Issues, Labels und Arbeitsschritte.

---

## 1. Ziel

Das Repository soll drei Dinge sauber trennen:

1. **Produktcode** für die App
2. **Projektorganisation** über GitHub Issues
3. **Dokumentation** für Architektur, Roadmap und Entscheidungen

---

## 2. Empfohlene Repository-Struktur

```text
MensSana/
├─ README.md
├─ .gitignore
├─ docs/
│  ├─ github/
│  │  ├─ labels.md
│  │  ├─ roadmap.md
│  │  ├─ issue-backlog.md
│  │  └─ templates/
│  │     ├─ bug.md
│  │     ├─ feature.md
│  │     ├─ ux.md
│  │     └─ question.md
│  ├─ architecture/
│  │  ├─ backend-overview.md
│  │  ├─ database-schema.md
│  │  └─ auth-roles.md
│  └─ product/
│     ├─ vision.md
│     ├─ concept-summary.md
│     └─ naming.md
├─ web/
│  └─ prototypes/
│     └─ menssana-spa/
│        ├─ index.html
│        ├─ app.js
│        ├─ styles.css
│        └─ manifest.json
├─ backend/
│  ├─ README.md
│  ├─ supabase/
│  │  ├─ schema.sql
│  │  ├─ policies.sql
│  │  └─ seed.sql
│  └─ functions/
│     └─ README.md
└─ .github/
   ├─ ISSUE_TEMPLATE/
   │  ├─ bug_report.md
   │  ├─ feature_request.md
   │  ├─ ux_feedback.md
   │  └─ code_question.md
   └─ PULL_REQUEST_TEMPLATE.md
```

---

## 3. Was wohin gehört

### Root
- `README.md`: kurze Projektbeschreibung, Startanleitung, Ziele
- `.gitignore`: Editor-, Node-, OS- und Secret-Dateien ausschließen

### `docs/github/`
- Arbeitsorganisation, Labels, Roadmap, Issue-Backlog
- Nicht produktiver Code, sondern Projektsteuerung

### `docs/architecture/`
- Backend-Entscheidungen
- Datenmodell
- Rollen- und Rechtekonzept

### `docs/product/`
- Produktvision
- Feature-Zusammenfassung
- Benennung und Messaging

### `web/prototypes/menssana-spa/`
- aktueller HTML/CSS/JS-Prototyp
- ideal für schnellen Fortschritt ohne Build-System

### `backend/`
- alles rund um Supabase oder spätere Backend-Logik
- SQL-Schemata, Policies, Seeds, servernahe Doku

### `.github/`
- echte GitHub-Issue-Templates für komfortables Arbeiten im Browser

---

## 4. Labels

### Typ-Labels
- `bug`
- `documentation`
- `enhancement`
- `feature`
- `question`
- `ux`

### Workflow-Labels
- `duplicate`
- `good first issue`
- `help wanted`
- `invalid`
- `test wanted`
- `wontfix`

### Prioritäts-Labels
- `P1-critical`
- `P2-high`
- `P3-medium`
- `P4-low`
- `P5-vision`

Empfehlung für GitHub-Farben:
- `P1-critical`: rot
- `P2-high`: orange
- `P3-medium`: gelb
- `P4-low`: blau
- `P5-vision`: lila

---

## 5. Issue-Templates

### `docs/github/templates/feature.md`
```md
## 🧩 Feature / Verbesserung

### Beschreibung
<!-- Was soll gebaut oder verbessert werden? -->

### Nutzen
<!-- Warum ist das wichtig? -->

### Akzeptanzkriterien
- [ ]

### Technische Hinweise
<!-- Optional -->

### Abhängigkeiten
<!-- Optional -->
```

### `docs/github/templates/bug.md`
```md
## 🐞 Bug

### Beschreibung
<!-- Was funktioniert nicht? -->

### Schritte zum Reproduzieren
1.
2.
3.

### Erwartetes Verhalten
<!-- Was sollte passieren? -->

### Screenshots / Logs
<!-- Optional -->

### Umgebung
- Device:
- Browser:
```

### `docs/github/templates/ux.md`
```md
## 🎨 UX / Design

### Problem
<!-- Was ist unklar oder unpraktisch? -->

### Verbesserungsvorschlag
<!-- Wie sollte es besser sein? -->

### Ziel
<!-- Warum verbessert das die UX? -->
```

### `docs/github/templates/question.md`
```md
## ❓ Frage zum Code

### Kontext
<!-- Worum geht es? -->

### Frage
<!-- Konkrete Frage -->

### Relevanter Code
<!-- Optional -->
```

---

## 6. Erste Roadmap

### Phase 1 — Fundament
- Backend-Grundstruktur
- Datenmodell definieren
- Chat serverseitig speichern
- Auth und Rollenmodell

### Phase 2 — produktiver Kern
- Caregiver-Dashboard
- Cloud-Sync für Kalender und Medikamente
- To-do- und Reminder-System

### Phase 3 — Differenzierung
- Musik-Integration
- Fotoalben und Reminiszenz-Funktionen
- natürlichere Voice Experience

### Phase 4 — Ausbau
- Video-Call-Gatekeeper
- Mehrsprachigkeit

### Phase 5 — Vision
- vertraute Stimmen / Voice Cloning
- Companion-Hardware

---

## 7. Erster Issue-Backlog

### 1. Backend-Grundstruktur für MensSana
**Labels:** `feature`, `P1-critical`

```md
## 🧩 Feature / Verbesserung

### Beschreibung
Ein Backend für persistente Daten wird benötigt (User, Profile, Conversations, Medications, Calendar).

### Nutzen
Ermöglicht Multi-Device Nutzung, Caregiver Zugriff und stabile Datenhaltung.

### Akzeptanzkriterien
- [ ] API verfügbar
- [ ] User speicherbar
- [ ] Conversations persistent
- [ ] Sync zwischen Geräten möglich

### Abhängigkeiten
- Datenmodell
```

### 2. Datenmodell für MensSana definieren
**Labels:** `feature`, `P1-critical`

```md
## 🧩 Feature / Verbesserung

### Beschreibung
Ein zentrales Datenmodell für Nutzer, Profile, Gespräche, Stimmung, Medikamente und Termine festlegen.

### Nutzen
Verhindert spätere Umbauten und schafft eine stabile Grundlage für Frontend und Backend.

### Akzeptanzkriterien
- [ ] Tabellen/Entitäten dokumentiert
- [ ] Beziehungen beschrieben
- [ ] Pflichtfelder definiert
- [ ] Erweiterbarkeit für Caregiver/Family vorbereitet
```

### 3. Chat-Persistenz statt localStorage
**Labels:** `feature`, `P1-critical`

```md
## 🧩 Feature / Verbesserung

### Beschreibung
Gespräche und Nachrichten sollen nicht nur lokal, sondern serverseitig gespeichert werden.

### Nutzen
Gesprächsverlauf bleibt geräteübergreifend erhalten.

### Akzeptanzkriterien
- [ ] Conversations speicherbar
- [ ] Messages speicherbar
- [ ] History serverseitig abrufbar
- [ ] lokaler Fallback sauber definiert
```

### 4. Auth & Rollenmodell einführen
**Labels:** `feature`, `P1-critical`

```md
## 🧩 Feature / Verbesserung

### Beschreibung
Ein Rollenmodell für Caregiver und Family Member einführen.

### Nutzen
Ermöglicht sichere Mehrbenutzer-Verwaltung.

### Akzeptanzkriterien
- [ ] Login möglich
- [ ] caregiver Rolle definiert
- [ ] family Rolle definiert
- [ ] Rechte dokumentiert
```

### 5. Caregiver-Dashboard als Web-Oberfläche
**Labels:** `feature`, `P2-high`

### 6. Cloud-Sync für Kalender und Medikamente
**Labels:** `feature`, `P2-high`

### 7. Voice-gesteuertes To-do-System
**Labels:** `feature`, `P2-high`

### 8. Musik-Integration vorbereiten
**Labels:** `feature`, `P3-medium`

### 9. Familienfotos und Erinnerungsslides
**Labels:** `feature`, `P3-medium`

### 10. Voice Experience mit OpenAI evaluieren
**Labels:** `enhancement`, `P3-medium`

### 11. Video-Call-Gatekeeper
**Labels:** `feature`, `P4-low`

### 12. Vertraute Stimmen / Voice Cloning
**Labels:** `feature`, `P5-vision`

---

## 8. Konkrete Arbeitsschritte für dich

### Schritt 1 — Repo lokal klonen
```bash
git clone https://github.com/JessRobGIT/MensSana.git
cd MensSana
```

### Schritt 2 — Grundstruktur lokal anlegen
Lege die in Abschnitt 2 gezeigten Ordner lokal an.

### Schritt 3 — dieses Dokument einchecken
Speichere dieses Dokument z. B. als:
```text
docs/github/setup-structure.md
```

### Schritt 4 — die wichtigsten Dateien zuerst anlegen
Mindestens:
- `README.md`
- `docs/github/labels.md`
- `docs/github/roadmap.md`
- `docs/github/issue-backlog.md`
- `.github/ISSUE_TEMPLATE/*`

### Schritt 5 — committen und pushen
```bash
git add .
git commit -m "Add initial MensSana GitHub and docs structure"
git push origin main
```

### Schritt 6 — Labels in GitHub anlegen
Im Browser im Repo unter **Issues > Labels** die Labels aus Abschnitt 4 anlegen.

### Schritt 7 — erste Issues anlegen
Die Issues aus Abschnitt 7 im Browser unter **Issues > New issue** anlegen.

---

## 9. Empfehlung für den allerersten technischen Fokus

Nach der GitHub-Struktur sofort mit diesen drei Dingen weitermachen:

1. Supabase-Projekt anlegen
2. Datenmodell definieren
3. Gesprächsverlauf serverseitig speichern

Nicht zuerst mit Musik, Voice Cloning oder Video Calls starten.

---

## 10. Name

Der finale Produktname ist:

**MensSana**

Empfohlene Schreibweise:
- Produktname: `MensSana`
- Repository: `MensSana`
- App-Titel: `MensSana`
- Untertitel möglich: `Gespräch, Orientierung und Begleitung im Alltag`

