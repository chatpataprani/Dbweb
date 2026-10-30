alter table public.device_payments
add column if not exists user_notified_at timestamptz;
