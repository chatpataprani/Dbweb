# Dbweb authentication setup

## 1. Environment variables

In Vercel → Project → Settings → Environment Variables, verify these are set for Production and Preview:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only; never use a `NEXT_PUBLIC_` prefix)

Redeploy after changing environment variables. Never commit actual keys to GitHub.

## 2. Supabase URL configuration

In Supabase → Authentication → URL Configuration:

- Site URL: `https://webdd.freeddns.org`
- Redirect URL: `https://webdd.freeddns.org/**`
- Keep the Vercel preview redirect available while testing, for example `https://*.vercel.app/**` if allowed by the current Supabase URL rules.

Keep the exact Supabase callback URL shown in Authentication → Sign In / Providers → Google as the Google Cloud authorized redirect URI. The website URL is not the Google OAuth callback URL.

## 3. Email one-time codes (OTP)

The login page supports email OTP and legacy email/password sign-in. To make the code arrive as digits instead of only a magic link:

1. Open Supabase → Authentication → Email Templates.
2. Open the Magic Link template and make sure the message includes `{{ .Token }}` (not only `{{ .ConfirmationURL }}`).
3. In Authentication → Providers → Email, confirm email sign-in is enabled. Set the OTP length to your preferred length; Dbweb accepts 6–8 digits.
4. Check the Supabase Auth logs and SMTP/email delivery settings if no email arrives. Check spam too.
5. If email confirmation is enabled, users must verify the code before the account can sign in.

Existing users who originally created a password can still choose Password on the login page. If a password login says “Invalid login credentials”, use Email code or reset the password.

## 4. Google provider

In Supabase → Authentication → Sign In / Providers → Google, enable Google and save the Google OAuth Client ID and Client Secret from Google Cloud. In Google Cloud, the authorized JavaScript origin is `https://webdd.freeddns.org`, and the authorized redirect URI must be the Supabase callback URL copied from Supabase.

## 5. Referral rewards and sign-in gates

- Lookup API results are withheld until the visitor signs in; signed-out requests do not spend a credit.
- Plan viewing and payment submission require a signed-in account.
- Each new verified email account starts with 3 free searches.
- Verified referrals earn 5 additional searches at each 10-referral milestone; the 50-referral milestone also grants 7 days of unlimited access, and the 100-referral milestone also grants 30 days of unlimited access.
- Rewards are recorded in `referral_reward_events` to prevent the same milestone being granted twice.
- The admin dashboard is available only at `/admin`, protected by `ADMIN_PANEL_PASSWORD`, and is not linked from the public navigation.

## 6. Database migrations

Run these SQL files in the Supabase SQL Editor, in order, if they have not already been applied:

- `202610280001_auth_profiles.sql`
- `202610280002_link_auth_users_to_devices.sql`
- `202610280003_profile_referrals.sql`

The migrations add account profiles, device linking, unique usernames, custom profile avatars, and referral links. The third migration creates the `profile-avatars` storage bucket and its per-user upload policies. Do not rerun a migration that has already succeeded unless you have reviewed it first.

The device-linking migration only associates signed-in users with existing device accounts. Existing device plans, credits, payment records and redeem-code data are not deleted or converted.

## 7. Test checklist

1. Open `/login` and request an email code.
2. Enter the code and verify that the account dashboard opens.
3. Try legacy password login if the account already has a password.
4. Test Google and GitHub login.
5. Open `/account`, set a unique username, upload a JPG/PNG/WebP avatar (maximum 2 MB), and save.
6. Copy the referral link and open it in a private window; create a test account to verify referral tracking.
7. Check the Sign out button in both the account page and the main Dbweb sidebar.
8. While signed in, open the main Dbweb page and accept the current Terms if prompted. The current device will then be linked to your account so its existing premium and credits can appear in the dashboard.
