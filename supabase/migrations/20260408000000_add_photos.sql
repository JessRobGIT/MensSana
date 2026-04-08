-- MensSana — Phase 4.5: Photo Albums
-- Migration: 20260408000000_add_photos

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.photo_albums (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.photo_albums is 'Named photo albums belonging to a user (patient).';

create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  album_id     uuid not null references public.photo_albums(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  caption      text,
  taken_at     date,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);
comment on table public.photos is 'Individual photos within a photo album.';

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_photo_albums_user_id on public.photo_albums(user_id);
create index if not exists idx_photos_album_id      on public.photos(album_id);
create index if not exists idx_photos_user_id       on public.photos(user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create trigger trg_photo_albums_updated_at
  before update on public.photo_albums
  for each row execute function public.update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.photo_albums enable row level security;
alter table public.photos       enable row level security;

drop policy if exists "Patients read own photo_albums"          on public.photo_albums;
drop policy if exists "Caregivers manage assigned photo_albums" on public.photo_albums;
drop policy if exists "Family reads assigned photo_albums"      on public.photo_albums;
drop policy if exists "Patients read own photos"                on public.photos;
drop policy if exists "Caregivers manage assigned photos"       on public.photos;
drop policy if exists "Family reads assigned photos"            on public.photos;

-- Patients: read own
create policy "Patients read own photo_albums"
  on public.photo_albums for select
  using (auth.uid() = user_id);

create policy "Patients read own photos"
  on public.photos for select
  using (auth.uid() = user_id);

-- Caregivers: full access for assigned users
create policy "Caregivers manage assigned photo_albums"
  on public.photo_albums for all
  using (exists (
    select 1 from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid() and ca.user_id = photo_albums.user_id
  ))
  with check (exists (
    select 1 from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid() and ca.user_id = photo_albums.user_id
  ));

create policy "Caregivers manage assigned photos"
  on public.photos for all
  using (exists (
    select 1 from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid() and ca.user_id = photos.user_id
  ))
  with check (exists (
    select 1 from public.caregiver_assignments ca
    where ca.caregiver_id = auth.uid() and ca.user_id = photos.user_id
  ));

-- Family: read-only
create policy "Family reads assigned photo_albums"
  on public.photo_albums for select
  using (exists (
    select 1 from public.caregiver_assignments ca
    join public.profiles p on p.id = auth.uid() and p.role = 'family'
    where ca.caregiver_id = auth.uid() and ca.user_id = photo_albums.user_id
  ));

create policy "Family reads assigned photos"
  on public.photos for select
  using (exists (
    select 1 from public.caregiver_assignments ca
    join public.profiles p on p.id = auth.uid() and p.role = 'family'
    where ca.caregiver_id = auth.uid() and ca.user_id = photos.user_id
  ));

-- ============================================================
-- STORAGE BUCKET
-- (Run separately in Supabase SQL Editor if bucket already exists)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos', 'photos', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/gif']
)
on conflict (id) do nothing;

-- Storage RLS policies
drop policy if exists "Users read own photos"             on storage.objects;
drop policy if exists "Caregivers read assigned photos"   on storage.objects;
drop policy if exists "Caregivers upload photos"          on storage.objects;
drop policy if exists "Caregivers delete photos"          on storage.objects;

-- Patients can read their own photos (path: {user_id}/...)
create policy "Users read own photos"
  on storage.objects for select
  using (
    bucket_id = 'photos'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Caregivers can read photos of assigned users
create policy "Caregivers read assigned photos"
  on storage.objects for select
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.caregiver_assignments ca
      where ca.caregiver_id = auth.uid()
        and ca.user_id::text = (string_to_array(name, '/'))[1]
    )
  );

-- Caregivers can upload photos for assigned users
create policy "Caregivers upload photos"
  on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and exists (
      select 1 from public.caregiver_assignments ca
      where ca.caregiver_id = auth.uid()
        and ca.user_id::text = (string_to_array(name, '/'))[1]
    )
  );

-- Caregivers can delete photos for assigned users
create policy "Caregivers delete photos"
  on storage.objects for delete
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.caregiver_assignments ca
      where ca.caregiver_id = auth.uid()
        and ca.user_id::text = (string_to_array(name, '/'))[1]
    )
  );
