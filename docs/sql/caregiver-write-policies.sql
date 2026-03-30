-- MensSana — Caregiver Write Policies
-- Arbeitspaket B2 + B3
-- Stand: 2026-03-30
--
-- Ausführen im Supabase SQL Editor.
-- Voraussetzung: caregiver_assignments Tabelle mit (caregiver_id, user_id) existiert.
--
-- Diese Policies ERGÄNZEN bestehende Read-Policies.
-- Bestehende Policies werden nicht gelöscht.

-- ── medications ──────────────────────────────────────────

create policy "medications: caregiver insert"
on public.medications
for insert
with check (
  exists (
    select 1
    from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid()
      and ca.user_id = medications.user_id
  )
);

create policy "medications: caregiver update"
on public.medications
for update
using (
  exists (
    select 1
    from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid()
      and ca.user_id = medications.user_id
  )
)
with check (
  exists (
    select 1
    from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid()
      and ca.user_id = medications.user_id
  )
);

create policy "medications: caregiver delete"
on public.medications
for delete
using (
  exists (
    select 1
    from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid()
      and ca.user_id = medications.user_id
  )
);

-- ── calendar_events ───────────────────────────────────────

create policy "calendar_events: caregiver insert"
on public.calendar_events
for insert
with check (
  exists (
    select 1
    from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid()
      and ca.user_id = calendar_events.user_id
  )
);

create policy "calendar_events: caregiver update"
on public.calendar_events
for update
using (
  exists (
    select 1
    from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid()
      and ca.user_id = calendar_events.user_id
  )
)
with check (
  exists (
    select 1
    from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid()
      and ca.user_id = calendar_events.user_id
  )
);

create policy "calendar_events: caregiver delete"
on public.calendar_events
for delete
using (
  exists (
    select 1
    from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid()
      and ca.user_id = calendar_events.user_id
  )
);
