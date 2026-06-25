# CSP Playground

A browser-based tool for building [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) (CSP) headers. Enable directives, pick common keywords, add custom source URLs, review a live security score, and copy the generated policy—or ready-made snippets—for your web server.

The app runs entirely in the browser for policy editing. **Import from URL** uses a small server-side lookup (Vite middleware in development, [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/) in production) so you can fetch an existing policy from HTTP headers or HTML meta tags. **Paste headers or policy** runs entirely in the browser—paste a full response header block or a single `Content-Security-Policy` line to extract and import the CSP.

## Purpose

Content Security Policy is one of the most effective mitigations against cross-site scripting (XSS) and related injection attacks, but the syntax is easy to get wrong. CSP Playground lowers the barrier to authoring a correct policy by:

- Mapping every standard directive to an accessible form control
- Explaining sandbox flags and linking to MDN documentation
- Generating nonces, style-attribute hashes, and server config snippets
- Scoring your policy heuristically and suggesting concrete improvements

If a site has no CSP yet, the importer links to [why-csp.html](why-csp.html)—a short guide on why and how to adopt a policy.

## Features

### Policy presets

- **Beginner**, **Intermediate**, and **Advanced** starter policies via **Choose a preset**
- Applies immediately when the form is empty; otherwise asks for confirmation before replacing your work
- Each preset enables a sensible subset of directives with documented keywords and sources

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

### Import existing policy

Import an existing CSP into the builder from a live URL or pasted text:

- **Import from URL** — enter a site URL and fetch its CSP from:
  - `Content-Security-Policy` / `Content-Security-Policy-Report-Only` response headers
  - `<meta http-equiv="Content-Security-Policy">` tags in HTML
- **Paste headers or policy** — paste directly into the form (no server lookup):
  - Full HTTP response headers; `Content-Security-Policy` is extracted automatically
  - A single `Content-Security-Policy:` header line on its own
- Pre-fills the builder form from the parsed policy
- **Validate CSP** checks formatting and suggests corrections (URL and paste import)
- Graceful handling when no policy is found (links to the why-CSP guide)

### Nonce and hash helpers

- **Script/style nonce helper** (on `script-src`, `script-src-elem`, `style-src`, `style-src-elem`):
  - Generates **example** cryptographically random nonces and matching HTML snippets for inline or external scripts/stylesheets
  - Adds `'nonce-…'` to the directive
  - **Production note:** in production, generate a **new nonce on every HTTP response** on the server and inject the same value into both your CSP header and your HTML — never reuse a fixed nonce copied from this tool
- **Style attribute hash helper** (on `style-src-attr`):
  - SHA-256 hashes the exact `style="…"` attribute value via Web Crypto
  - Adds `'sha256-…'` and `'unsafe-hashes'` when needed
  - Copies a sample element with the hashed attribute

### Live output and export

- Live preview of the **policy value** and full **HTTP header line**
- Toggle **enforce** vs **Content-Security-Policy-Report-Only** for safe rollout
- One-click copy for policy value, header, or web-server snippet
- Export snippets for **Apache**, **Nginx**, **Caddy**, **LiteSpeed**, **Microsoft IIS**, **Cloudflare Pages**, **Netlify**, **Firebase Hosting**, **Vercel**, **Traefik**, and **Envoy**
- **HTML-only CSP** option for servers that support scoping headers to HTML responses (Apache, Nginx, Caddy, LiteSpeed, Cloudflare Pages middleware, Firebase Hosting); unsupported servers show a disabled checkbox with an explanation
- Per-server setup notes (e.g. Cloudflare Pages `_headers` vs `functions/_middleware.ts` for HTML-only)
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
- Preset and confirmation flows use a native `<dialog>` modal with focus trap, `inert` on the main app, and focus restoration on close

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | TypeScript, vanilla DOM (no framework) |
| Bundler | [Vite](https://vite.dev/) |
| Package manager | [Yarn v1](https://classic.yarnpkg.com/) (`yarn.lock` is canonical) |
| Tests | [Vitest](https://vitest.dev/) + jsdom, Istanbul coverage |
| Lint / format | [Biome](https://biomejs.dev/) |
| Deployment | Static `dist/` on [Cloudflare Pages](https://pages.cloudflare.com/) + Pages Functions |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) **22.16.0** (see `.nvmrc`; matches Cloudflare Pages v3)
- [Yarn](https://yarnpkg.com/) **1.22.22** (classic; set `YARN_VERSION=1.22.22` on Cloudflare Pages)

### Install

```bash
yarn install
```

### Development

```bash
yarn dev
# or
yarn start
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
yarn test:coverage     # Coverage with thresholds (100% lines/functions, 99% statements, 93% branches)
```

### E2E smoke tests

Playwright runs against the production build served by `vite preview` (includes the CSP lookup middleware):

```bash
yarn build             # Required before first e2e run
yarn test:e2e          # Headless Chromium smoke suite
yarn test:e2e:ui       # Interactive Playwright UI
yarn playwright install chromium  # One-time browser install locally
```

### Typecheck

```bash
yarn typecheck         # Client (src/) + server/functions shared code
```

### Lint and format

```bash
yarn lint              # Biome check (CI runs this)
yarn lint:fix          # Apply safe fixes and formatting
yarn format            # Format only
```

### Dependency integrity

Direct dependencies are **pinned to exact versions**. After any dependency update, run verification **once** when all changes are complete:

```bash
yarn verify:deps
```

See [AGENTS.md](AGENTS.md) for the full dependency policy.

## Usage

1. Optionally click **Choose a preset** for a beginner, intermediate, or advanced starter policy.
2. Optionally use **Import existing policy** at the top—fetch from a URL, or paste response headers / a `Content-Security-Policy` header line—and click **Import CSP**.
3. Enable a directive (e.g. `default-src`) using its checkbox.
4. Add keywords from the dropdown or enter custom sources (e.g. `https://cdn.example.com`).
5. Use nonce or style-hash helpers where inline content needs to be allowed safely.
6. Review the **security score** panel and apply recommendations if helpful.
7. Review the generated policy in the output panel.
8. Copy the policy, full header, or web server configuration snippet.

Toggle **Content-Security-Policy-Report-Only** to generate a report-only header for testing before enforcement.

## Project layout

```
src/csp/          Policy parsing, building, scoring, keywords, hashes, presets, server exports
src/ui/           Form components, output panel, security score, preset picker, modal, helpers
src/api/          Client fetch wrapper for CSP lookup
server/           Shared lookup logic + Vite dev middleware
functions/api/    Cloudflare Pages Function (production API)
tests/            Vitest unit and integration tests
docs/             Architecture and contributor docs
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
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — module boundaries, data flow, and API contract
- [llms.txt](llms.txt) — concise project summary for LLM crawlers and agents
- `.cursor/rules/` — Cursor-specific rules for dependency pinning and project context
- TSDoc comments on exported APIs in `src/`, `server/`, and `functions`

### Dependency update bots

Two bots run side by side with non-overlapping scopes:

| Bot | Scope |
|-----|--------|
| [Renovate](renovate.json) | npm / Yarn packages (`package.json`, `yarn.lock`) |
| [Dependabot](.github/dependabot.yml) | GitHub Actions pins in `.github/workflows/` |

Both label PRs `dependencies` and run on the same daily schedule (06:00 Europe/London). Either bot may open a security advisory PR for npm; merge one and close any duplicate.

## License

[MIT](LICENSE)
