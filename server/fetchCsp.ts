/**
 * Server-side CSP discovery: fetches remote pages and extracts policies safely.
 *
 * @remarks
 * Used by the URL importer API. Requests are restricted to public HTTP(S) URLs
 * to mitigate SSRF—private IPs, localhost, and `.local` hosts are blocked.
 * Lookup order: `HEAD` headers → `GET` headers → HTML `<meta>` tags.
 */

import { extractMetaCsp } from "../src/csp/parsePolicy";

/** Maximum redirect hops before aborting as a loop. */
const MAX_REDIRECTS = 5;
/** Network timeout per fetch attempt (milliseconds). */
const FETCH_TIMEOUT_MS = 12_000;
/** Cap HTML body size when falling back to meta-tag parsing. */
const MAX_HTML_BYTES = 512_000;

/** Hostnames always rejected regardless of IP resolution. */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
]);

/** Successful CSP lookup payload returned to API clients. */
export interface CspLookupResult {
  url: string;
  policy: string;
  reportOnly: boolean;
  source: "header-enforce" | "header-report-only" | "meta-enforce" | "meta-report-only";
}

/** Machine-readable lookup failure codes mapped to HTTP status by the handler. */
export type CspLookupErrorCode =
  | "invalid_url"
  | "blocked_url"
  | "fetch_failed"
  | "no_csp";

/**
 * Typed error thrown when a URL cannot be fetched or has no discoverable CSP.
 */
export class CspLookupError extends Error {
  code: CspLookupErrorCode;

  constructor(code: CspLookupErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "CspLookupError";
  }
}

/**
 * Detects RFC1918, loopback, link-local, and malformed IPv4 literals.
 *
 * @param hostname - Host portion of the lookup URL (not bracketed IPv6).
 */
function isPrivateIpv4(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;

  const octets = match.slice(1, 5).map(Number);
  // Reject impossible octets (treated as unsafe).
  if (octets.some((octet) => octet > 255)) return true;

  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;

  return false;
}

/**
 * Validates and normalizes a user-supplied lookup URL.
 *
 * @param input - Raw URL string from the API request body.
 * @returns Parsed public HTTP(S) URL without credentials.
 * @throws {@link CspLookupError} When the URL is missing, invalid, or blocked.
 */
export function normalizeLookupUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new CspLookupError("invalid_url", "Please enter a URL.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new CspLookupError("invalid_url", "The URL is not valid.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new CspLookupError("invalid_url", "Only HTTP and HTTPS URLs are supported.");
  }

  if (parsed.username || parsed.password) {
    throw new CspLookupError("invalid_url", "URLs with credentials are not allowed.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    isPrivateIpv4(hostname)
  ) {
    throw new CspLookupError("blocked_url", "That URL cannot be looked up for security reasons.");
  }

  return parsed;
}

/** Reads enforce or report-only CSP headers, preferring enforce. */
function readCspFromHeaders(headers: Headers): {
  policy: string | null;
  reportOnly: boolean;
  source: CspLookupResult["source"] | null;
} {
  const enforce = headers.get("content-security-policy")?.trim();
  if (enforce) {
    return { policy: enforce, reportOnly: false, source: "header-enforce" };
  }

  const reportOnly = headers.get("content-security-policy-report-only")?.trim();
  if (reportOnly) {
    return {
      policy: reportOnly,
      reportOnly: true,
      source: "header-report-only",
    };
  }

  return { policy: null, reportOnly: false, source: null };
}

/**
 * Fetches a URL following redirects manually with SSRF checks on each hop.
 *
 * @remarks
 * Uses `redirect: "manual"` so every redirect target is re-validated.
 */
async function fetchWithRedirects(
  startUrl: URL,
  method: "HEAD" | "GET",
): Promise<Response> {
  let currentUrl = startUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    normalizeLookupUrl(currentUrl.toString());

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(currentUrl.toString(), {
        method,
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "CSP-Builder/1.0 (+https://github.com/)",
          Accept: method === "GET" ? "text/html,application/xhtml+xml" : "*/*",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          throw new CspLookupError("fetch_failed", "The server returned an invalid redirect.");
        }
        currentUrl = new URL(location, currentUrl);
        continue;
      }

      return response;
    } catch (error) {
      if (error instanceof CspLookupError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new CspLookupError("fetch_failed", "The request timed out.");
      }
      throw new CspLookupError(
        "fetch_failed",
        "Could not reach that URL. Check the address and try again.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new CspLookupError("fetch_failed", "Too many redirects while fetching the URL.");
}

/**
 * Looks up the CSP policy published by a remote origin.
 *
 * @param input - User-provided URL string.
 * @returns Policy text, report-only flag, and discovery source.
 * @throws {@link CspLookupError} On validation, network, or missing-policy errors.
 */
export async function lookupCspForUrl(input: string): Promise<CspLookupResult> {
  const normalizedUrl = normalizeLookupUrl(input);

  const headResponse = await fetchWithRedirects(normalizedUrl, "HEAD");
  const headResult = readCspFromHeaders(headResponse.headers);

  if (headResult.policy && headResult.source) {
    return {
      url: headResponse.url || normalizedUrl.toString(),
      policy: headResult.policy,
      reportOnly: headResult.reportOnly,
      source: headResult.source,
    };
  }

  const getResponse = await fetchWithRedirects(normalizedUrl, "GET");

  if (getResponse.status < 200 || getResponse.status >= 400) {
    throw new CspLookupError(
      "fetch_failed",
      `The server responded with status ${getResponse.status}.`,
    );
  }

  const getHeaderResult = readCspFromHeaders(getResponse.headers);
  if (getHeaderResult.policy && getHeaderResult.source) {
    return {
      url: getResponse.url || normalizedUrl.toString(),
      policy: getHeaderResult.policy,
      reportOnly: getHeaderResult.reportOnly,
      source: getHeaderResult.source,
    };
  }

  const html = (await getResponse.text()).slice(0, MAX_HTML_BYTES);
  const metaResult = extractMetaCsp(html);

  if (metaResult.policy) {
    return {
      url: getResponse.url || normalizedUrl.toString(),
      policy: metaResult.policy,
      reportOnly: metaResult.reportOnly,
      source: metaResult.reportOnly ? "meta-report-only" : "meta-enforce",
    };
  }

  throw new CspLookupError(
    "no_csp",
    "No Content-Security-Policy was found in the response headers or HTML meta tags.",
  );
}
