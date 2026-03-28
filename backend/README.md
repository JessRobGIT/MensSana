# Backend — MensSana

Dieses Verzeichnis enthält Dokumentation und Hilfsdateien zum Backend.
Das aktive Schema und die Migrations liegen unter `supabase/` im Projektstamm
und werden über die Supabase CLI verwaltet.

## Supabase-Projekt

- **Projekt:** MensSana
- **Ref:** sycfzysiwshdijeintyt
- **Region:** North EU (Stockholm)
- **Dashboard:** https://supabase.com/dashboard/project/sycfzysiwshdijeintyt

## Struktur

```
supabase/                        ← CLI-verwaltetes Verzeichnis (Projektstamm)
├─ config.toml
└─ migrations/
   └─ 20260328064834_initial_schema.sql

backend/
├─ supabase/
│  ├─ schema.sql     # Lesbare Referenz des aktuellen Schemas
│  ├─ policies.sql   # Lesbare Referenz der RLS-Policies
│  └─ seed.sql       # Testdaten
└─ functions/
   └─ README.md
```

## Technologie

- **Datenbank:** Supabase (PostgreSQL 17, Stockholm)
- **Auth:** Supabase Auth (mit Auto-Profile-Trigger)
- **Funktionen:** Supabase Edge Functions (geplant Phase 2)

## Datenbankschema (Phase 1)

| Tabelle | Beschreibung |
|---|---|
| `profiles` | Nutzerprofil (role: user / caregiver / family) |
| `caregiver_assignments` | Verknüpfung Caregiver ↔ User |
| `conversations` | Chat-Sessions |
| `messages` | Einzelne Nachrichten pro Conversation |
| `medications` | Medikamentenpläne |
| `calendar_events` | Termine und Erinnerungen |
| `mood_entries` | Stimmungs-Tracking |

## Setup für neue Entwickler

```bash
# CLI installieren (einmalig)
# siehe: https://supabase.com/docs/guides/cli

# Mit Projekt verknüpfen
supabase link --project-ref sycfzysiwshdijeintyt

# Migrations anwenden
supabase db push
```
