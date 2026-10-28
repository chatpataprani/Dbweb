-- Dbweb profile customization, avatars and referral links.
alter table public.profiles
  add column if not exists username text,
  add column if not exists avatar_url text,
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null;

update public.profiles
set referral_code = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
where referral_code is null or referral_code = '';

create unique index if not exists profiles_referral_code_unique
  on public.profiles(referral_code);
create unique index if not exists profiles_username_unique
  on public.profiles(lower(username)) where username is not null and username <> '';

alter table public.profiles
  alter column referral_code set default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

-- New users can arrive from a referral link such as /login?ref=CODE.
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

  v_username := nullif(lower(trim(coalesce(new.raw_user_meta_data->>'username', ''))), '');
  v_avatar := nullif(new.raw_user_meta_data->>'avatar_url', '');
  v_referral_code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.profiles (id, email, credits, plan, username, avatar_url, referral_code, referred_by)
  values (new.id, new.email, 10, 'free', v_username, v_avatar, v_referral_code, v_referrer)
  on conflict (id) do update
    set email = excluded.email,
        username = coalesce(public.profiles.username, excluded.username),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
  return new;
end;
$$;

-- Public avatars, with each signed-in user restricted to their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = true, file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Users upload own profile avatars" on storage.objects;
create policy "Users upload own profile avatars"
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update own profile avatars" on storage.objects;
create policy "Users update own profile avatars"
on storage.objects for update to authenticated
using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete own profile avatars" on storage.objects;
create policy "Users delete own profile avatars"
on storage.objects for delete to authenticated
using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
