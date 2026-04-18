-- Invite code system: allows caregivers/family to be onboarded without manual Supabase access

create table invite_codes (
  id         uuid        primary key default gen_random_uuid(),
  code       text        unique not null,
  role       text        not null check (role in ('caregiver', 'family')),
  patient_id uuid        references profiles(id) on delete cascade,
  created_by uuid        references profiles(id),
  used_by    uuid        references profiles(id),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

alter table invite_codes enable row level security;

-- Anyone (incl. anon) can read codes — needed for pre-validation before signup
create policy "invite_codes: public read"
  on invite_codes for select
  using (true);

-- Authenticated caregivers/family can create codes for their patients
create policy "invite_codes: caregiver insert"
  on invite_codes for insert
  with check (auth.uid() = created_by);

-- Authenticated user can claim an unused, unexpired code (set used_by = self)
create policy "invite_codes: claim"
  on invite_codes for update
  using  (used_by is null and expires_at > now())
  with check (used_by = auth.uid());
