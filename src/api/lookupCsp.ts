/**
 * Browser client for the CSP URL lookup API.
 *
 * @remarks
 * Delegates fetching to `POST /api/csp-lookup`, implemented by
 * {@link ../../server/handleCspLookup | handleCspLookupRequest} in dev and on
 * Cloudflare Pages in production.
 */

/** Successful CSP discovery response from the lookup API. */
export interface CspLookupSuccess {
  url: string;
  policy: string;
  reportOnly: boolean;
  /** Where the policy was found on the target page. */
  source:
    | "header-enforce"
    | "header-report-only"
    | "meta-enforce"
    | "meta-report-only";
}

/** Error payload thrown when the lookup API returns a non-OK status. */
export interface CspLookupFailure {
  error: "invalid_url" | "blocked_url" | "fetch_failed" | "no_csp";
  message: string;
}

/**
 * Fetches an existing CSP for a URL via the backend lookup endpoint.
 *
 * @param url - User-entered site URL to inspect.
 * @returns Parsed lookup result on success.
 * @throws {@link CspLookupFailure} When the server returns an error response.
 */
export async function lookupCspFromUrl(
  url: string,
): Promise<CspLookupSuccess> {
  const response = await fetch("/api/csp-lookup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ url }),
  });

  const payload = (await response.json()) as CspLookupSuccess | CspLookupFailure;

  if (!response.ok) {
    const failure = payload as CspLookupFailure;
    throw failure;
  }

  return payload as CspLookupSuccess;
}
