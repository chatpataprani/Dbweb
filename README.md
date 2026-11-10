<div align="center">

<a href="https://webdd.freeddns.org/"><img src="https://readme-typing-svg.demolab.com?font=Space+Grotesk&weight=700&size=34&pause=1200&color=6366F1&center=true&vCenter=true&width=800&lines=Dbweb;One+web.+Too+many+tools.;Zero+tab+chaos." alt="Dbweb — One web. Too many tools. Zero tab chaos." /></a>

<h1>Dbweb</h1>

**Your browser's multitool era starts here.**

[![Live](https://img.shields.io/badge/Live-webdd.freeddns.org-111827?style=for-the-badge&logo=vercel&logoColor=white)](https://webdd.freeddns.org/)
[![Instagram](https://img.shields.io/badge/Instagram-@chatpataprani-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://instagram.com/chatpataprani)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-ff69b4?style=for-the-badge)](#-contributing)

[**Launch Dbweb ↗**](https://webdd.freeddns.org/) · [Tools](https://webdd.freeddns.org/tools) · [Photo Studio](https://webdd.freeddns.org/photo-studio/) · [Instagram](https://instagram.com/chatpataprani)

<br />

<a href="https://webdd.freeddns.org/tools"><img src="https://img.shields.io/badge/Explore-Dbweb_Tools-6366f1?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Explore Dbweb tools" /></a>

</div>

<hr />


## 📖 Table of contents

- [What is Dbweb?](#-what-is-dbweb)
- [Screenshots](#-screenshots)
- [Features](#-features)
- [Tech stack](#-tech-stack)
- [Getting started](#-getting-started)
- [Environment variables](#-environment-variables)
- [Project structure](#-project-structure)
- [Scripts](#-scripts)
- [Deploy](#-deploy)
- [Privacy & responsible use](#-privacy--responsible-use)
- [Contributing](#-contributing)
- [License](#-license)
- [Developer](#-developer)

## ✨ What is Dbweb?

Dbweb brings useful browser tools together, because opening 17 tabs for one task is not the move.

It is a single Next.js app that hosts a Photo Studio, a background remover, dozens of PDF and image utilities, developer helpers, validators and a user workspace, all under one roof. Many tools run entirely in your browser, so your files stay on your device.

## 🖼️ Screenshots

<table>
  <tr>
    <td colspan="2" align="center">
      <a href="https://webdd.freeddns.org/">Open Dbweb ↗</a><br />
      <sub><b>Tools hub</b> — 37 tools with instant search and category filters</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <a href="https://webdd.freeddns.org/">Open Dbweb ↗</a><br />
      <sub><b>Photo Studio</b> — retro start screen: upload, sample photo, restore work</sub>
    </td>
    <td width="50%" align="center">
      <a href="https://webdd.freeddns.org/">Open Dbweb ↗</a><br />
      <sub><b>Photo Studio editor</b> — built-in sample photo with dozens of filters, effects, text and collage</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <a href="https://webdd.freeddns.org/">Open Dbweb ↗</a><br />
      <sub><b>PDF &amp; image tools</b> — merge, split, compress, convert, all client-side</sub>
    </td>
    <td width="50%" align="center">
      <a href="https://webdd.freeddns.org/">Open Dbweb ↗</a><br />
      <sub><b>QR tools</b> — generate, scan and decode QR codes, plus UPI QR</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <a href="https://webdd.freeddns.org/">Open Dbweb ↗</a><br />
      <sub><b>Password generator</b> — Web Crypto powered, with an entropy meter</sub>
    </td>
    <td width="50%" align="center">
      <a href="https://webdd.freeddns.org/">Open Dbweb ↗</a><br />
      <sub><b>Dbweb Mail</b> — temporary inboxes for non-sensitive email</sub>
    </td>
  </tr>
</table>

> Screenshots are rendered from the HTML pages in this repo with headless Chrome. The Photo Studio editor view uses the sample photo that ships with the app.

## 🚀 Features

| | Area | What you get |
|---|---|---|
| 🎨 | **Photo Studio** | Edit, filter, collage, add text and stickers. Everything happens on your device; nothing is uploaded. |
| ✂️ | **Background Remover** | Remove backgrounds and export transparent PNGs. Uses on-device processing, with an optional online fallback if configured. |
| 📄 | **PDF tools** | Images to PDF, PDF to images, merge, split, reorder, rotate, compress, protect, unlock, watermark, page numbers, delete pages, text/HTML to PDF. |
| 🖼️ | **Image tools** | Compress, resize, crop, rotate, convert, watermark, image to Base64, batch rename, file format detector. |
| 🔳 | **QR tools** | Generate (text, URL, email, phone, SMS, WiFi, vCard, location), scan, decode from image and UPI payment QR. |
| 🧑‍💻 | **Dev tools** | JSON, Base64, regex, URL inspection, Markdown, hashing, password generator. Nerd mode: ON. |
| 🔍 | **Inspect & compare** | Image metadata, image forensics, file fingerprint, image compare, steganography, OCR, MAC lookup, IP lookup. |
| 🇮🇳 | **Validators & utilities** | Supported Aadhaar, PAN, GST, vehicle, IFSC, IMEI, age calculator, transliteration, Punjabi font converter and date tools. |
| 📬 | **Dbweb Mail** | Temporary inboxes for non-sensitive messages, with alerts and auto-copy for new codes. |
| 📱 | **Social tools** | Supported public-media workflows, short links and profile helpers. Provider rules still apply. |
| 🧰 | **Workspace** | Accounts, plans, history, redeem codes, referrals, device links and settings. |
| 🛡️ | **Admin** | Management tools for authorized admins only, protected by a server-side password. |
| 📴 | **Offline fallback** | Service worker and offline page so the app degrades gracefully without a connection. |

> Features can depend on browser support, configuration and third-party providers. The [live site](https://webdd.freeddns.org/) has the latest lineup.

## 🧱 Tech stack

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=000)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=black)](https://supabase.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Hugging Face](https://img.shields.io/badge/Hugging%20Face-FFD21E?style=for-the-badge&logo=huggingface&logoColor=000)](https://huggingface.co/docs/transformers.js)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

</div>

| Layer | Tools |
|---|---|
| **Framework** | Next.js 15 (App Router) · React 19 |
| **Language** | JavaScript (JSX), HTML5, CSS3 |
| **Backend & auth** | Supabase (auth, Postgres, SQL migrations) |
| **On-device AI** | `@huggingface/transformers` for background removal |
| **Email** | Nodemailer over SMTP |
| **UI** | `lucide-react` icons and custom motion components |
| **Hosting** | Vercel, or any Next.js-compatible host |

## 🏁 Getting started

**Prerequisites:** Node.js 18.18 or newer (20+ recommended) and npm.

```bash
# 1. Clone
git clone https://github.com/chatpataprani/Dbweb.git
cd Dbweb

# 2. Install dependencies
npm install

# 3. Create your local env file
cp .env.example .env.local

# 4. Start dev mode
npm run dev
```

Open **http://localhost:3000**. You're in.

Fill in only the variables for the features you want to use (see below). Never push tokens, passwords, keys or real credentials.

### Supabase setup (for accounts, plans and redeem codes)

1. Create a Supabase project and add its URL and keys to `.env.local`.
2. Run [`supabase/schema.sql`](supabase/schema.sql), then the files in [`supabase/migrations`](supabase/migrations) in order.
3. Follow [`docs/supabase-auth-setup.md`](docs/supabase-auth-setup.md) to configure redirect URLs, email OTP and password recovery.

### Production build

```bash
npm run build
npm start
```

## 🔐 Environment variables

Copy [`.env.example`](.env.example) to `.env.local` locally, or add the same names in your host's environment settings.

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | public | Canonical site URL |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Privileged Supabase access for API routes |
| `ADMIN_EMAIL` | server | Admin contact address |
| `ADMIN_PANEL_PASSWORD` | **server only** | Long private password for the `/admin` panel |
| `SMTP_HOST` · `SMTP_PORT` · `SMTP_USER` · `SMTP_PASS` | **server only** | SMTP credentials for transactional email |
| `SMTP_FROM` · `SMTP_FROM_NAME` | server | Sender address and display name |
| `TMDB_READ_ACCESS_TOKEN` | **server only** | TMDB read token (never use a `NEXT_PUBLIC_` prefix) |
| `UPI_ID` · `NEXT_PUBLIC_UPI_ID` | server / public | UPI ID used for payments |
| `NUMBER_API_BASE` · `AADHAAR_API_BASE` | server | Base URLs for optional lookup/verification providers |

> Keep server secrets server-side. Env changes may need a fresh deployment. Classic.

## 🗂️ Project structure

```text
Dbweb/
├── app/                    # Next.js App Router
│   ├── page.jsx            # Home
│   ├── tools/              # Tools hub, quick tools, short links, social tools
│   ├── bg-remove/          # Background remover
│   ├── account/ login/     # Auth and user workspace
│   ├── admin/              # Admin panel
│   ├── api/                # Route handlers (auth, payments, redeem, admin, lookups…)
│   └── status/ docs/ terms/ privacy/
├── components/ui/          # Reusable motion and UI components
├── lib/                    # Supabase client, mailer, admin auth helpers
├── public/
│   ├── photo-studio/       # Photo Studio (static HTML app)
│   ├── tools/              # Static HTML tools (PDF, image, QR, validators…)
│   ├── dbweb-mail/         # Temporary mail UI
│   ├── sw.js offline.html  # Service worker and offline fallback
│   └── dbweb-logo.svg
├── supabase/               # Schema, SQL helpers and migrations
├── docs/                   # Setup guides and README screenshots
├── middleware.js           # Section route rewrites
├── next.config.js          # Rewrites and security headers
└── vercel.json
```

## 🧪 Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build |

## ☁️ Deploy

Dbweb is built for Next.js-compatible hosting, and Vercel works out of the box.

1. Import the repo into your hosting platform.
2. Add the required environment variables securely.
3. Build with `npm run build`.
4. Deploy and test the routes and features you use.

Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) are set in [`next.config.js`](next.config.js).

## 🛡️ Privacy & responsible use

- Many tools run on your device, so files stay local. Check each tool's page for details.
- Background removal may use on-device processing or a configured online fallback.
- Browser, hardware and provider support can affect results.
- Use Dbweb lawfully; respect privacy, consent and third-party terms.
- Don't use the tools to stalk, harass, impersonate, defraud or harm anyone.

## 🤝 Contributing

Found a bug? Got a feature idea? Let's cook.

1. Fork the repo.
2. Create a focused branch: `git checkout -b feat/my-idea`.
3. Keep secrets and personal data out of commits.
4. Test your changes and run `npm run build` when possible.
5. Open a PR with the details (screenshots help for UI changes).

## 📄 License

MIT. See [LICENSE](LICENSE).

<img src="docs/divider.svg" alt="" width="100%" />

## 👩‍💻 Developer

<div align="center">

Built and maintained by **@chatpataprani**. Bug reports, ideas and shoutouts all welcome.

[![Instagram](https://img.shields.io/badge/Follow%20on%20Instagram-@chatpataprani-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://instagram.com/chatpataprani)
[![GitHub](https://img.shields.io/badge/GitHub-chatpataprani-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/chatpataprani)
[![Website](https://img.shields.io/badge/Website-Dbweb-111827?style=for-the-badge&logo=vercel&logoColor=white)](https://webdd.freeddns.org/)

### Made for the web. Built with a little chaos.

[**Launch Dbweb ↗**](https://webdd.freeddns.org/) · [**Instagram ↗**](https://instagram.com/chatpataprani)

</div>