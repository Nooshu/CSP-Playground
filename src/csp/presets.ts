/**
 * Starter Content Security Policy presets for the builder UI.
 *
 * @remarks
 * Presets are educational starting points—not deployment-ready policies for every
 * site. Each maps to {@link PolicyState} so the UI can apply them without parsing.
 */

import type { PolicyState } from "./buildPolicy";

/** Identifier for a built-in CSP starter preset. */
export type CspPresetId = "beginner" | "intermediate" | "advanced";

/** Metadata and directive state for one CSP starter preset. */
export interface CspPreset {
  /** Stable preset key used in UI and tests. */
  id: CspPresetId;
  /** Short label shown on the preset card. */
  title: string;
  /** One-line summary of the security posture. */
  summary: string;
  /** Longer guidance shown in the preset picker. */
  description: string;
  /** Directive state applied when the user confirms the preset. */
  state: PolicyState;
}

/** Built-in presets ordered from most permissive to strictest. */
export const CSP_PRESETS: readonly CspPreset[] = [
  {
    id: "beginner",
    title: "Beginner",
    summary: "Permissive defaults that work on many sites",
    description:
      "A gentle introduction to CSP with `'self'` defaults and `'unsafe-inline'` for scripts and styles. Good for learning before tightening sources.",
    state: {
      "default-src": { enabled: true, values: ["'self'"] },
      "script-src": {
        enabled: true,
        values: ["'self'", "'unsafe-inline'"],
      },
      "style-src": {
        enabled: true,
        values: ["'self'", "'unsafe-inline'"],
      },
      "img-src": { enabled: true, values: ["'self'", "data:"] },
      "font-src": { enabled: true, values: ["'self'"] },
      "object-src": { enabled: true, values: ["'none'"] },
    },
  },
  {
    id: "intermediate",
    title: "Intermediate",
    summary: "Balanced restrictions without inline scripts",
    description:
      "Removes `'unsafe-inline'` from scripts while keeping practical allowances for images, fonts, and API calls. Adds `object-src 'none'` and frame protections.",
    state: {
      "default-src": { enabled: true, values: ["'self'"] },
      "script-src": { enabled: true, values: ["'self'"] },
      "style-src": {
        enabled: true,
        values: ["'self'", "'unsafe-inline'"],
      },
      "img-src": { enabled: true, values: ["'self'", "data:", "https:"] },
      "font-src": { enabled: true, values: ["'self'"] },
      "connect-src": { enabled: true, values: ["'self'"] },
      "object-src": { enabled: true, values: ["'none'"] },
      "base-uri": { enabled: true, values: ["'self'"] },
      "frame-ancestors": { enabled: true, values: ["'self'"] },
    },
  },
  {
    id: "advanced",
    title: "Advanced",
    summary: "Strict policy with minimal allowances",
    description:
      "A locked-down baseline using `default-src 'none'`. Add nonces or hashes for any inline scripts or styles before deploying.",
    state: {
      "default-src": { enabled: true, values: ["'none'"] },
      "script-src": { enabled: true, values: ["'self'"] },
      "style-src": { enabled: true, values: ["'self'"] },
      "img-src": { enabled: true, values: ["'self'", "data:"] },
      "font-src": { enabled: true, values: ["'self'"] },
      "connect-src": { enabled: true, values: ["'self'"] },
      "object-src": { enabled: true, values: ["'none'"] },
      "base-uri": { enabled: true, values: ["'self'"] },
      "form-action": { enabled: true, values: ["'self'"] },
      "frame-ancestors": { enabled: true, values: ["'none'"] },
      "upgrade-insecure-requests": { enabled: true, values: [] },
    },
  },
] as const;

/**
 * Looks up a built-in preset by id.
 *
 * @param id - Preset identifier.
 * @returns The matching preset, or `undefined` when `id` is unknown.
 */
export function getCspPreset(id: CspPresetId): CspPreset | undefined {
  return CSP_PRESETS.find((preset) => preset.id === id);
}
