/**
 * Cloudflare Pages Function: `POST /api/csp-lookup`
 *
 * @remarks
 * Thin adapter around {@link ../../server/handleCspLookup | shared handler logic}
 * used in production on Cloudflare Pages.
 */

/// <reference types="@cloudflare/workers-types" />

import {
  cspLookupJsonResponse,
  handleCspLookupRequest,
} from "../../server/handleCspLookup";

/** Pages Function entry for CSP URL import requests. */
export const onRequestPost: PagesFunction = async ({ request }) => {
  const rawBody = await request.text();
  const { status, body } = await handleCspLookupRequest(rawBody);
  return cspLookupJsonResponse(status, body);
};
