-- Store the display name users provide so admins can identify device accounts.
alter table public.device_accounts
  add column if not exists display_name text;
