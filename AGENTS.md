# AGENTS.md

Guidance for AI coding agents working in the CSP Playground repository.

> **Compatibility:** Older tooling may reference `AGENT.md`. That file is a symlink to this document.

## Project overview

- **Stack:** Vite, TypeScript, vanilla DOM (no React), Yarn
- **Purpose:** Browser-based Content Security Policy header builder with URL import, security scoring, and server export snippets
- **Package manager:** **Yarn v1 (classic)** — use `yarn.lock` as the single source of truth. Do not use `npm install` for dependency changes.
- **Production builds:** [Cloudflare Pages v3 build image](https://developers.cloudflare.com/pages/configuration/build-image/) — Node **22.16.0**, Yarn **1.22.22** (via env var; see below).

## Key paths

| Area | Location |
|------|----------|
| CSP logic | `src/csp/` |
| UI components | `src/ui/` |
| Client API | `src/api/` |
| URL lookup (shared) | `server/` |
| Cloudflare Pages API | `functions/api/` |
| Tests | `tests/` (Vitest + jsdom) |
| Cursor rules | `.cursor/rules/*.mdc` |
| Pages config | `wrangler.toml` |

## Commands

```bash
yarn install          # Install dependencies
yarn dev              # Dev server (http://localhost:5173)
yarn typecheck        # Typecheck src/, server/, and functions/
yarn build            # Typecheck + production build
yarn test             # Run tests
yarn test:coverage    # Tests with coverage thresholds
yarn verify:deps      # Pin + integrity check (run after dependency updates)
```

## Documentation standard

Use **TSDoc** ([tsdoc.org](https://tsdoc.org/)) for module and exported API comments in `src/`, `server/`, and `functions/`.

## Dependency policy (required)

All dependency work must follow `.cursor/rules/dependency-pinning.mdc`.

Summary:

1. **Pin direct dependencies** — exact versions in `package.json` (no `^`, `~`, or `*` ranges).
2. **Lockfile** — commit updated `yarn.lock` after changes.
3. **Verify once at the end** — after **all** dependency updates in a session are complete, run **one** integrity verification:

   ```bash
   yarn verify:deps
   ```

   Do **not** run `yarn verify:deps` after each individual package change; batch updates, then verify once.

4. **Transitive dependencies** — every resolved tarball in `yarn.lock` must have an `integrity` hash. The verify script fails if any are missing.

All dependency work must also follow `.cursor/rules/cloudflare-pages-v3.mdc` for Pages v3 compatibility.

## Cloudflare Pages v3 compatibility (required)

Deploys use the **Pages v3 build image** (Ubuntu 22.04, x86_64). Toolchain and package choices must work on that environment.

### Toolchain pins

| Tool | v3 default | This project | How to pin |
|------|------------|--------------|------------|
| Node.js | 22.16.0 | 22.16.0 | `.nvmrc` — **exact semver only** |
| Yarn | 4.9.1 | 1.22.22 (classic) | `YARN_VERSION=1.22.22` in Pages build env vars |

**Critical:** v3 does **not** detect Yarn 1 from `yarn.lock`. Without `YARN_VERSION=1.22.22` in the Cloudflare Pages dashboard (production **and** preview), the build uses Yarn 4 and fails against this lockfile.

v3 also does **not** read `package.json` → `engines` for Node or package managers. Use `.nvmrc` for the Pages build Node version; `engines.node` (`>=22.16.0`) is for local tooling only. Do not use Node codenames in `.nvmrc` (e.g. `lts/hydrogen`).

### Package compatibility rules

- Stay on **Yarn v1** unless the user explicitly requests a migration.
- New dependencies must install on **Linux x86_64 + Node 22** (the v3 build container).
- Keep test-only packages (`vitest`, `jsdom`, coverage, `wrangler`) in `devDependencies`. Pages runs `yarn build` only.
- **Pages Functions** (`functions/`) use the Workers runtime — shared `server/` code must use Web APIs, not Node built-ins, unless `nodejs_compat` is enabled and verified.

### Verify deploy-related changes

Use the Node version from `.nvmrc`, then:

```bash
yarn install
yarn verify:deps   # once, after all dependency edits
yarn build
yarn test
```

Use `yarn pages:dev` when changing Functions or shared server lookup code.

### Pages dashboard settings

- **Build command:** `yarn build`
- **Build output directory:** `dist`
- **Build environment variables:** `YARN_VERSION=1.22.22` (required); `NODE_VERSION=22.16.0` (optional if `.nvmrc` is committed)

## Testing expectations

- Run `yarn test` after logic changes.
- Run `yarn build` before finishing TypeScript or bundler changes.
- Maintain existing coverage thresholds when touching tested code.

## Git conventions

- Do not commit unless explicitly asked.
- Do not commit `node_modules/`, `dist/`, or `coverage/`.
- Include `yarn.lock` when dependencies change.

## Deployment

- Production: Cloudflare Pages (`yarn pages:deploy`)
- Local Pages preview: `yarn pages:dev`
