/**
 * Vite plugin exposing `POST /api/csp-lookup` during local dev and preview.
 *
 * @remarks
 * Mirrors the Cloudflare Pages function at `functions/api/csp-lookup.ts` so the
 * URL importer works without deploying. Streams the request body with an early
 * 413 response if the client exceeds the size limit.
 */

import type { Connect, Plugin } from "vite";
import { cspLookupJsonResponse, handleCspLookupRequest } from "./handleCspLookup";

/** Creates Connect middleware that handles CSP lookup POST requests. */
function createLookupHandler(): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (req.method !== "POST" || req.url !== "/api/csp-lookup") {
      next();
      return;
    }

    let body = "";
    req.on("data", (chunk: Buffer | string) => {
      body += chunk.toString();
      // Abort oversized bodies before the handler runs.
      if (body.length > 4_096) {
        res.statusCode = 413;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "invalid_url", message: "Request body is too large." }));
        req.destroy();
      }
    });

    req.on("end", () => {
      void (async () => {
        const { status, body: responseBody } = await handleCspLookupRequest(body);
        const response = cspLookupJsonResponse(status, responseBody);
        res.statusCode = response.status;
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        res.end(await response.text());
      })();
    });
  };
}

/**
 * Registers the lookup middleware on Vite dev and preview servers.
 *
 * @returns Vite plugin definition.
 */
export function cspLookupPlugin(): Plugin {
  const attachMiddleware = (server: { middlewares: Connect.Server }) => {
    server.middlewares.use(createLookupHandler());
  };

  return {
    name: "csp-lookup-api",
    configureServer: attachMiddleware,
    configurePreviewServer: attachMiddleware,
  };
}
