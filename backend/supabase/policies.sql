-- MensSana — RLS Policies (lesbare Referenz)
-- Das aktive Schema inkl. Policies liegt in supabase/migrations/20260328064834_initial_schema.sql

-- Prinzip:
--   'user'      → Vollzugriff auf eigene Daten
--   'caregiver' → Lesezugriff auf Daten der zugewiesenen User
--   'family'    → Lesezugriff (wie caregiver, via caregiver_assignments)

-- Alle Tabellen haben RLS aktiviert.
-- Policies pro Tabelle:
--   profiles             → own row (all) + caregiver (select)
--   caregiver_assignments → own rows (all)
--   conversations        → owner (all) + caregiver (select)
--   messages             → via conversation ownership + caregiver (select)
--   medications          → owner (all) + caregiver (select)
--   calendar_events      → owner (all) + caregiver (select)
--   mood_entries         → owner (all) + caregiver (select)
