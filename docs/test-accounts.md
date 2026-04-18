# MensSana — Test-Accounts & Testumgebung einrichten

## Übersicht

Für die Testphase gibt es vier Rollen. Jede Rolle sollte mit einem eigenen
Test-Account abgedeckt sein.

| Rolle      | E-Mail (Beispiel)          | Passwort      | Zweck                          |
|------------|----------------------------|---------------|--------------------------------|
| user       | anna.test@menssana.dev     | Test1234!     | Companion App — Patientin      |
| user       | hans.test@menssana.dev     | Test1234!     | Companion App — Patient        |
| caregiver  | pflege.test@menssana.dev   | Test1234!     | Caregiver Dashboard            |
| family     | familie.test@menssana.dev  | Test1234!     | Dashboard (Familienansicht)    |

> **Wichtig:** Diese Accounts nur im Supabase-Testprojekt anlegen.
> Niemals echte Patientendaten in Testaccounts verwenden.

---

## Einrichtung Schritt für Schritt

### 1. Auth-Accounts anlegen

Im Supabase Dashboard → **Authentication → Users → Add user**:
- E-Mail und Passwort aus der Tabelle oben eintragen
- "Auto Confirm User" aktivieren (kein E-Mail-Bestätigungsflow nötig)
- Die generierte **UUID** jedes Users notieren

### 2. Seed-Daten einspielen

Nach dem Anlegen der Users die UUIDs in `supabase/seed.sql` eintragen
(die vier `SET`-Variablen ganz oben), dann im SQL Editor ausführen.

### 3. Caregiver-Zuweisung prüfen

Nach dem Seed sollte in `caregiver_assignments` eine Zeile existieren:
- `caregiver_id` = UUID von pflege.test
- `user_id` = UUID von anna.test

### 4. Funktionstest

Mit `anna.test` einloggen → Companion App mit Testdaten sichtbar
Mit `pflege.test` einloggen → Dashboard zeigt Anna Müller in der Liste

---

## Seed zurücksetzen

Um alle Testdaten zu löschen (Auth-Accounts bleiben):

```sql
-- Nur Testdaten löschen, nicht Auth-Accounts
DELETE FROM medications        WHERE created_by IN (SELECT id FROM profiles WHERE full_name LIKE '%Test%');
DELETE FROM calendar_events    WHERE created_by IN (SELECT id FROM profiles WHERE full_name LIKE '%Test%');
DELETE FROM todo_items         WHERE user_id    IN (SELECT id FROM profiles WHERE full_name LIKE '%Test%');
DELETE FROM mood_entries       WHERE user_id    IN (SELECT id FROM profiles WHERE full_name LIKE '%Test%');
DELETE FROM messages           WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id IN (SELECT id FROM profiles WHERE full_name LIKE '%Test%'));
DELETE FROM conversations      WHERE user_id    IN (SELECT id FROM profiles WHERE full_name LIKE '%Test%');
```
