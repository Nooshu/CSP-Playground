/**
 * HTTP handler for `POST /api/csp-lookup` shared by Vite dev and Cloudflare Pages.
 *
 * @remarks
 * Parses JSON bodies, delegates fetching to {@link ./fetchCsp.lookupCspForUrl},
 * and maps {@link CspLookupError} codes to HTTP status codes.
 */

import { CspLookupError, lookupCspForUrl } from "./fetchCsp";

/** Maximum accepted JSON body size for lookup requests (bytes). */
const MAX_BODY_BYTES = 4_096;

/** JSON shape returned by the lookup API (success or error). */
export interface CspLookupResponseBody {
  error?: string;
  message?: string;
  url?: string;
  policy?: string;
  reportOnly?: boolean;
  source?: string;
}

/**
 * Handles a raw POST body for the CSP lookup endpoint.
 *
 * @param rawBody - Unparsed request body text.
 * @returns HTTP status code and JSON-serializable response body.
 */
export async function handleCspLookupRequest(
  rawBody: string,
): Promise<{ status: number; body: CspLookupResponseBody }> {
  if (rawBody.length > MAX_BODY_BYTES) {
    return {
      status: 413,
      body: { error: "invalid_url", message: "Request body is too large." },
    };
  }

  let payload: { url?: string };
  try {
    payload = JSON.parse(rawBody) as { url?: string };
  } catch {
    return {
      status: 400,
      body: {
        error: "invalid_url",
        message: "Request body must be valid JSON.",
      },
    };
  }

  try {
    const result = await lookupCspForUrl(payload.url ?? "");
    return { status: 200, body: result };
  } catch (error) {
    if (error instanceof CspLookupError) {
      return {
        status: error.code === "no_csp" ? 404 : 400,
        body: { error: error.code, message: error.message },
      };
    }

    return {
      status: 500,
      body: {
        error: "fetch_failed",
        message: "An unexpected error occurred while looking up the URL.",
      },
    };
  }
}

/**
 * Builds a `Response` with JSON body and no-cache headers.
 *
 * @param status - HTTP status code.
 * @param body - Payload to JSON-stringify.
 */
export function cspLookupJsonResponse(
  status: number,
  body: CspLookupResponseBody,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
