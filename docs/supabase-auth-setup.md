# Dbweb authentication setup

## 1. Environment variables

In Vercel → Project → Settings → Environment Variables, verify these are set for the deployment environments:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only; never use a `NEXT_PUBLIC_` prefix)

Redeploy after changing environment variables. Never commit actual keys to GitHub.

## 2. Supabase URL configuration

In Supabase → Authentication → URL Configuration:

- Site URL: `https://webdd.freeddns.org`
- Redirect URL: `https://webdd.freeddns.org/**`

Keep the exact Supabase callback URL shown in Authentication → Sign In / Providers → Google as the Google Cloud authorized redirect URI. The website URL is not the Google OAuth callback URL.

## 3. Google provider

In Supabase → Authentication → Sign In / Providers → Google, enable Google and save the Google OAuth Client ID and Client Secret from Google Cloud. In Google Cloud, the authorized JavaScript origin is `https://webdd.freeddns.org`, and the authorized redirect URI must be the Supabase callback URL copied from Supabase.

## 4. GitHub provider

The login page includes GitHub login. To activate it, create a GitHub OAuth App and enter its Client ID and Client Secret in Supabase → Authentication → Sign In / Providers → GitHub. Use the callback URL displayed by Supabase as the GitHub OAuth Authorization callback URL. GitHub login will not work until this provider is configured and enabled.

## 5. Database migration

Run the SQL files in `supabase/migrations/` in the Supabase SQL Editor if they have not already been applied, especially:

- `202610280001_auth_profiles.sql`
- `202610280002_link_auth_users_to_devices.sql`

The second migration adds the user association used to display the existing device-based premium, credits and payment records on the signed-in account dashboard. Existing device accounts and payment records are not deleted or converted.

## 6. Test

1. Open `https://webdd.freeddns.org/login`.
2. Test Google sign-in.
3. Test email signup and confirm the verification email.
4. Open `/account` to see your profile.
5. While signed in, open the main Dbweb page and accept the current Terms if prompted. The current device will then be linked to your account so its existing premium and credits can appear in the dashboard.
6. Test password reset from the login page.

If email verification is enabled, users must click the confirmation link before they can sign in with email/password.
