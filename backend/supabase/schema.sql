-- MensSana — Datenbankschema (lesbare Referenz)
-- Das aktive Schema liegt in supabase/migrations/20260328064834_initial_schema.sql
-- Diese Datei dient nur als schnelle Übersicht.

-- Tabellen (Phase 1):
--   profiles             — Nutzerprofil (role: user | caregiver | family)
--   caregiver_assignments — Caregiver ↔ User Verknüpfung
--   conversations        — Chat-Sessions
--   messages             — Nachrichten pro Conversation
--   medications          — Medikamentenpläne
--   calendar_events      — Termine und Erinnerungen
--   mood_entries         — Stimmungs-Tracking (1–5)

-- Enums:
--   user_role           : user | caregiver | family
--   message_role        : user | assistant
--   medication_frequency: daily | weekly | as_needed
--   mood_level          : 1 | 2 | 3 | 4 | 5
