-- Dbweb email and OAuth account support.
-- Run this migration in Supabase SQL Editor before using the account dashboard.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  credits integer not null default 10,
  plan text not null default 'free',
  plan_expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profile own read" on public.profiles;
create policy "profile own read"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Users must not be able to grant themselves credits or premium.
drop policy if exists "profile own update" on public.profiles;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, credits, plan)
  values (new.id, new.email, 10, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

grant select on public.profiles to authenticated;
