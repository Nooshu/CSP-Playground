import type { Connect, Plugin } from "vite";
import { cspLookupJsonResponse, handleCspLookupRequest } from "./handleCspLookup";

function createLookupHandler(): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (req.method !== "POST" || req.url !== "/api/csp-lookup") {
      next();
      return;
    }

    let body = "";
    req.on("data", (chunk: Buffer | string) => {
      body += chunk.toString();
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
