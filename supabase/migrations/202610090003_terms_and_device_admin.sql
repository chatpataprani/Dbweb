-- Track affirmative acceptance of the current Terms before the app grants access.
alter table public.device_accounts
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

create table if not exists public.terms_acceptances (
  device_id uuid primary key,
  terms_version text not null,
  accepted_at timestamptz not null default now()
);
alter table public.terms_acceptances enable row level security;
revoke all on public.terms_acceptances from public, anon, authenticated;
grant select, insert, update on public.terms_acceptances to service_role;
