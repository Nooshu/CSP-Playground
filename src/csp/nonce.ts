/**
 * Cryptographic nonce generation and HTML snippet helpers for CSP nonces.
 *
 * @remarks
 * Nonces allow specific inline or external scripts/styles when paired with
 * `'nonce-…'` in `script-src` / `style-src`. Generated nonces use the CSP-safe
 * base64url alphabet (no `+`, `/`, or padding).
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy#nonce | CSP nonces on MDN}
 */

/** Number of random bytes before base64url encoding (128 bits of entropy). */
const NONCE_BYTES = 16;

/**
 * Generates a cryptographically random nonce suitable for CSP and the `nonce` attribute.
 *
 * @returns Base64url-encoded random string (no padding).
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(NONCE_BYTES);
  crypto.getRandomValues(bytes);

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  // CSP nonces use base64url, not standard base64.
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/**
 * Formats a raw nonce for inclusion in a CSP source list.
 *
 * @param nonce - Raw nonce from {@link generateNonce}.
 * @returns Quoted CSP source expression, for example `'nonce-abc123'`.
 */
export function formatNonceForCsp(nonce: string): string {
  return `'nonce-${nonce}'`;
}

/**
 * Derives a host-source expression (`scheme://host`) from a resource URL.
 *
 * @param urlString - Absolute HTTP(S) URL.
 * @returns Origin-style source (for example, `https://cdn.example.com`).
 */
export function hostSourceFromUrl(urlString: string): string {
  const url = new URL(urlString);
  return `${url.protocol}//${url.host}`;
}

/**
 * Alias for {@link hostSourceFromUrl} used by script nonce helpers.
 *
 * @param urlString - Absolute script URL.
 */
export function hostSourceFromScriptUrl(urlString: string): string {
  return hostSourceFromUrl(urlString);
}

/** Escapes characters that would break or inject through HTML attribute values. */
function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/**
 * Builds an external `<script>` tag with `nonce` and a safely escaped `src`.
 *
 * @param nonce - Raw nonce value (not the quoted CSP form).
 * @param scriptUrl - Script URL to load.
 */
export function buildExternalScriptSnippet(
  nonce: string,
  scriptUrl: string,
): string {
  const safeUrl = escapeHtmlAttribute(scriptUrl.trim());
  return `<script src="${safeUrl}" nonce="${nonce}"></script>`;
}

/**
 * Builds an inline `<script>` block with a matching `nonce` attribute.
 *
 * @param nonce - Raw nonce value.
 * @param scriptContent - JavaScript source (trimmed in output).
 */
export function buildInlineScriptSnippet(
  nonce: string,
  scriptContent: string,
): string {
  return `<script nonce="${nonce}">\n${scriptContent.trim()}\n</script>`;
}

/**
 * Builds a `<link rel="stylesheet">` tag with `nonce` and escaped `href`.
 *
 * @param nonce - Raw nonce value.
 * @param stylesheetUrl - Stylesheet URL.
 */
export function buildExternalStylesheetSnippet(
  nonce: string,
  stylesheetUrl: string,
): string {
  const safeUrl = escapeHtmlAttribute(stylesheetUrl.trim());
  return `<link rel="stylesheet" href="${safeUrl}" nonce="${nonce}" />`;
}

/**
 * Builds an inline `<style>` block with a matching `nonce` attribute.
 *
 * @param nonce - Raw nonce value.
 * @param styleContent - CSS source (trimmed in output).
 */
export function buildInlineStyleSnippet(
  nonce: string,
  styleContent: string,
): string {
  return `<style nonce="${nonce}">\n${styleContent.trim()}\n</style>`;
}

/**
 * Validates and normalizes an HTTP(S) URL entered in the nonce helper UI.
 *
 * @param input - User-provided URL string.
 * @param resourceLabel - Human-readable label for error messages (`script`, `stylesheet`).
 * @throws {Error} When the input is empty, not a URL, or not HTTP(S).
 */
function parseHttpUrl(input: string, resourceLabel: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error(`Enter the URL of the ${resourceLabel}.`);
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(
        `Only HTTP and HTTPS ${resourceLabel} URLs are supported.`,
      );
    }
    return url.toString();
  } catch (error) {
    if (error instanceof Error && error.message.includes("HTTP")) {
      throw error;
    }
    throw new Error(`Enter a valid ${resourceLabel} URL.`);
  }
}

/** @param input - User-provided script URL. @throws {Error} On invalid input. */
export function parseScriptUrl(input: string): string {
  return parseHttpUrl(input, "script");
}

/** @param input - User-provided stylesheet URL. @throws {Error} On invalid input. */
export function parseStylesheetUrl(input: string): string {
  return parseHttpUrl(input, "stylesheet");
}
