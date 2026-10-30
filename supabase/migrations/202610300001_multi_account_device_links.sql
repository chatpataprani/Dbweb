-- Allow multiple Supabase users to use the same physical/browser device.
-- Device credits and premium remain device-scoped, matching the existing billing model.
create table if not exists public.device_account_users (
  device_id uuid not null references public.device_accounts(device_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (device_id, user_id)
);

create index if not exists device_account_users_user_id_idx
  on public.device_account_users(user_id);

-- Preserve all existing device-to-user links.
insert into public.device_account_users (device_id, user_id)
select device_id, auth_user_id
from public.device_accounts
where auth_user_id is not null
on conflict (device_id, user_id) do nothing;

alter table public.device_account_users enable row level security;
-- No client policies: only trusted server routes using the service-role key access this table.
