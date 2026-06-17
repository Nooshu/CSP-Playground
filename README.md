# CSP Builder

A browser-based tool for building [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) (CSP) headers. Enable directives, pick common keywords, add custom source URLs, review a live security score, and copy the generated policy—or ready-made snippets—for your web server.

The app runs entirely in the browser for policy editing. **Import from URL** uses a small server-side lookup (Vite middleware in development, [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/) in production) so you can fetch an existing policy from HTTP headers or HTML meta tags.

## Purpose

Content Security Policy is one of the most effective mitigations against cross-site scripting (XSS) and related injection attacks, but the syntax is easy to get wrong. CSP Builder lowers the barrier to authoring a correct policy by:

- Mapping every standard directive to an accessible form control
- Explaining sandbox flags and linking to MDN documentation
- Generating nonces, style-attribute hashes, and server config snippets
- Scoring your policy heuristically and suggesting concrete improvements

If a site has no CSP yet, the importer links to [why-csp.html](why-csp.html)—a short guide on why and how to adopt a policy.

## Features

### Policy editor

- Form-based editor for **all standard CSP directives**, grouped by category:
  - Fetch (`default-src`, `script-src`, `style-src`, …)
  - Document (`base-uri`, `sandbox`, …)
  - Navigation (`form-action`, `frame-ancestors`, …)
  - Reporting (`report-uri`, `report-to`, …)
  - Other (`upgrade-insecure-requests`, Trusted Types, …)
- Enable/disable each directive independently
- **Keyword dropdown** for common values (`'self'`, `'none'`, `'unsafe-inline'`, `'strict-dynamic'`, schemes, and more)
- Multiple custom source inputs per directive with add/remove controls
- **Sandbox directive** — checkbox list for every sandbox flag, each with a **?** help icon showing a description on hover/focus
- **Trusted Types** directives with appropriate single- or multi-value controls
- **MDN documentation links** beside each directive name

### Import from URL

- Enter a site URL and fetch its CSP from:
  - `Content-Security-Policy` / `Content-Security-Policy-Report-Only` response headers
  - `<meta http-equiv="Content-Security-Policy">` tags in HTML
- Pre-fills the builder form from the parsed policy
- Graceful handling when no policy is found (links to the why-CSP guide)

### Nonce and hash helpers

- **Script/style nonce helper** (on `script-src`, `script-src-elem`, `style-src`, `style-src-elem`):
  - Generates a cryptographically random nonce
  - Adds `'nonce-…'` to the directive
  - Copies ready-to-paste HTML snippets for inline or external scripts/stylesheets
- **Style attribute hash helper** (on `style-src-attr`):
  - SHA-256 hashes the exact `style="…"` attribute value via Web Crypto
  - Adds `'sha256-…'` and `'unsafe-hashes'` when needed
  - Copies a sample element with the hashed attribute

### Live output and export

- Live preview of the **policy value** and full **HTTP header line**
- Toggle **enforce** vs **Content-Security-Policy-Report-Only** for safe rollout
- One-click copy for policy value, header, or web-server snippet
- Export snippets for **Apache**, **Nginx**, **Caddy**, **LiteSpeed**, **Microsoft IIS**, **Traefik**, and **Envoy**
- Deployment disclaimer with link to MDN’s safe CSP implementation guide

### Security score

- Real-time **letter grade** (Poor → Excellent) with numeric score
- Breakdown of factors that helped or hurt the score
- **Actionable recommendations** with estimated point gains
- Click a recommendation to scroll to the relevant directive in the form
- Report-only mode is reflected in scoring (violations are not blocked)

### Accessibility

- Semantic HTML, labels, focus styles, and `aria-live` regions for dynamic updates
- Keyboard-accessible controls and tooltips

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | TypeScript, vanilla DOM (no framework) |
| Bundler | [Vite](https://vite.dev/) |
| Package manager | [Yarn v1](https://classic.yarnpkg.com/) (`yarn.lock` is canonical) |
| Tests | [Vitest](https://vitest.dev/) + jsdom, v8 coverage |
| Deployment | Static `dist/` on [Cloudflare Pages](https://pages.cloudflare.com/) + Pages Functions |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (`.nvmrc` pins Node 20 for local development)
- [Yarn](https://yarnpkg.com/) 1.x

### Install

```bash
yarn install
```

### Development

```bash
yarn dev
```

Open [http://localhost:5173](http://localhost:5173). URL import works via a Vite middleware shim—you do not need Wrangler for day-to-day UI work.

### Build

```bash
yarn build
```

Static files are output to `dist/`. Preview the production build with:

```bash
yarn preview
```

### Tests

```bash
yarn test              # Run once
yarn test:watch        # Watch mode
yarn test:coverage     # Coverage with thresholds (100% lines/statements/functions, 95% branches)
```

### Dependency integrity

Direct dependencies are **pinned to exact versions**. After any dependency update, run verification **once** when all changes are complete:

```bash
yarn verify:deps
```

See [AGENTS.md](AGENTS.md) for the full dependency policy.

## Usage

1. Optionally enter a site URL at the top and click **Import CSP** to load an existing policy.
2. Enable a directive (e.g. `default-src`) using its checkbox.
3. Add keywords from the dropdown or enter custom sources (e.g. `https://cdn.example.com`).
4. Use nonce or style-hash helpers where inline content needs to be allowed safely.
5. Review the **security score** panel and apply recommendations if helpful.
6. Review the generated policy in the output panel.
7. Copy the policy, full header, or web server configuration snippet.

Toggle **Content-Security-Policy-Report-Only** to generate a report-only header for testing before enforcement.

## Project layout

```
src/csp/          Policy parsing, building, scoring, keywords, hashes, server exports
src/ui/           Form components, output panel, security score, helpers
src/api/          Client fetch wrapper for CSP lookup
server/           Shared lookup logic + Vite dev middleware
functions/api/    Cloudflare Pages Function (production API)
tests/            Vitest unit and integration tests
public/data/      Sandbox flag descriptions (loaded for tooltips)
```

## Deploy to Cloudflare Pages

URL import in production uses [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/). The function at [`functions/api/csp-lookup.ts`](functions/api/csp-lookup.ts) exposes `POST /api/csp-lookup` on Cloudflare’s edge—the same contract as local development.

### Dashboard setup

1. Connect this repository to Cloudflare Pages.
2. **Build command:** `yarn build`
3. **Build output directory:** `dist`
4. **Root directory / path:** leave empty (repo root)

Cloudflare reads `pages_build_output_dir` from `wrangler.toml` and deploys `functions/` alongside static assets. No deploy command or separate Worker is required.

### Local Pages preview

Test static assets plus the Pages Function locally:

```bash
yarn pages:dev
```

### CLI deploy

```bash
yarn pages:deploy
```

Requires [Wrangler](https://developers.cloudflare.com/workers/wrangler/) authentication (`wrangler login`).

## Contributing / AI agents

- [AGENTS.md](AGENTS.md) — conventions for coding agents (also available as `AGENT.md`)
- `.cursor/rules/` — Cursor-specific rules for dependency pinning and project context
- TSDoc comments on exported APIs in `src/`, `server/`, and `functions/`

## License

[CC0 1.0 Universal](LICENSE)
