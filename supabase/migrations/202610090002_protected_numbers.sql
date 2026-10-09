-- Protected phone numbers are never sent to the upstream lookup API.
create table if not exists public.protected_numbers (
  id bigint generated always as identity primary key,
  phone_digits text not null unique check (phone_digits ~ '^[0-9]{10,15}$'),
  protected_by text not null default 'admin' check (protected_by in ('admin','premium_user')),
  device_id uuid,
  created_at timestamptz not null default now()
);
alter table public.protected_numbers enable row level security;
revoke all on public.protected_numbers from public, anon, authenticated;
grant select, insert, delete on public.protected_numbers to service_role;
grant usage, select on sequence public.protected_numbers_id_seq to service_role;
