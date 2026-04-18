-- Phase 3.1: Add entry_date to mood_entries for one-per-day upsert logic
alter table mood_entries
  add column entry_date date not null default current_date;

-- Backfill existing rows from recorded_at
update mood_entries
  set entry_date = recorded_at::date;

-- Unique constraint: one mood per user per day
create unique index mood_entries_user_date
  on mood_entries(user_id, entry_date);

-- Keep recorded_at index, add entry_date index for dashboard queries
create index on mood_entries(user_id, entry_date desc);
