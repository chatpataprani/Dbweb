# Dbweb

A responsive web workspace bringing image editing, background removal, developer utilities, file tools, and everyday productivity features into one place.

<p align="center">
  <a href="https://webdd.freeddns.org/"><strong>Visit Dbweb →</strong></a>
</p>

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## Overview

Dbweb is built for quick, browser-based workflows across desktop and mobile. Its tools and features are organized into dedicated pages, with availability depending on browser capabilities and service configuration.

### What you can do

- **Photo Studio:** Edit images with creative filters, adjustments, collage tools, text, and export options.
- **Background removal:** Process images and export transparent PNGs, using compatible on-device processing with an online fallback where configured.
- **Developer utilities:** Format JSON, encode or decode Base64, test regular expressions, inspect URLs, and work with Markdown.
- **Image and file utilities:** Compress images, compare files, inspect metadata, and use supported file workflows.
- **Validation and lookup tools:** Use supported Aadhaar, PAN, GST, vehicle, IFSC, age/date, QR, and other utilities.
- **Social media tools:** Use supported public-media download and profile-analysis workflows, subject to provider availability and platform restrictions.
- **Accounts and workspace:** Access configured plans, payment submission, redeem codes, settings, and search history.
- **Administration:** Access administrative workflows when authorized.

## Explore Dbweb

| Destination | Link |
| --- | --- |
| Main website | [webdd.freeddns.org](https://webdd.freeddns.org/) |
| Tools directory | [Tools](https://webdd.freeddns.org/tools) |
| Photo Studio | [Photo Studio](https://webdd.freeddns.org/photo-studio/) |

The live website is the source of truth for the current tools, features, and availability.

## Technology

- Next.js 15
- React 19
- JavaScript and JSX
- HTML and CSS
- Lucide icons
- Node.js and npm

## Run locally

### Prerequisites

- Node.js version supported by the project's dependencies
- npm
- A modern browser

### Installation

```bash
git clone https://github.com/chatpataprani/Dbweb.git
cd Dbweb
npm install
```

### Environment configuration

Create a local environment file from the example:

```bash
cp .env.example .env.local
```

Add only the configuration required for the features you want to run. Keep secrets in local environment files or your hosting provider's environment settings.

> **Never commit real credentials, passwords, access tokens, private keys, or populated local environment files.**

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm start
```

## Background remover

1. Open Background Remover from the tools directory.
2. Upload or select an image.
3. Start background removal.
4. Let the application use compatible on-device processing or its configured online fallback.
5. Preview and download the result as a transparent PNG.

Processing support depends on browser capabilities, device memory, model availability, and server configuration. The first run may take longer while assets load.

## Project structure

The repository is organized around the Next.js application, reusable components, shared libraries, static assets, and Supabase configuration. The exact structure may change as the project evolves.

## Deployment

Dbweb is designed to run on platforms supporting Next.js.

1. Import the repository into your hosting platform.
2. Configure the required environment variables securely.
3. Build with `npm run build`.
4. Deploy using the platform's Next.js workflow.
5. Verify the main workspace and any configured services after deployment.

Environment-variable changes may require a new deployment.

## Security and responsible use

- Use Dbweb only for lawful purposes and access information you are authorized to use.
- Respect privacy, consent, data-protection requirements, and third-party terms.
- Do not use the tools to harass, stalk, impersonate, defraud, expose, or harm others.
- Keep server-side secrets out of client-side code and public repositories.
- Apply appropriate access controls, rate limits, and monitoring before exposing sensitive features.
- Do not upload confidential or personal files unless you have the right to process them.
- Review configuration and test changes before production deployment.

## Troubleshooting

**The app does not start**
- Check your Node.js and npm versions.
- Run `npm install` to install dependencies.
- Review the first error reported by the terminal.

**A feature reports missing configuration**
- Check the environment variables configured locally or on your hosting platform.
- Confirm the variable names match the project's configuration.
- Redeploy after changing hosted environment variables.

**Background removal fails or uses a fallback**
- Try an updated browser and a smaller image.
- Check device memory and browser compatibility.
- Confirm online processing is configured if required.

## Contributing

Bug reports and contributions are welcome.

1. Fork the repository.
2. Create a focused branch for your change.
3. Do not commit secrets or private user data.
4. Test the affected feature and run `npm run build` when possible.
5. Open a pull request with a clear description and testing details.

## License

Dbweb is released under the [MIT License](LICENSE).

For bugs or feature requests, [open an issue](https://github.com/chatpataprani/Dbweb/issues). Never include passwords, access tokens, private keys, or personal data in an issue.
