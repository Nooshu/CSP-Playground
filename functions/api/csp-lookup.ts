/// <reference types="@cloudflare/workers-types" />

import {
  cspLookupJsonResponse,
  handleCspLookupRequest,
} from "../../server/handleCspLookup";

export const onRequestPost: PagesFunction = async ({ request }) => {
  const rawBody = await request.text();
  const { status, body } = await handleCspLookupRequest(rawBody);
  return cspLookupJsonResponse(status, body);
};
