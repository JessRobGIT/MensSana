-- MensSana — Initial Schema
-- Migration: 20260328064834_initial_schema
-- Covers Phase 1: profiles, conversations, messages,
--                 medications, calendar_events, mood_entries, roles

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('user', 'caregiver', 'family');
create type message_role as enum ('user', 'assistant');
create type medication_frequency as enum ('daily', 'weekly', 'as_needed');
create type mood_level as enum ('1','2','3','4','5');

-- ============================================================
-- PROFILES
-- One profile per auth.users entry.
-- role = 'user'      → the elderly person using the app
-- role = 'caregiver' → professional or primary carer
-- role = 'family'    → family member with read access
-- ============================================================
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         user_role not null default 'user',
  full_name    text,
  display_name text,
  avatar_url   text,
  language     text not null default 'de',
  timezone     text not null default 'Europe/Berlin',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table profiles is 'Extended user profile, one row per auth user.';

-- ============================================================
-- CAREGIVER ASSIGNMENTS
-- Links caregivers/family members to the user they support.
-- ============================================================
create table caregiver_assignments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  caregiver_id uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique(user_id, caregiver_id)
);
comment on table caregiver_assignments is 'Maps caregivers and family members to the user they support.';

-- ============================================================
-- CONVERSATIONS
-- A conversation is a named session between user and assistant.
-- ============================================================
create table conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table conversations is 'Chat sessions between user and AI assistant.';

-- ============================================================
-- MESSAGES
-- Individual turns within a conversation.
-- ============================================================
create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role            message_role not null,
  content         text not null,
  created_at      timestamptz not null default now()
);
comment on table messages is 'Individual messages within a conversation.';

-- ============================================================
-- MEDICATIONS
-- Medication schedule for a user.
-- ============================================================
create table medications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  name        text not null,
  dosage      text,
  frequency   medication_frequency not null default 'daily',
  time_of_day time,
  notes       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table medications is 'Medication plans and schedules per user.';

-- ============================================================
-- CALENDAR EVENTS
-- Appointments and reminders for a user.
-- ============================================================
create table calendar_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text not null,
  description text,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  all_day     boolean not null default false,
  reminder_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table calendar_events is 'Appointments and reminders per user.';

-- ============================================================
-- MOOD ENTRIES
-- Daily mood tracking.
-- ============================================================
create table mood_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  mood        mood_level not null,
  note        text,
  recorded_at timestamptz not null default now()
);
comment on table mood_entries is 'Daily mood check-ins per user.';

-- ============================================================
-- INDEXES
-- ============================================================
create index on conversations(user_id);
create index on messages(conversation_id);
create index on medications(user_id);
create index on calendar_events(user_id, starts_at);
create index on mood_entries(user_id, recorded_at);
create index on caregiver_assignments(caregiver_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger trg_conversations_updated_at
  before update on conversations
  for each row execute function update_updated_at();

create trigger trg_medications_updated_at
  before update on medications
  for each row execute function update_updated_at();

create trigger trg_calendar_events_updated_at
  before update on calendar_events
  for each row execute function update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGN-UP
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, display_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'display_name'
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles              enable row level security;
alter table caregiver_assignments enable row level security;
alter table conversations         enable row level security;
alter table messages              enable row level security;
alter table medications           enable row level security;
alter table calendar_events       enable row level security;
alter table mood_entries          enable row level security;

-- profiles: users see their own; caregivers see assigned users
create policy "profiles: own row"
  on profiles for all
  using (auth.uid() = id);

create policy "profiles: caregiver read"
  on profiles for select
  using (
    exists (
      select 1 from caregiver_assignments
      where caregiver_id = auth.uid() and user_id = profiles.id
    )
  );

-- caregiver_assignments: caregiver or user can see their own links
create policy "assignments: own rows"
  on caregiver_assignments for all
  using (auth.uid() = user_id or auth.uid() = caregiver_id);

-- conversations: owner only (+ caregiver read)
create policy "conversations: owner"
  on conversations for all
  using (auth.uid() = user_id);

create policy "conversations: caregiver read"
  on conversations for select
  using (
    exists (
      select 1 from caregiver_assignments
      where caregiver_id = auth.uid() and user_id = conversations.user_id
    )
  );

-- messages: via conversation ownership
create policy "messages: owner"
  on messages for all
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

create policy "messages: caregiver read"
  on messages for select
  using (
    exists (
      select 1 from conversations c
      join caregiver_assignments ca on ca.user_id = c.user_id
      where c.id = messages.conversation_id and ca.caregiver_id = auth.uid()
    )
  );

-- medications: owner + caregiver read
create policy "medications: owner"
  on medications for all
  using (auth.uid() = user_id);

create policy "medications: caregiver read"
  on medications for select
  using (
    exists (
      select 1 from caregiver_assignments
      where caregiver_id = auth.uid() and user_id = medications.user_id
    )
  );

-- calendar_events: owner + caregiver read
create policy "calendar_events: owner"
  on calendar_events for all
  using (auth.uid() = user_id);

create policy "calendar_events: caregiver read"
  on calendar_events for select
  using (
    exists (
      select 1 from caregiver_assignments
      where caregiver_id = auth.uid() and user_id = calendar_events.user_id
    )
  );

-- mood_entries: owner + caregiver read
create policy "mood_entries: owner"
  on mood_entries for all
  using (auth.uid() = user_id);

create policy "mood_entries: caregiver read"
  on mood_entries for select
  using (
    exists (
      select 1 from caregiver_assignments
      where caregiver_id = auth.uid() and user_id = mood_entries.user_id
    )
  );
