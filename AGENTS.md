# AGENTS.md

Guidance for AI coding agents working in the CSP Builder repository.

> **Compatibility:** Older tooling may reference `AGENT.md`. That file is a symlink to this document.

## Project overview

- **Stack:** Vite, TypeScript, vanilla DOM (no React), Yarn
- **Purpose:** Browser-based Content Security Policy header builder with URL import, security scoring, and server export snippets
- **Package manager:** **Yarn v1** — use `yarn.lock` as the single source of truth. Do not use `npm install` for dependency changes.

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

## Commands

```bash
yarn install          # Install dependencies
yarn dev              # Dev server (http://localhost:5173)
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
