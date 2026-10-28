-- Associate a signed-in Supabase user with the device account they are using.
-- Premium, credits, receipts and redeem codes remain in the existing device tables.
alter table public.device_accounts
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create index if not exists device_accounts_auth_user_id_idx
  on public.device_accounts(auth_user_id);

-- This association is written only by server routes using the service-role key.
-- Do not grant clients direct update access to this column.
