/**
 * SHA-256 hash helpers for `style-src-attr` and inline style attributes.
 *
 * @remarks
 * Inline `style=""` attributes cannot use nonces; CSP expects a `'sha256-…'`
 * hash of the exact attribute value. `'unsafe-hashes'` is required alongside
 * attribute hashes in modern browsers.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-attr | style-src-attr on MDN}
 */

/**
 * Computes the SHA-256 digest of a string and returns standard base64 (CSP form).
 *
 * @param text - Exact bytes to hash (typically the interior of `style="…"`).
 * @returns Base64-encoded digest without the `'sha256-'` prefix.
 */
export async function sha256Base64FromText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hashBuffer);

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

/**
 * Wraps a base64 digest in the quoted CSP hash source syntax.
 *
 * @param base64Hash - Output from {@link sha256Base64FromText}.
 */
export function formatSha256HashForCsp(base64Hash: string): string {
  return `'sha256-${base64Hash}'`;
}

/** Escapes characters that would break HTML attribute embedding in examples. */
function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/**
 * Builds a minimal HTML example showing an inline style attribute.
 *
 * @param styleValue - Exact `style` attribute value to demonstrate.
 * @returns Example markup users can adapt; `…` marks placeholder element content.
 */
export function buildInlineStyleAttributeSnippet(styleValue: string): string {
  const safeValue = escapeHtmlAttribute(styleValue);
  return `<div style="${safeValue}">...</div>`;
}

/**
 * CSP keyword required when allowing hashed inline style attributes.
 *
 * @remarks
 * Automatically added by the style-attribute hash helper in the UI.
 */
export const STYLE_ATTR_UNSAFE_HASHES = "'unsafe-hashes'";
