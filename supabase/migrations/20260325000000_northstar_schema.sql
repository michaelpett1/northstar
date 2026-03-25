-- ─────────────────────────────────────────────────────────────────────────────
-- Northstar — full schema
-- Run this in your Supabase SQL editor or via: supabase db push
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── Enums ─────────────────────────────────────────────────────────────────────

create type item_type       as enum ('project', 'milestone', 'task');
create type item_status     as enum ('not_started', 'in_progress', 'at_risk', 'complete');
create type priority_level  as enum ('p0', 'p1', 'p2', 'p3');
create type okr_status      as enum ('on_track', 'at_risk', 'off_track');
create type metric_type     as enum ('number', 'percentage', 'currency', 'binary');
create type activity_type   as enum ('status_change', 'progress', 'created', 'checkin');

-- ── Team members ──────────────────────────────────────────────────────────────

create table if not exists team_members (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  email       text not null unique,
  avatar_url  text not null default '',
  role        text not null default 'Member',
  created_at  timestamptz not null default now()
);

-- ── Timeline items ────────────────────────────────────────────────────────────

create table if not exists timeline_items (
  id            text primary key default gen_random_uuid()::text,
  title         text not null,
  description   text not null default '',
  type          item_type not null default 'task',
  parent_id     text references timeline_items(id) on delete set null,
  status        item_status not null default 'not_started',
  priority      priority_level not null default 'p2',
  owner_id      text references team_members(id) on delete set null,
  start_date    date not null,
  end_date      date not null,
  progress      integer not null default 0 check (progress between 0 and 100),
  dependencies  text[] not null default '{}',
  tags          text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger timeline_items_updated_at
  before update on timeline_items
  for each row execute procedure update_updated_at();

-- ── Objectives ────────────────────────────────────────────────────────────────

create table if not exists objectives (
  id          text primary key default gen_random_uuid()::text,
  title       text not null,
  description text not null default '',
  owner_id    text references team_members(id) on delete set null,
  period      text not null,             -- e.g. "2026-Q2"
  status      okr_status not null default 'on_track',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger objectives_updated_at
  before update on objectives
  for each row execute procedure update_updated_at();

-- ── Key results ───────────────────────────────────────────────────────────────

create table if not exists key_results (
  id              text primary key default gen_random_uuid()::text,
  objective_id    text not null references objectives(id) on delete cascade,
  title           text not null,
  owner_id        text references team_members(id) on delete set null,
  metric_type     metric_type not null default 'number',
  start_value     numeric not null default 0,
  current_value   numeric not null default 0,
  target_value    numeric not null default 100,
  confidence      okr_status not null default 'on_track',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger key_results_updated_at
  before update on key_results
  for each row execute procedure update_updated_at();

-- ── Check-ins ─────────────────────────────────────────────────────────────────

create table if not exists check_ins (
  id              text primary key default gen_random_uuid()::text,
  key_result_id   text not null references key_results(id) on delete cascade,
  value           numeric not null,
  note            text not null default '',
  created_at      timestamptz not null default now()
);

-- ── Activity events ───────────────────────────────────────────────────────────

create table if not exists activity_events (
  id          text primary key default gen_random_uuid()::text,
  text        text not null,
  type        activity_type not null default 'created',
  created_at  timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Open read/write for now (single-workspace app). Tighten per user once auth is added.

alter table team_members     enable row level security;
alter table timeline_items   enable row level security;
alter table objectives       enable row level security;
alter table key_results      enable row level security;
alter table check_ins        enable row level security;
alter table activity_events  enable row level security;

-- Public read-write policy (replace with auth-scoped policies when you add auth)
create policy "allow_all_team_members"    on team_members    for all using (true) with check (true);
create policy "allow_all_timeline_items"  on timeline_items  for all using (true) with check (true);
create policy "allow_all_objectives"      on objectives      for all using (true) with check (true);
create policy "allow_all_key_results"     on key_results     for all using (true) with check (true);
create policy "allow_all_check_ins"       on check_ins       for all using (true) with check (true);
create policy "allow_all_activity"        on activity_events for all using (true) with check (true);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index on timeline_items (parent_id);
create index on timeline_items (owner_id);
create index on timeline_items (status);
create index on key_results    (objective_id);
create index on check_ins      (key_result_id);
create index on activity_events (created_at desc);
