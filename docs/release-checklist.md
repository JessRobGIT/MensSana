# MensSana — Release-Checkliste

Vor jedem Release (auch Testphase-Updates) diese Liste durchgehen.

---

## 1. Code & Tests

- [ ] `npm test` läuft durch (keine fehlgeschlagenen Tests)
- [ ] Keine offenen `console.log`-Debugausgaben im Code
- [ ] Sentry läuft — letztes Event in sentry.io sichtbar
- [ ] Edge Function deployed: `supabase functions deploy chat --no-verify-jwt`

## 2. Datenbank

- [ ] Alle neuen Migrations-Dateien in `supabase/migrations/` vorhanden
- [ ] Migration auf Produktions-Datenbank angewendet (Supabase SQL Editor)
- [ ] RLS-Policies für neue Tabellen gesetzt und getestet

## 3. Service Worker & Cache

- [ ] Cache-Version in `sw.js` erhöht (`menssana-vXX`)
- [ ] `app.js?v=XX` Version in `index.html` erhöht
- [ ] Nach Deploy: Hard Refresh (Ctrl+Shift+R) auf Testgerät

## 4. Datenschutz & Rechtliches

- [ ] `datenschutz.html` aktuell (neue Datenarten eingetragen?)
- [ ] Supabase AVV unterzeichnet (supabase.com/legal/dpa)
- [ ] Keine echten Nutzerdaten in Test-Accounts oder Seed-Daten

## 5. Funktionstest (Golden Path)

- [ ] Neues Konto registrieren (Consent-Checkbox sichtbar und pflichtfeld)
- [ ] Login / Logout funktioniert
- [ ] Chat mit Claude funktioniert (Antwort kommt, Stimmung wird gespeichert)
- [ ] Medikament anlegen, bearbeiten, löschen
- [ ] Termin anlegen, bearbeiten, löschen
- [ ] Aufgabe anlegen, abhaken
- [ ] Reminder-Toast erscheint (Medikament auf aktuelle Uhrzeit setzen)
- [ ] Caregiver-Login → Dashboard öffnet
- [ ] Dashboard: Nutzerliste lädt, Detailansicht öffnet

## 6. Caregiver-Dashboard

- [ ] Login mit Caregiver-Rolle → korrekte Weiterleitung
- [ ] Login mit User-Rolle → korrekte Weiterleitung (Companion App)
- [ ] Stimmungsdiagramm zeigt letzte 7 Tage

## 7. Monitoring nach Deploy

- [ ] Sentry: keine neuen kritischen Issues in den ersten 30 Min.
- [ ] Supabase: Edge Function Logs prüfen (keine `anthropic_error` Einträge)
- [ ] GitHub Actions: Deploy-Workflow grün

---

## Bekannte Einschränkungen (nicht blocken)

- favicon.ico fehlt (404, harmlos)
- Source Maps für supabase.min.js nicht verfügbar (harmlos)
- Supabase Free Tier: Projekt pausiert nach 1 Woche Inaktivität

---

*Letzte Aktualisierung: April 2026*
