-- Orbital Uprise leaderboard. Run this once in the Supabase SQL editor (Project → SQL → New query).
create extension if not exists pgcrypto;

create table if not exists public.leaderboard (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  difficulty  text        not null,
  avg_score   numeric(6,1) not null,
  attempts    int         not null,
  created_at  timestamptz not null default now()
);

create index if not exists leaderboard_score_idx on public.leaderboard (avg_score desc, created_at);
create index if not exists leaderboard_difficulty_idx on public.leaderboard (difficulty, avg_score desc);

alter table public.leaderboard enable row level security;

-- Anyone can read the board.
drop policy if exists "public read" on public.leaderboard;
create policy "public read" on public.leaderboard
  for select to anon, authenticated
  using (true);

-- Anyone can add a run, but only a well-formed one. No update or delete policies exist,
-- so rows can't be changed or removed with the public (anon) key.
drop policy if exists "public insert checked" on public.leaderboard;
create policy "public insert checked" on public.leaderboard
  for insert to anon, authenticated
  with check (
    char_length(name) between 1 and 20
    and difficulty in ('easy', 'medium', 'hard')
    and attempts = 10
    and avg_score between 0 and 1400
  );

-- Optional: live updates in the game (Supabase realtime).
alter publication supabase_realtime add table public.leaderboard;
