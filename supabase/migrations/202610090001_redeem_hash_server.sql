-- Redeem-code fix: the API computes SHA-256 before calling this function.
-- Run once in Supabase SQL Editor.
CREATE OR REPLACE FUNCTION public.redeem_device_code(
    p_device_id uuid,
    p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_hash text;
    v_code public.redeem_codes;
    v_account public.device_accounts;
    v_expiry timestamptz;
    v_message text;
BEGIN
    -- The server passes the SHA-256 hex digest, not the plaintext code.
    v_hash := lower(trim(p_code));

    IF v_hash !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'invalid code';
    END IF;

    SELECT *
    INTO v_code
    FROM public.redeem_codes
    WHERE code_hash = v_hash
    FOR UPDATE;

    IF NOT FOUND OR NOT v_code.active THEN
        RAISE EXCEPTION 'invalid code';
    END IF;

    IF v_code.expires_at IS NOT NULL AND v_code.expires_at <= pg_catalog.now() THEN
        RAISE EXCEPTION 'code expired';
    END IF;

    IF v_code.uses_count >= v_code.max_uses THEN
        RAISE EXCEPTION 'code usage limit reached';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.device_redemptions
        WHERE code_hash = v_hash AND device_id = p_device_id
    ) THEN
        RAISE EXCEPTION 'code already redeemed on this device';
    END IF;

    INSERT INTO public.device_accounts (device_id)
    VALUES (p_device_id)
    ON CONFLICT (device_id) DO NOTHING;

    SELECT *
    INTO v_account
    FROM public.device_accounts
    WHERE device_id = p_device_id
    FOR UPDATE;

    v_expiry := CASE
        WHEN v_code.premium_days > 0 THEN
            pg_catalog.greatest(
                pg_catalog.coalesce(v_account.plan_expires_at, pg_catalog.now()),
                pg_catalog.now()
            ) + pg_catalog.make_interval(days => v_code.premium_days)
        ELSE v_account.plan_expires_at
    END;

    UPDATE public.device_accounts
    SET
        credits = credits + v_code.credits_grant,
        plan = CASE
            WHEN v_code.premium_days > 0 THEN v_code.premium_days || 'd'
            ELSE plan
        END,
        plan_expires_at = v_expiry,
        updated_at = pg_catalog.now()
    WHERE device_id = p_device_id;

    INSERT INTO public.device_redemptions (code_hash, device_id)
    VALUES (v_hash, p_device_id);

    UPDATE public.redeem_codes
    SET uses_count = uses_count + 1
    WHERE code_hash = v_hash;

    v_message := CASE
        WHEN v_code.credits_grant > 0 AND v_code.premium_days > 0
            THEN v_code.credits_grant || ' credits and ' || v_code.premium_days || ' premium days added.'
        WHEN v_code.credits_grant > 0
            THEN v_code.credits_grant || ' credits added.'
        ELSE v_code.premium_days || ' premium days added.'
    END;

    RETURN pg_catalog.jsonb_build_object('ok', true, 'message', v_message);
END;
$function$;

REVOKE ALL ON FUNCTION public.redeem_device_code(uuid, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.redeem_device_code(uuid, text)
TO service_role;
