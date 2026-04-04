-- Phase 4.1 — To-Do System Schema
-- Run once in Supabase SQL Editor

-- ── Tables ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS todo_lists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS todo_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id      uuid NOT NULL REFERENCES todo_lists(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL,
  notes        text,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'archived')),
  due_at       timestamptz,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- ── Indexes ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_todo_lists_user_id ON todo_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_todo_items_list_id ON todo_items(list_id);
CREATE INDEX IF NOT EXISTS idx_todo_items_user_id ON todo_items(user_id);
CREATE INDEX IF NOT EXISTS idx_todo_items_status  ON todo_items(status);

-- ── updated_at trigger ────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER todo_lists_updated_at
  BEFORE UPDATE ON todo_lists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER todo_items_updated_at
  BEFORE UPDATE ON todo_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────

ALTER TABLE todo_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_items ENABLE ROW LEVEL SECURITY;

-- Users: full access to own data
CREATE POLICY "Users manage own todo_lists"
  ON todo_lists FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own todo_items"
  ON todo_items FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Caregivers: read + write for assigned users
CREATE POLICY "Caregivers select assigned todo_lists"
  ON todo_lists FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM caregiver_assignments ca
    WHERE ca.caregiver_id = auth.uid() AND ca.user_id = todo_lists.user_id
  ));

CREATE POLICY "Caregivers insert assigned todo_lists"
  ON todo_lists FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM caregiver_assignments ca
    WHERE ca.caregiver_id = auth.uid() AND ca.user_id = todo_lists.user_id
  ));

CREATE POLICY "Caregivers update assigned todo_lists"
  ON todo_lists FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM caregiver_assignments ca
    WHERE ca.caregiver_id = auth.uid() AND ca.user_id = todo_lists.user_id
  ));

CREATE POLICY "Caregivers select assigned todo_items"
  ON todo_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM caregiver_assignments ca
    WHERE ca.caregiver_id = auth.uid() AND ca.user_id = todo_items.user_id
  ));

CREATE POLICY "Caregivers insert assigned todo_items"
  ON todo_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM caregiver_assignments ca
    WHERE ca.caregiver_id = auth.uid() AND ca.user_id = todo_items.user_id
  ));

CREATE POLICY "Caregivers update assigned todo_items"
  ON todo_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM caregiver_assignments ca
    WHERE ca.caregiver_id = auth.uid() AND ca.user_id = todo_items.user_id
  ));

-- Family: read-only
CREATE POLICY "Family reads assigned todo_lists"
  ON todo_lists FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM caregiver_assignments ca
    JOIN profiles p ON p.id = auth.uid() AND p.role = 'family'
    WHERE ca.caregiver_id = auth.uid() AND ca.user_id = todo_lists.user_id
  ));

CREATE POLICY "Family reads assigned todo_items"
  ON todo_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM caregiver_assignments ca
    JOIN profiles p ON p.id = auth.uid() AND p.role = 'family'
    WHERE ca.caregiver_id = auth.uid() AND ca.user_id = todo_items.user_id
  ));
