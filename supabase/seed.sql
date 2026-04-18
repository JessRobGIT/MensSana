-- MensSana — Seed-Daten für Testumgebung
-- Voraussetzung: Auth-Accounts bereits in Supabase angelegt (siehe docs/test-accounts.md)
-- UUIDs der angelegten Auth-Users hier eintragen:

\set user_anna    'BITTE-UUID-VON-anna.test-EINTRAGEN'
\set user_hans    'BITTE-UUID-VON-hans.test-EINTRAGEN'
\set user_pflege  'BITTE-UUID-VON-pflege.test-EINTRAGEN'
\set user_familie 'BITTE-UUID-VON-familie.test-EINTRAGEN'

-- ── Profile ─────────────────────────────────────────────
INSERT INTO profiles (id, full_name, display_name, role) VALUES
  (:'user_anna',    'Anna Müller (Test)',    'Anna',   'user'),
  (:'user_hans',    'Hans Weber (Test)',     'Hans',   'user'),
  (:'user_pflege',  'Maria Schmidt (Test)',  'Maria',  'caregiver'),
  (:'user_familie', 'Peter Müller (Test)',   'Peter',  'family')
ON CONFLICT (id) DO UPDATE SET
  full_name    = EXCLUDED.full_name,
  display_name = EXCLUDED.display_name,
  role         = EXCLUDED.role;

-- ── Caregiver-Zuweisung ──────────────────────────────────
INSERT INTO caregiver_assignments (caregiver_id, user_id) VALUES
  (:'user_pflege',  :'user_anna'),
  (:'user_familie', :'user_anna')
ON CONFLICT DO NOTHING;

-- ── Medikamente (Anna) ───────────────────────────────────
INSERT INTO medications (user_id, name, dosage, time_of_day, frequency, notes, active, created_by) VALUES
  (:'user_anna', 'Ramipril',   '5 mg',   '08:00', 'daily',    'Zum Frühstück nehmen',  true, :'user_pflege'),
  (:'user_anna', 'Metformin',  '500 mg', '12:00', 'daily',    'Zur Mittagszeit',       true, :'user_pflege'),
  (:'user_anna', 'Vitamin D',  '1000 IE','08:00', 'daily',    'Mit einem Glas Wasser', true, :'user_pflege'),
  (:'user_anna', 'Ibuprofen',  '400 mg', null,    'as_needed','Bei Bedarf',            true, :'user_pflege');

-- ── Kalendereinträge (Anna) ──────────────────────────────
INSERT INTO calendar_events (user_id, title, starts_at, all_day, frequency, description, created_by) VALUES
  (:'user_anna', 'Hausarzt Dr. Berger',
    (NOW() + INTERVAL '3 days')::date || 'T10:00:00+02:00',
    false, 'once', 'Blutdruckkontrolle, Überweisung mitbringen', :'user_pflege'),
  (:'user_anna', 'Physiotherapie',
    (NOW() + INTERVAL '1 day')::date || 'T14:30:00+02:00',
    false, 'weekly', 'Raum 3, 2. Stock', :'user_pflege'),
  (:'user_anna', 'Geburtstag Peter',
    (DATE_TRUNC('year', NOW()) + INTERVAL '5 months')::date || 'T00:00:00+02:00',
    true, 'yearly', null, :'user_pflege');

-- ── To-Do-Liste (Anna) ───────────────────────────────────
INSERT INTO todo_lists (user_id, name, created_by) VALUES
  (:'user_anna', 'Aufgaben', :'user_anna')
ON CONFLICT DO NOTHING;

INSERT INTO todo_items (user_id, list_id, title, status, due_at, created_by)
SELECT
  :'user_anna',
  l.id,
  item.title,
  item.status,
  item.due_at,
  :'user_pflege'
FROM todo_lists l,
  (VALUES
    ('Apotheke: Ramipril Nachschub',   'open', (NOW() + INTERVAL '2 days')::date || 'T12:00:00Z'),
    ('Enkelin zurückrufen',            'open', NOW()::date || 'T12:00:00Z'),
    ('Krankenkasse Formular ausfüllen','open', (NOW() - INTERVAL '1 day')::date || 'T12:00:00Z'),
    ('Wäsche waschen',                 'done', null)
  ) AS item(title, status, due_at)
WHERE l.user_id = :'user_anna'
  AND l.name = 'Aufgaben';

-- ── Stimmung letzte 7 Tage (Anna) ────────────────────────
INSERT INTO mood_entries (user_id, mood, entry_date, recorded_at) VALUES
  (:'user_anna', '4', CURRENT_DATE - 6, NOW() - INTERVAL '6 days'),
  (:'user_anna', '3', CURRENT_DATE - 5, NOW() - INTERVAL '5 days'),
  (:'user_anna', '4', CURRENT_DATE - 4, NOW() - INTERVAL '4 days'),
  (:'user_anna', '2', CURRENT_DATE - 3, NOW() - INTERVAL '3 days'),
  (:'user_anna', '3', CURRENT_DATE - 2, NOW() - INTERVAL '2 days'),
  (:'user_anna', '4', CURRENT_DATE - 1, NOW() - INTERVAL '1 day'),
  (:'user_anna', '3', CURRENT_DATE,     NOW())
ON CONFLICT (user_id, entry_date) DO NOTHING;
