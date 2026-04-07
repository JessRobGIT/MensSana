-- MensSana — Phase 4.1: To-Do System
-- Migration: 20260406000000_add_todo_system

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.todo_lists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.todo_lists is 'Named task lists belonging to a user.';

create table if not exists public.todo_items (
  id           uuid primary key default gen_random_uuid(),
  list_id      uuid not null references public.todo_lists(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  notes        text,
  status       text not null default 'open' check (status in ('open', 'done', 'archived')),
  due_at       timestamptz,
  created_by   uuid references auth.users(id),
  updated_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz
);
comment on table public.todo_items is 'Individual tasks within a todo list.';

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_todo_lists_user_id on public.todo_lists(user_id);
create index if not exists idx_todo_items_list_id on public.todo_items(list_id);
create index if not exists idx_todo_items_user_id on public.todo_items(user_id);
create index if not exists idx_todo_items_status  on public.todo_items(status);

-- ============================================================
-- UPDATED_AT TRIGGERS  (reuse existing public.update_updated_at)
-- ============================================================

create trigger trg_todo_lists_updated_at
  before update on public.todo_lists
  for each row execute function public.update_updated_at();

create trigger trg_todo_items_updated_at
  before update on public.todo_items
  for each row execute function public.update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.todo_lists enable row level security;
alter table public.todo_items enable row level security;

-- Drop existing policies so re-running this migration is idempotent
drop policy if exists "Users manage own todo_lists"              on public.todo_lists;
drop policy if exists "Users manage own todo_items"              on public.todo_items;
drop policy if exists "Caregivers select assigned todo_lists"    on public.todo_lists;
drop policy if exists "Caregivers insert assigned todo_lists"    on public.todo_lists;
drop policy if exists "Caregivers update assigned todo_lists"    on public.todo_lists;
drop policy if exists "Caregivers select assigned todo_items"    on public.todo_items;
drop policy if exists "Caregivers insert assigned todo_items"    on public.todo_items;
drop policy if exists "Caregivers update assigned todo_items"    on public.todo_items;
drop policy if exists "Family reads assigned todo_lists"         on public.todo_lists;
drop policy if exists "Family reads assigned todo_items"         on public.todo_items;

-- ── Users: full access to own data ────────────────────────

create policy "Users manage own todo_lists"
  on public.todo_lists for all
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own todo_items"
  on public.todo_items for all
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Caregivers: read + write for assigned users ───────────

create policy "Caregivers select assigned todo_lists"
  on public.todo_lists for select
  using (exists (
    select 1 from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid() and ca.user_id = todo_lists.user_id
  ));

create policy "Caregivers insert assigned todo_lists"
  on public.todo_lists for insert
  with check (exists (
    select 1 from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid() and ca.user_id = todo_lists.user_id
  ));

create policy "Caregivers update assigned todo_lists"
  on public.todo_lists for update
  using (exists (
    select 1 from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid() and ca.user_id = todo_lists.user_id
  ));

create policy "Caregivers select assigned todo_items"
  on public.todo_items for select
  using (exists (
    select 1 from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid() and ca.user_id = todo_items.user_id
  ));

create policy "Caregivers insert assigned todo_items"
  on public.todo_items for insert
  with check (exists (
    select 1 from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid() and ca.user_id = todo_items.user_id
  ));

create policy "Caregivers update assigned todo_items"
  on public.todo_items for update
  using (exists (
    select 1 from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid() and ca.user_id = todo_items.user_id
  ));

-- ── Family: read-only for assigned users ──────────────────

create policy "Family reads assigned todo_lists"
  on public.todo_lists for select
  using (exists (
    select 1 from public.caregiver_assignments ca
    join public.profiles p on p.id = auth.uid() and p.role = 'family'
    where ca.caregiver_id = auth.uid() and ca.user_id = todo_lists.user_id
  ));

create policy "Family reads assigned todo_items"
  on public.todo_items for select
  using (exists (
    select 1 from public.caregiver_assignments ca
    join public.profiles p on p.id = auth.uid() and p.role = 'family'
    where ca.caregiver_id = auth.uid() and ca.user_id = todo_items.user_id
  ));
