-- MensSana — Phase 4.2: Internal Messaging
-- Migration: 20260406120000_add_messaging

-- ============================================================
-- TABLE
-- ============================================================

create table if not exists public.internal_messages (
  id         uuid primary key default gen_random_uuid(),
  from_id    uuid not null
               constraint internal_messages_from_id_fkey
               references public.profiles(id) on delete cascade,
  to_id      uuid not null
               constraint internal_messages_to_id_fkey
               references public.profiles(id) on delete cascade,
  content    text not null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
comment on table public.internal_messages is
  'Direct messages between users and their caregivers/family members.';

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_internal_messages_to_id   on public.internal_messages(to_id);
create index if not exists idx_internal_messages_from_id on public.internal_messages(from_id);
create index if not exists idx_internal_messages_unread
  on public.internal_messages(to_id) where read_at is null;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.internal_messages enable row level security;

-- Drop existing policies so re-running is idempotent
drop policy if exists "Sender sees own messages"              on public.internal_messages;
drop policy if exists "Recipient sees own messages"           on public.internal_messages;
drop policy if exists "User can message assigned caregivers"  on public.internal_messages;
drop policy if exists "Caregiver can message assigned users"  on public.internal_messages;
drop policy if exists "Recipient can mark messages read"      on public.internal_messages;

-- Sender sees own outbox
create policy "Sender sees own messages"
  on public.internal_messages for select
  using (auth.uid() = from_id);

-- Recipient sees own inbox
create policy "Recipient sees own messages"
  on public.internal_messages for select
  using (auth.uid() = to_id);

-- User can message their assigned caregivers/family
create policy "User can message assigned caregivers"
  on public.internal_messages for insert
  with check (
    auth.uid() = from_id and
    exists (
      select 1 from public.caregiver_assignments
      where user_id = auth.uid() and caregiver_id = to_id
    )
  );

-- Caregiver/family can message their assigned users
create policy "Caregiver can message assigned users"
  on public.internal_messages for insert
  with check (
    auth.uid() = from_id and
    exists (
      select 1 from public.caregiver_assignments
      where caregiver_id = auth.uid() and user_id = to_id
    )
  );

-- Recipient can mark messages as read
create policy "Recipient can mark messages read"
  on public.internal_messages for update
  using     (auth.uid() = to_id)
  with check (auth.uid() = to_id);
