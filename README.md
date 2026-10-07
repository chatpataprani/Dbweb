# Dbweb — Lookup Console

A zero-upfront-cost web console based on the supplied **Lookup Console UI**.

## Included

- Number lookup
- Aadhaar lookup
- 10 one-time free credits per account (not daily)
- Paid plans: ₹30 / 1 day, ₹100 / 7 days, ₹300 / 30 days
- UPI/manual receipt payment flow
- Admin contact configured as `lumenomore@hotmail.com`
- Server-side lookup proxy
- No secrets committed to GitHub

## Run

1. Copy `.env.example` to `.env.local`.
2. Add your private lookup API bases and UPI ID locally.
3. Verify that the supplied lookup APIs are authorized for your use. Never commit `.env.local` or real API endpoints to GitHub.
4. Run:

```bash
npm install
npm run dev
```

## Free deployment

The project can be deployed to Vercel's free Hobby tier for eligible personal/non-commercial use. Add the environment variables in the Vercel project settings.

## Important

This project is intentionally structured so lookup API credentials/configuration remain server-side. Do not use the lookup features to obtain or distribute personal information without authorization or consent.

Authentication and persistent billing/history require a database. For a ₹0 setup, connect a free-tier Supabase project and add its environment variables before enabling production accounts. The current UI remains usable without it as a frontend/API integration starter.

## Environment

See `.env.example`.
