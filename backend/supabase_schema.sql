-- AI Job Application Engine — Supabase Schema
-- Run this in the Supabase SQL editor

-- Users table (extends Supabase auth or standalone)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text not null,
  password_hash text not null,
  created_at timestamptz default now()
);

-- User personas (one per user, upserted on update)
create table if not exists personas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  location text,
  linkedin_url text,
  summary text,
  skills jsonb default '[]',
  experience jsonb default '[]',
  education jsonb default '[]',
  achievements jsonb default '[]',
  certifications jsonb default '[]',
  structured_json jsonb,
  updated_at timestamptz default now(),
  unique(user_id)
);

-- Job generation history
create table if not exists generation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  job_url text,
  job_data jsonb,
  match_score jsonb,
  outputs jsonb,
  created_at timestamptz default now()
);

-- Job analyses (standalone scrape/analyse without full generation)
create table if not exists job_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  source_url text,
  job_data jsonb,
  created_at timestamptz default now()
);

-- Career advisor chat messages
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

-- Google Drive OAuth tokens
create table if not exists drive_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade unique,
  tokens jsonb not null,
  updated_at timestamptz default now()
);

-- Row Level Security
alter table users enable row level security;
alter table personas enable row level security;
alter table generation_history enable row level security;
alter table job_analyses enable row level security;
alter table chat_messages enable row level security;
alter table drive_tokens enable row level security;

-- Policies (service role bypasses RLS, used by backend)
create policy "Service role full access" on users using (true) with check (true);
create policy "Service role full access" on personas using (true) with check (true);
create policy "Service role full access" on generation_history using (true) with check (true);
create policy "Service role full access" on job_analyses using (true) with check (true);
create policy "Service role full access" on chat_messages using (true) with check (true);
create policy "Service role full access" on drive_tokens using (true) with check (true);
