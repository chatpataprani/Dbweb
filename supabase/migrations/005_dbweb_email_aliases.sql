-- Admin-generated non-delivery login aliases for Dbweb.
-- These addresses are identifiers only; no messages are sent to @dbweb.amir.
create table if not exists public.dbweb_email_aliases (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  disabled_at timestamptz
);

alter table public.dbweb_email_aliases enable row level security;
revoke all on public.dbweb_email_aliases from anon, authenticated;
grant all on public.dbweb_email_aliases to service_role;

create index if not exists dbweb_email_aliases_created_at_idx
  on public.dbweb_email_aliases(created_at desc);
