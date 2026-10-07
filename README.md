# Dbweb

A modern web-based lookup console built with **Next.js**, designed around the supplied Lookup Console interface.

> **Status:** Active development  
> **Deployment target:** Vercel  
> **Database/Auth:** Supabase  
> **Payments:** UPI with manual receipt verification

## Overview

Dbweb provides a clean dashboard for authorized lookup workflows, account management, credits, plans, and manual UPI payments.

The application keeps upstream lookup configuration on the server instead of exposing it directly in the browser.

## Features

- Number lookup interface
- Aadhaar lookup interface
- One-time **10 free credits** per account
- Paid access plans:
  - ₹30 — 1 day
  - ₹100 — 7 days
  - ₹300 — 30 days
- UPI payment flow with receipt submission UI
- Email/password authentication
- Email OTP authentication
- Lookup history foundation
- Responsive dashboard UI
- Server-side lookup proxy
- Environment-based configuration
- Supabase-ready database schema
- Vercel-ready Next.js application

## Tech Stack

- **Next.js 15**
- **React 19**
- **Lucide React**
- **Supabase**
- **Vercel**
- **UPI**

## Project Structure

```text
Dbweb/
├── app/
│   ├── api/
│   │   └── lookup/
│   │       └── route.js
│   ├── globals.css
│   ├── layout.jsx
│   └── page.jsx
├── supabase/
│   └── schema.sql
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Environment Configuration

**Never commit your real `.env` or private API configuration to GitHub.**

The repository only contains an example environment file:

```text
.env.example
```

For local development:

```bash
cp .env.example .env.local
```

Then add your private values to `.env.local`.

For Vercel, add the same variables under:

**Vercel → Project → Settings → Environment Variables**

Required configuration includes:

```text
NUMBER_API_BASE=
AADHAAR_API_BASE=
UPI_ID=
NEXT_PUBLIC_UPI_ID=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. Never expose it through a `NEXT_PUBLIC_` variable.

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run:

```text
supabase/schema.sql
```

4. Copy the project's URL and anon key into your environment variables.
5. Configure email authentication if you want password and OTP login.
6. Add the same Supabase variables to Vercel.

The database schema includes profiles, credits, lookup records, and payment records.

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local application at:

```text
http://localhost:3000
```

Create a production build with:

```bash
npm run build
npm start
```

## Deployment

### Vercel

1. Import the GitHub repository into Vercel.
2. Select the Next.js framework.
3. Add the required environment variables.
4. Deploy.
5. After deployment, verify authentication and lookup configuration.

For a zero-upfront-cost setup, use free-tier services where their current terms permit your intended use.

## Security

This project is designed to keep sensitive configuration out of the client.

- Do not commit `.env`, `.env.local`, API keys, service-role keys, payment secrets, or private credentials.
- Keep upstream lookup endpoints/configuration server-side.
- Never expose the Supabase service-role key in client-side code.
- Add authentication, rate limiting, logging, and abuse protection before public production use.
- Only use lookup sources and personal data that you are legally authorized to access and process.
- Do not use the application to obtain, expose, or distribute personal information without appropriate authorization or consent.

## Payments

The current payment model uses manual UPI verification.

Configured plans:

| Plan | Duration | Price |
|---|---:|---:|
| Daily | 1 day | ₹30 |
| Weekly | 7 days | ₹100 |
| Monthly | 30 days | ₹300 |

Manual payment approval should be handled through the server/admin workflow before granting paid access.

## Administration

The configured administrator contact is:

`lumenomore@hotmail.com`

The production admin workflow should use server-side authorization and must not rely only on a client-side email check.

## Roadmap

- [ ] Complete persistent credit deduction
- [ ] Complete lookup history persistence
- [ ] Complete payment receipt upload/storage
- [ ] Complete admin payment approval panel
- [ ] Add server-side authentication to lookup requests
- [ ] Add rate limiting and abuse protection
- [ ] Add production audit logging
- [ ] Add automated email notifications

## License

No license has been specified yet. Add a license before distributing the project publicly if required.

---

Built with Next.js and Supabase.
