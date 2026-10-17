-- Dbweb redeem-code hotfix.
-- Run this entire script in Supabase Dashboard -> SQL Editor -> New query.
-- The API sends SHA-256 hex hashes, so this function must not call digest() itself.
create or replace function public.redeem_device_code(p_device_id uuid,p_code text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
 v_hash text;
 v_code public.redeem_codes;
 v_account public.device_accounts;
 v_expiry timestamptz;
 v_message text;
begin
 v_hash:=lower(trim(p_code));

 select * into v_code
 from public.redeem_codes
 where code_hash=v_hash
 for update;

 if not found or not v_code.active then raise exception 'invalid code'; end if;
 if v_code.expires_at is not null and v_code.expires_at<=now() then raise exception 'code expired'; end if;
 if v_code.uses_count>=v_code.max_uses then raise exception 'code usage limit reached'; end if;
 if exists(select 1 from public.device_redemptions where code_hash=v_hash and device_id=p_device_id) then
   raise exception 'code already redeemed on this device';
 end if;

 insert into public.device_accounts(device_id) values(p_device_id)
 on conflict(device_id) do nothing;
 select * into v_account from public.device_accounts where device_id=p_device_id for update;

 v_expiry:=case
   when v_code.premium_days>0 then greatest(coalesce(v_account.plan_expires_at,now()),now())+make_interval(days=>v_code.premium_days)
   else v_account.plan_expires_at
 end;

 update public.device_accounts
 set credits=credits+v_code.credits_grant,
     plan=case when v_code.premium_days>0 then v_code.premium_days||'d' else plan end,
     plan_expires_at=v_expiry,
     updated_at=now()
 where device_id=p_device_id;

 insert into public.device_redemptions(code_hash,device_id) values(v_hash,p_device_id);
 update public.redeem_codes set uses_count=uses_count+1 where code_hash=v_hash;

 v_message:=case
   when v_code.credits_grant>0 and v_code.premium_days>0 then v_code.credits_grant||' credits and '||v_code.premium_days||' premium days added.'
   when v_code.credits_grant>0 then v_code.credits_grant||' credits added.'
   else v_code.premium_days||' premium days added.'
 end;
 return jsonb_build_object('ok',true,'message',v_message);
end;
$$;

revoke all on function public.redeem_device_code(uuid,text) from public,anon,authenticated;
grant execute on function public.redeem_device_code(uuid,text) to service_role;
