-- ============================================================
-- Vou PorOnde — Supabase Database Setup
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Users ────────────────────────────────────────────────────
-- Extends Supabase Auth (auth.users) with profile data
create table if not exists public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  username      text unique not null,
  country       text default 'Portugal',
  photo_url     text,
  is_admin      boolean default false,
  approved      boolean default false,
  joined_at     timestamptz default now(),
  visited_municipalities  text[] default '{}',
  visited_parishes        text[] default '{}'
);

alter table public.profiles enable row level security;

-- Policies
create policy "Users can read their own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Admin can read all profiles"
  on public.profiles for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admin can update all profiles"
  on public.profiles for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ── Suggestions ──────────────────────────────────────────────
create table if not exists public.suggestions (
  id              uuid default uuid_generate_v4() primary key,
  location_id     text not null,       -- map feature ID (e.g. "sagres__868")
  location_name   text not null,       -- human-readable name
  category        text not null check (category in ('visit','food','sweet','fest','other')),
  text            text not null,
  date_info       text,                -- festival date string
  photo_url       text,                -- stored in Supabase Storage
  author_id       uuid references auth.users(id) on delete set null,
  author_username text,
  status          text default 'pending' check (status in ('pending','approved','rejected')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.suggestions enable row level security;

create policy "Anyone can read approved suggestions"
  on public.suggestions for select using (status = 'approved');

create policy "Authors can read own suggestions"
  on public.suggestions for select using (auth.uid() = author_id);

create policy "Authenticated users can insert suggestions"
  on public.suggestions for insert with check (auth.uid() = author_id);

create policy "Authors can delete own suggestions"
  on public.suggestions for delete using (auth.uid() = author_id);

create policy "Admin can do everything with suggestions"
  on public.suggestions for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ── Gallery photos ───────────────────────────────────────────
create table if not exists public.gallery_photos (
  id              uuid default uuid_generate_v4() primary key,
  location_id     text not null,
  location_name   text,
  photo_url       text not null,
  caption         text,
  author_id       uuid references auth.users(id) on delete set null,
  author_username text,
  approved        boolean default false,
  created_at      timestamptz default now()
);

alter table public.gallery_photos enable row level security;

create policy "Anyone can read approved photos"
  on public.gallery_photos for select using (approved = true);

create policy "Authors can read own photos"
  on public.gallery_photos for select using (auth.uid() = author_id);

create policy "Authenticated users can insert photos"
  on public.gallery_photos for insert with check (auth.uid() = author_id);

create policy "Authors can delete own photos"
  on public.gallery_photos for delete using (auth.uid() = author_id);

create policy "Admin can manage all photos"
  on public.gallery_photos for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ── Storage bucket for images ────────────────────────────────
-- Run this separately in Supabase Storage settings or via API:
-- Create bucket "suggestion-photos" (public: true, max size: 2MB)
-- Create bucket "profile-photos" (public: true, max size: 1MB)

-- ── Helper function: auto-create profile on signup ───────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, country)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'country', 'Portugal')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Indexes for performance ───────────────────────────────────
create index if not exists idx_suggestions_location on public.suggestions(location_id);
create index if not exists idx_suggestions_status   on public.suggestions(status);
create index if not exists idx_suggestions_author   on public.suggestions(author_id);
create index if not exists idx_gallery_location     on public.gallery_photos(location_id);
create index if not exists idx_profiles_username    on public.profiles(username);

-- ── Sample admin account ──────────────────────────────────────
-- After creating your admin user via Supabase Auth,
-- run this to grant admin + approval:
-- update public.profiles set is_admin = true, approved = true where username = 'admin';

-- ============================================================
-- DONE! Next steps:
-- 1. Go to supabase.com → New project
-- 2. SQL Editor → paste and run this file
-- 3. Copy your project URL and anon key
-- 4. Add to .env: VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=...
-- ============================================================
