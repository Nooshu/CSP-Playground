/**
 * CSP keyword and scheme options offered in source-list directive editors.
 *
 * @remarks
 * Keywords appear quoted in policies (`'self'`). Scheme sources (`https:`) are
 * emitted without quotes per CSP syntax. The `quoted` flag documents how each
 * option is stored in generated policies.
 */

/** One selectable keyword or scheme in the “Add keyword” dropdown. */
export interface KeywordOption {
  /** Value inserted into the policy (includes quotes for keywords). */
  value: string;
  /** Label shown in the UI dropdown. */
  label: string;
  /** Whether the value is a quoted keyword rather than a bare scheme. */
  quoted: boolean;
}

/**
 * Standard CSP keywords and schemes available in source-list editors.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy#keywords | CSP keywords on MDN}
 */
export const KEYWORD_OPTIONS: KeywordOption[] = [
  { value: "'self'", label: "'self'", quoted: true },
  { value: "'none'", label: "'none'", quoted: true },
  { value: "'unsafe-inline'", label: "'unsafe-inline'", quoted: true },
  { value: "'unsafe-eval'", label: "'unsafe-eval'", quoted: true },
  { value: "'wasm-unsafe-eval'", label: "'wasm-unsafe-eval'", quoted: true },
  { value: "'strict-dynamic'", label: "'strict-dynamic'", quoted: true },
  { value: "'unsafe-hashes'", label: "'unsafe-hashes'", quoted: true },
  {
    value: "'inline-speculation-rules'",
    label: "'inline-speculation-rules'",
    quoted: true,
  },
  { value: "'report-sample'", label: "'report-sample'", quoted: true },
  { value: "'trusted-types-eval'", label: "'trusted-types-eval'", quoted: true },
  { value: "https:", label: "https:", quoted: false },
  { value: "http:", label: "http:", quoted: false },
  { value: "data:", label: "data:", quoted: false },
  { value: "blob:", label: "blob:", quoted: false },
];
