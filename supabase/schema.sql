-- Ryan's Morse Code Trainer — cloud state for signed-in learners.
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query → Run).
--
-- One JSONB row per user holds the whole SaveState (settings + Send + Receive
-- progress). Row-Level Security ensures each user can only read/write their own.

create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

drop policy if exists "user_state select own" on public.user_state;
create policy "user_state select own"
  on public.user_state for select
  using (auth.uid() = user_id);

drop policy if exists "user_state insert own" on public.user_state;
create policy "user_state insert own"
  on public.user_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_state update own" on public.user_state;
create policy "user_state update own"
  on public.user_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
