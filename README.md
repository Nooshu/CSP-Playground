# CSP Builder

A browser-based tool for building [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) (CSP) headers. Enable directives, pick common keywords, add custom source URLs, and copy the generated policy for your web server.

## Features

- Form-based editor for all standard CSP directives (fetch, document, navigation, reporting, and other)
- **Import from URL** — fetch an existing policy from HTTP headers or HTML meta tags and pre-fill the form
- Keyword dropdown for common values (`'self'`, `'none'`, `'unsafe-inline'`, schemes, and more)
- Multiple source inputs per directive with add/remove controls
- Live preview of the policy value and full HTTP header
- Export snippets for Apache, Nginx, Caddy, LiteSpeed, Microsoft IIS, Traefik, and Envoy
- Accessible UI with semantic HTML, labels, focus styles, and screen reader feedback

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Yarn](https://yarnpkg.com/)

### Install

```bash
yarn install
```

### Development

```bash
yarn dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
yarn build
```

Static files are output to `dist/`. Preview the production build with:

```bash
yarn preview
```

## Usage

1. Optionally enter a site URL at the top and click **Import CSP** to load an existing policy.
2. Enable a directive (e.g. `default-src`) using its checkbox.
3. Add keywords from the dropdown or enter custom sources (e.g. `https://cdn.example.com`).
4. Review the generated policy in the preview panel at the bottom.
5. Copy the policy, full header, or web server configuration snippet.

If no CSP is found for a URL, you will be linked to [why-csp.html](/why-csp.html) with guidance on why and how to adopt a policy.

Toggle **Content-Security-Policy-Report-Only** to generate a report-only header for testing.

## Deploy to Cloudflare Pages

URL import is supported in production via [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/). The function at [`functions/api/csp-lookup.ts`](functions/api/csp-lookup.ts) runs on Cloudflare’s edge and exposes the same `POST /api/csp-lookup` endpoint used during local development.

### Dashboard setup

1. Connect this repository to Cloudflare Pages.
2. **Build command:** `yarn build`
3. **Build output directory:** `dist`
4. Deploy. Cloudflare automatically detects the `functions/` directory and deploys the API route alongside your static assets.

No separate Worker or backend is required.

### Local Pages preview

To test the production setup locally (static assets + Pages Function):

```bash
yarn pages:dev
```

### CLI deploy

```bash
yarn pages:deploy
```

Requires [Wrangler](https://developers.cloudflare.com/workers/wrangler/) authentication (`wrangler login`).

### Local development

`yarn dev` uses a Vite middleware shim with the same lookup logic, so you do not need Wrangler for day-to-day UI work.

## License

[CC0 1.0 Universal](LICENSE)
