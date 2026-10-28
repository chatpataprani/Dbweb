-- Account-wide credits and premium entitlements for Dbweb.
-- Apply after migrations 001-004 and the device access schema.
create or replace function public.link_device_to_user(p_device_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.device_accounts%rowtype;
  v_profile public.profiles%rowtype;
  v_email text;
  v_max_credits integer;
  v_max_expiry timestamptz;
  v_best_plan text;
begin
  select email into v_email from auth.users where id = p_user_id;
  if not found then raise exception 'User not found'; end if;

  insert into public.profiles (id, email, credits, plan, signup_credits_transferred)
  values (p_user_id, v_email, 3, 'free', false)
  on conflict (id) do nothing;

  select * into v_profile from public.profiles where id = p_user_id for update;
  insert into public.device_accounts (device_id) values (p_device_id)
  on conflict (device_id) do nothing;
  select * into v_device from public.device_accounts where device_id = p_device_id for update;

  if v_device.auth_user_id is not null and v_device.auth_user_id <> p_user_id then
    raise exception 'This device is already linked to another Dbweb account';
  end if;

  -- Reconcile legacy device-based balances once only. Use the maximum existing
  -- balance rather than summing mirrors, so old duplicated balances aren't multiplied.
  if not coalesce(v_profile.signup_credits_transferred, false) then
    select greatest(
      coalesce(v_profile.credits, 0),
      coalesce((select max(credits) from public.device_accounts where auth_user_id = p_user_id), 0),
      coalesce(v_device.credits, 0)
    ) into v_max_credits;

    select max(x.expiry) into v_max_expiry
    from (
      select v_profile.plan_expires_at as expiry
      union all
      select plan_expires_at from public.device_accounts where auth_user_id = p_user_id
      union all
      select v_device.plan_expires_at
    ) x;

    if v_max_expiry is not null and (v_profile.plan_expires_at is null or v_max_expiry > v_profile.plan_expires_at) then
      select plan into v_best_plan from public.device_accounts
      where auth_user_id = p_user_id and plan_expires_at = v_max_expiry
      order by updated_at desc nulls last limit 1;
      if v_best_plan is null and v_device.plan_expires_at = v_max_expiry then v_best_plan := v_device.plan; end if;
    end if;

    update public.profiles
    set credits = v_max_credits,
        plan = coalesce(v_best_plan, plan, 'free'),
        plan_expires_at = v_max_expiry,
        signup_credits_transferred = true
    where id = p_user_id
    returning * into v_profile;
  end if;

  update public.device_accounts
  set auth_user_id = p_user_id,
      credits = coalesce(v_profile.credits, 0),
      plan = coalesce(v_profile.plan, 'free'),
      plan_expires_at = v_profile.plan_expires_at,
      updated_at = now()
  where device_id = p_device_id;

  -- The profile is canonical; every linked device is only a mirrored view.
  update public.device_accounts
  set credits = coalesce(v_profile.credits, 0),
      plan = coalesce(v_profile.plan, 'free'),
      plan_expires_at = v_profile.plan_expires_at,
      updated_at = now()
  where auth_user_id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'credits', coalesce(v_profile.credits, 0),
    'plan', coalesce(v_profile.plan, 'free'),
    'plan_expires_at', v_profile.plan_expires_at
  );
end;
$$;

create or replace function public.spend_account_credit(p_device_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_new_credits integer;
begin
  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'profile_missing'); end if;

  if not exists (
    select 1 from public.device_accounts
    where device_id = p_device_id and auth_user_id = p_user_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'device_not_linked');
  end if;

  if v_profile.plan is not null
     and v_profile.plan <> 'free'
     and v_profile.plan_expires_at is not null
     and v_profile.plan_expires_at > now() then
    return jsonb_build_object('ok', true, 'premium', true, 'credits', coalesce(v_profile.credits, 0));
  end if;

  if coalesce(v_profile.credits, 0) < 1 then
    return jsonb_build_object('ok', false, 'reason', 'no_credits', 'credits', 0);
  end if;

  v_new_credits := v_profile.credits - 1;
  update public.profiles set credits = v_new_credits where id = p_user_id;
  update public.device_accounts
  set credits = v_new_credits, updated_at = now()
  where auth_user_id = p_user_id;

  return jsonb_build_object('ok', true, 'premium', false, 'credits', v_new_credits);
end;
$$;

create or replace function public.redeem_device_code(p_device_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_code public.redeem_codes%rowtype;
  v_account public.device_accounts%rowtype;
  v_profile public.profiles%rowtype;
  v_expiry timestamptz;
  v_message text;
begin
  v_hash := lower(trim(p_code));
  select * into v_code from public.redeem_codes where code_hash = v_hash for update;
  if not found or not v_code.active then raise exception 'invalid code'; end if;
  if v_code.expires_at is not null and v_code.expires_at <= now() then raise exception 'code expired'; end if;
  if v_code.uses_count >= v_code.max_uses then raise exception 'code usage limit reached'; end if;
  if exists(select 1 from public.device_redemptions where code_hash = v_hash and device_id = p_device_id) then
    raise exception 'code already redeemed on this device';
  end if;

  insert into public.device_accounts(device_id) values(p_device_id) on conflict(device_id) do nothing;
  select * into v_account from public.device_accounts where device_id = p_device_id;

  if v_account.auth_user_id is not null then
    select * into v_profile from public.profiles where id = v_account.auth_user_id for update;
    if not found then raise exception 'Account profile not found'; end if;
    select * into v_account from public.device_accounts where device_id = p_device_id for update;
    if v_account.auth_user_id is distinct from v_profile.id then raise exception 'Device account changed; retry redemption'; end if;
    v_expiry := case when v_code.premium_days > 0
      then greatest(coalesce(v_profile.plan_expires_at, now()), now()) + make_interval(days => v_code.premium_days)
      else v_profile.plan_expires_at end;
    update public.profiles
    set credits = coalesce(credits, 0) + v_code.credits_grant,
        plan = case when v_code.premium_days > 0 then v_code.premium_days || 'd' else plan end,
        plan_expires_at = v_expiry
    where id = v_account.auth_user_id;
    update public.device_accounts
    set credits = (select credits from public.profiles where id = v_account.auth_user_id),
        plan = (select plan from public.profiles where id = v_account.auth_user_id),
        plan_expires_at = (select plan_expires_at from public.profiles where id = v_account.auth_user_id),
        updated_at = now()
    where auth_user_id = v_account.auth_user_id;
  else
    select * into v_account from public.device_accounts where device_id = p_device_id for update;
    if v_account.auth_user_id is not null then raise exception 'Device account changed; retry redemption'; end if;
    v_expiry := case when v_code.premium_days > 0
      then greatest(coalesce(v_account.plan_expires_at, now()), now()) + make_interval(days => v_code.premium_days)
      else v_account.plan_expires_at end;
    update public.device_accounts
    set credits = credits + v_code.credits_grant,
        plan = case when v_code.premium_days > 0 then v_code.premium_days || 'd' else plan end,
        plan_expires_at = v_expiry, updated_at = now()
    where device_id = p_device_id;
  end if;

  insert into public.device_redemptions(code_hash, device_id) values(v_hash, p_device_id);
  update public.redeem_codes set uses_count = uses_count + 1 where code_hash = v_hash;
  v_message := case
    when v_code.credits_grant > 0 and v_code.premium_days > 0 then v_code.credits_grant || ' credits and ' || v_code.premium_days || ' premium days added.'
    when v_code.credits_grant > 0 then v_code.credits_grant || ' credits added.'
    else v_code.premium_days || ' premium days added.' end;
  return jsonb_build_object('ok', true, 'message', v_message);
end;
$$;

create or replace function public.review_device_payment(p_payment_id bigint, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.device_payments%rowtype;
  v_device public.device_accounts%rowtype;
  v_profile public.profiles%rowtype;
  v_expiry timestamptz;
begin
  if p_action not in ('approve', 'reject') then raise exception 'Invalid payment action'; end if;
  select * into v_payment from public.device_payments where id = p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if v_payment.status <> 'pending' then raise exception 'Payment already reviewed'; end if;

  if p_action = 'approve' then
    select * into v_device from public.device_accounts where device_id = v_payment.device_id;
    if not found then raise exception 'Payment device not found'; end if;

    if v_device.auth_user_id is not null then
      select * into v_profile from public.profiles where id = v_device.auth_user_id for update;
      if not found then raise exception 'Account profile not found'; end if;
      select * into v_device from public.device_accounts where device_id = v_payment.device_id for update;
      if v_device.auth_user_id is distinct from v_profile.id then raise exception 'Device account changed; retry payment review'; end if;
      v_expiry := greatest(coalesce(v_profile.plan_expires_at, now()), now()) + make_interval(days => v_payment.plan_days);
      update public.profiles
      set credits = coalesce(credits, 0) + 10,
          plan = v_payment.plan_days || 'd',
          plan_expires_at = v_expiry
      where id = v_device.auth_user_id;
      update public.device_accounts
      set credits = (select credits from public.profiles where id = v_device.auth_user_id),
          plan = (select plan from public.profiles where id = v_device.auth_user_id),
          plan_expires_at = (select plan_expires_at from public.profiles where id = v_device.auth_user_id),
          updated_at = now()
      where auth_user_id = v_device.auth_user_id;
    else
      select * into v_device from public.device_accounts where device_id = v_payment.device_id for update;
      if v_device.auth_user_id is not null then raise exception 'Device account changed; retry payment review'; end if;
      v_expiry := greatest(coalesce(v_device.plan_expires_at, now()), now()) + make_interval(days => v_payment.plan_days);
      update public.device_accounts
      set plan = v_payment.plan_days || 'd',
          plan_expires_at = v_expiry,
          credits = credits + 10,
          updated_at = now()
      where device_id = v_payment.device_id;
    end if;
  end if;

  update public.device_payments
  set status = case when p_action = 'approve' then 'approved' else 'rejected' end,
      reviewed_at = now(), reviewed_by = 'admin'
  where id = p_payment_id;
  return jsonb_build_object('ok', true, 'status', case when p_action = 'approve' then 'approved' else 'rejected' end);
end;
$$;

-- Reconcile legacy linked accounts before switching balance reads to profiles.
-- For linked users, device balances reflect actual past spending; take the highest
-- mirrored balance (never sum device rows), then normalize all linked device mirrors.
with device_state as (
  select auth_user_id,
         max(credits) as max_credits,
         max(plan_expires_at) as max_expiry
  from public.device_accounts
  where auth_user_id is not null
  group by auth_user_id
)
update public.profiles p
set credits = coalesce(s.max_credits, p.credits, 0),
    plan_expires_at = greatest(
      coalesce(p.plan_expires_at, 'epoch'::timestamptz),
      coalesce(s.max_expiry, 'epoch'::timestamptz)
    ),
    plan = case
      when s.max_expiry is not null and (p.plan_expires_at is null or s.max_expiry > p.plan_expires_at)
        then coalesce((select d.plan from public.device_accounts d where d.auth_user_id = p.id and d.plan_expires_at = s.max_expiry order by d.updated_at desc nulls last limit 1), p.plan, 'free')
      else coalesce(p.plan, 'free')
    end,
    signup_credits_transferred = true
from device_state s
where p.id = s.auth_user_id;

update public.profiles
set plan_expires_at = null
where plan_expires_at = 'epoch'::timestamptz;

update public.device_accounts d
set credits = coalesce(p.credits, 0),
    plan = coalesce(p.plan, 'free'),
    plan_expires_at = p.plan_expires_at,
    updated_at = now()
from public.profiles p
where d.auth_user_id = p.id;

revoke all on function public.link_device_to_user(uuid, uuid) from public, anon, authenticated;
grant execute on function public.link_device_to_user(uuid, uuid) to service_role;
revoke all on function public.spend_account_credit(uuid, uuid) from public, anon, authenticated;
grant execute on function public.spend_account_credit(uuid, uuid) to service_role;
revoke all on function public.redeem_device_code(uuid, text) from public, anon, authenticated;
grant execute on function public.redeem_device_code(uuid, text) to service_role;

revoke all on function public.review_device_payment(bigint, text) from public, anon, authenticated;
grant execute on function public.review_device_payment(bigint, text) to service_role;
