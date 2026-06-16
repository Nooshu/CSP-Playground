import type { Connect, Plugin } from "vite";
import { CspLookupError, lookupCspForUrl } from "./fetchCsp";

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
        try {
          const payload = JSON.parse(body) as { url?: string };
          const result = await lookupCspForUrl(payload.url ?? "");
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result));
        } catch (error) {
          if (error instanceof CspLookupError) {
            res.statusCode = error.code === "no_csp" ? 404 : 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: error.code, message: error.message }));
            return;
          }

          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: "fetch_failed",
              message: "An unexpected error occurred while looking up the URL.",
            }),
          );
        }
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
