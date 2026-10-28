-- Dbweb referral rewards, verification-gated grants and first-account credit transfer.
alter table public.profiles
  alter column credits set default 3,
  add column if not exists signup_credits_transferred boolean not null default false;

create table if not exists public.referral_reward_events (
  id bigint generated always as identity primary key,
  referrer_user_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  reward_key text not null,
  reward_type text not null check (reward_type in ('search_credits','premium_days')),
  reward_amount integer not null,
  created_at timestamptz not null default now(),
  unique (referrer_user_id, reward_key)
);
create index if not exists referral_reward_events_referrer_idx
  on public.referral_reward_events(referrer_user_id, created_at desc);

-- Keep new signups at 3 free searches and preserve referral metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer uuid;
  v_referral_code text;
  v_username text;
  v_avatar text;
begin
  select id into v_referrer
  from public.profiles
  where referral_code = lower(coalesce(new.raw_user_meta_data->>'referred_by_code', ''))
  limit 1;

  if v_referrer = new.id then v_referrer := null; end if;
  v_username := nullif(lower(trim(coalesce(new.raw_user_meta_data->>'username', ''))), '');
  v_avatar := nullif(new.raw_user_meta_data->>'avatar_url', '');
  v_referral_code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.profiles
    (id, email, credits, plan, username, avatar_url, referral_code, referred_by, signup_credits_transferred)
  values
    (new.id, new.email, 3, 'free', v_username, v_avatar, v_referral_code, v_referrer, false)
  on conflict (id) do update
    set email = excluded.email,
        username = coalesce(public.profiles.username, excluded.username),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
  return new;
end;
$$;

create or replace function public.grant_verified_referral_rewards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer uuid;
  v_count integer;
  v_expiry timestamptz;
  v_inserted bigint;
begin
  if old.email_confirmed_at is not null or new.email_confirmed_at is null then
    return new;
  end if;

  select referred_by into v_referrer
  from public.profiles
  where id = new.id;

  if v_referrer is null or v_referrer = new.id then
    return new;
  end if;

  select count(*)::integer into v_count
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.referred_by = v_referrer
    and u.email_confirmed_at is not null;

  if v_count > 0 and v_count % 10 = 0 then
    insert into public.referral_reward_events
      (referrer_user_id, referred_user_id, reward_key, reward_type, reward_amount)
    values
      (v_referrer, new.id, 'searches_' || v_count, 'search_credits', 5)
    on conflict (referrer_user_id, reward_key) do nothing
    returning id into v_inserted;

    if v_inserted is not null then
      update public.profiles set credits = coalesce(credits, 0) + 5 where id = v_referrer;
      update public.device_accounts
      set credits = coalesce(credits, 0) + 5, updated_at = now()
      where auth_user_id = v_referrer;
    end if;
  end if;

  if v_count in (50, 100) then
    insert into public.referral_reward_events
      (referrer_user_id, referred_user_id, reward_key, reward_type, reward_amount)
    values
      (v_referrer, new.id, 'premium_' || v_count, 'premium_days', case when v_count = 50 then 7 else 30 end)
    on conflict (referrer_user_id, reward_key) do nothing
    returning id into v_inserted;

    if v_inserted is not null then
      update public.profiles
      set plan = case when v_count = 50 then 'referral_7d' else 'referral_30d' end,
          plan_expires_at = greatest(coalesce(plan_expires_at, now()), now())
            + (case when v_count = 50 then 7 else 30 end) * interval '1 day'
      where id = v_referrer
      returning plan_expires_at into v_expiry;

      update public.device_accounts
      set plan = case when v_count = 50 then 'referral_7d' else 'referral_30d' end,
          plan_expires_at = greatest(coalesce(plan_expires_at, now()), now())
            + (case when v_count = 50 then 7 else 30 end) * interval '1 day',
          updated_at = now()
      where auth_user_id = v_referrer;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_verified_referral_reward on auth.users;
create trigger on_verified_referral_reward
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.grant_verified_referral_rewards();

alter table public.referral_reward_events enable row level security;
revoke all on public.referral_reward_events from anon, authenticated;
