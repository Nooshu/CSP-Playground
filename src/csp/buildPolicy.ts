/**
 * Serializes in-memory directive state into CSP header values.
 *
 * @remarks
 * This module is the single source of truth for turning UI form state into the
 * semicolon-separated policy string copied by users. Directive-specific rules
 * (for example, boolean directives and sandbox flag lists) are handled here so
 * the UI only tracks `{ enabled, values }` per directive.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy | CSP on MDN}
 */

/** Enabled flag and source values for one CSP directive in the builder UI. */
export interface DirectiveState {
  /** Whether the directive is included in the generated policy. */
  enabled: boolean;
  /** Source expressions, sandbox flags, or other token values for the directive. */
  values: string[];
}

/** Map of directive name to its current builder state. */
export type PolicyState = Record<string, DirectiveState>;

/**
 * Creates an empty policy state object for a fresh builder session.
 *
 * @returns An empty object; directives are added as the user enables them.
 */
export function createInitialPolicyState(): PolicyState {
  return {};
}

/**
 * Builds a semicolon-separated CSP policy string from builder state.
 *
 * @param state - Current policy state collected from all directive sections.
 * @returns A CSP policy value suitable for the `Content-Security-Policy` header.
 *
 * @remarks
 * Special cases:
 * - `upgrade-insecure-requests` is emitted without a value list.
 * - `sandbox` emits either bare `sandbox` or `sandbox` plus space-separated flags.
 * - When `'none'` appears among sources, only `'none'` is emitted (per spec intent).
 * - Disabled directives and directives with no values are omitted.
 */
export function buildPolicyString(state: PolicyState): string {
  const parts: string[] = [];

  for (const [name, directive] of Object.entries(state)) {
    if (!directive.enabled) continue;

    // Boolean directive: no value list in the serialized output.
    if (name === "upgrade-insecure-requests") {
      parts.push(name);
      continue;
    }

    // Sandbox tokens are space-separated flags, not quoted CSP source expressions.
    if (name === "sandbox") {
      const flags = directive.values
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
      parts.push(flags.length > 0 ? `${name} ${flags.join(" ")}` : name);
      continue;
    }

    const values = directive.values
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    if (values.length === 0) continue;

    // `'none'` must be the only member of a source list when present.
    if (values.includes("'none'")) {
      parts.push(`${name} 'none'`);
      continue;
    }

    parts.push(`${name} ${values.join(" ")}`);
  }

  return parts.join("; ");
}

/**
 * Formats a full HTTP response header line for the generated policy.
 *
 * @param policy - Policy value from {@link buildPolicyString}; empty yields no header.
 * @param reportOnly - When true, uses `Content-Security-Policy-Report-Only`.
 * @returns Header line (`Name: value`) or an empty string when there is no policy.
 */
export function buildHeaderLine(
  policy: string,
  reportOnly: boolean,
): string {
  if (!policy) return "";
  const headerName = reportOnly
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
  return `${headerName}: ${policy}`;
}
