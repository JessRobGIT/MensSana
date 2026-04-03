-- B5: Audit columns for medications and calendar_events
-- Run once in Supabase SQL Editor

ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Back-fill existing rows: assume owner created their own entries
UPDATE medications    SET created_by = user_id WHERE created_by IS NULL;
UPDATE calendar_events SET created_by = user_id WHERE created_by IS NULL;
