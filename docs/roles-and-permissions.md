# MensSana — Rollen & Berechtigungen (MVP)

**Stand: 2026-04-03**

---

## Rollen

| Rolle | Beschreibung |
|---|---|
| `user` | Nutzer der Companion-App (Betroffene Person) |
| `caregiver` | Professionelle Pflegeperson, Arzt, Betreuerin |
| `family` | Angehörige/r |

Rollen werden in `profiles.role` gespeichert.
Neue Registrierungen erhalten automatisch `role = 'user'`.
Rollen werden manuell über den Supabase Table Editor vergeben.

---

## Berechtigungs-Matrix (MVP)

### Tabelle: `profiles`

| Aktion | user (eigene) | caregiver | family |
|---|---|---|---|
| SELECT | ✅ | ✅ (zugewiesene) | ✅ (zugewiesene) |
| INSERT | ✅ (eigenes) | ❌ | ❌ |
| UPDATE | ✅ (eigenes) | ❌ | ❌ |
| DELETE | ❌ | ❌ | ❌ |

### Tabelle: `conversations`

| Aktion | user (eigene) | caregiver | family |
|---|---|---|---|
| SELECT | ✅ | ✅ (zugewiesene) | ✅ (zugewiesene) |
| INSERT | ✅ | ❌ | ❌ |
| UPDATE | ✅ | ❌ | ❌ |
| DELETE | ✅ | ❌ | ❌ |

### Tabelle: `messages`

| Aktion | user (eigene) | caregiver | family |
|---|---|---|---|
| SELECT | ✅ | ✅ (zugewiesene) | ✅ (zugewiesene) |
| INSERT | ✅ | ❌ | ❌ |
| UPDATE | ❌ | ❌ | ❌ |
| DELETE | ✅ | ❌ | ❌ |

### Tabelle: `medications`

| Aktion | user (eigene) | caregiver | family |
|---|---|---|---|
| SELECT | ✅ | ✅ (zugewiesene) | ✅ (zugewiesene) |
| INSERT | ✅ | ✅ (zugewiesene) | ❌ |
| UPDATE | ✅ | ✅ (zugewiesene) | ❌ |
| DELETE | ✅ | ✅ (zugewiesene) | ❌ |

### Tabelle: `calendar_events`

| Aktion | user (eigene) | caregiver | family |
|---|---|---|---|
| SELECT | ✅ | ✅ (zugewiesene) | ✅ (zugewiesene) |
| INSERT | ✅ | ✅ (zugewiesene) | ❌ |
| UPDATE | ✅ | ✅ (zugewiesene) | ❌ |
| DELETE | ✅ | ✅ (zugewiesene) | ❌ |

### Tabelle: `mood_entries`

| Aktion | user (eigene) | caregiver | family |
|---|---|---|---|
| SELECT | ✅ | ✅ (zugewiesene) | ✅ (zugewiesene) |
| INSERT | ✅ | ❌ | ❌ |
| UPDATE | ✅ | ❌ | ❌ |
| DELETE | ❌ | ❌ | ❌ |

---

## Grundsätze

- **Caregiver darf organisatorisch helfen** (Medikamente planen, Termine eintragen) —
  aber nicht Gesprächs- oder Stimmungsdaten verfälschen.
- **Family bleibt im MVP konservativ** (read-only überall).
  Später optional: Fotos, Hinweise, Kommunikationsanfragen.
- **Zuordnung über `caregiver_assignments`** — Caregiver/Family sehen nur Daten
  von Nutzern, denen sie explizit zugewiesen wurden.
- **Audit-Felder** (`created_by`, `updated_by`) sind in `medications` und `calendar_events`
  implementiert. Werden bei jeder Aktion mit der User-ID des Ausführenden befüllt.
  Im Dashboard wird ein **P**-Badge angezeigt wenn ein Caregiver einen Eintrag erstellt
  oder zuletzt bearbeitet hat (blau = erstellt, orange = zuletzt bearbeitet).
  SQL: `docs/sql/audit-columns.sql`

---

## Zuordnung (Assignments)

```sql
-- Wer betreut wen?
select * from caregiver_assignments;

-- Neue Zuweisung (manuell im Supabase Table Editor):
-- user_id     = UUID des Nutzers (Companion-App)
-- caregiver_id = UUID der Pflegeperson oder Angehörigen
```

Sowohl `caregiver` als auch `family`-Rollen nutzen dieselbe Tabelle
(`caregiver_assignments`). Die Berechtigungen unterscheiden sich aber:
Caregivers dürfen schreiben, Family nur lesen.
