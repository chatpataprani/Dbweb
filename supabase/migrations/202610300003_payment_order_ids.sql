alter table public.device_payments
add column if not exists order_id text;

update public.device_payments
set order_id = 'DBW-' || to_char(coalesce(created_at, now()) at time zone 'UTC', 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where order_id is null or btrim(order_id) = '';

create unique index if not exists device_payments_order_id_uidx
on public.device_payments (order_id);

alter table public.device_payments
alter column order_id set not null;
