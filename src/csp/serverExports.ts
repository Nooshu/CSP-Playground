/**
 * Server-specific configuration snippets for deploying CSP response headers.
 *
 * @remarks
 * Each exporter escapes quotes and backslashes appropriately for its target
 * format. Only servers that support setting response headers are included.
 */

/** Identifier for a supported web server or proxy export format. */
export type WebServerId =
  | "apache"
  | "nginx"
  | "caddy"
  | "litespeed"
  | "iis"
  | "cloudflare"
  | "netlify"
  | "firebase"
  | "vercel"
  | "traefik"
  | "envoy";

/** Metadata and formatter for one web server export target. */
export interface WebServerExport {
  id: WebServerId;
  /** Display name in the server export dropdown. */
  name: string;
  /** Short help text describing where to paste the snippet. */
  description: string;
  /**
   * Whether this exporter can scope the header to HTML responses only.
   *
   * @remarks
   * Some platforms (e.g. proxies or middleware-only configs) apply headers
   * globally and cannot trivially restrict by file extension.
   */
  supportsHtmlOnly?: boolean;
  /**
   * Tooltip text when {@link supportsHtmlOnly} is false.
   *
   * @remarks
   * Shown on the HTML-only checkbox `title` attribute so users understand why
   * the control is disabled for this export format.
   */
  htmlOnlyUnsupportedReason?: string;
  /**
   * Extra guidance when HTML-only export needs platform setup beyond a single
   * config file (for example Cloudflare Pages Functions middleware).
   */
  htmlOnlySetupNote?: string;
  /**
   * Platform-specific guidance shown whenever this export is selected.
   *
   * @remarks
   * Use for setup that applies beyond a single config snippet, such as when a
   * host needs middleware in addition to `_headers`.
   */
  setupNote?: string;
  /** Produces a config fragment for the given header name and policy value. */
  format: (
    headerName: string,
    policy: string,
    options?: { htmlOnly?: boolean },
  ) => string;
}

/** Escapes values embedded in Apache `Header` directives (double-quoted). */
function escapeApacheValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Escapes values embedded in Nginx/Caddy-style double-quoted config strings. */
function escapeNginxValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Escapes values embedded in JSON string literals. */
function escapeJsonString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

/** Escapes values embedded in TypeScript double-quoted string literals. */
function escapeTsString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$");
}

/** Formats a `_headers` file block for static hosts (Cloudflare Pages, Netlify). */
function formatHeadersFileBlock(
  path: string,
  headerName: string,
  policy: string,
): string {
  return `${path}\n  ${headerName}: ${policy}`;
}

/**
 * All supported web server export formats, in dropdown order.
 *
 * @remarks
 * `format` receives the full header name (for example,
 * `Content-Security-Policy-Report-Only`) and the raw policy value.
 */
export const WEB_SERVER_EXPORTS: WebServerExport[] = [
  {
    id: "apache",
    name: "Apache",
    description: "Header directive in .htaccess or VirtualHost config",
    supportsHtmlOnly: true,
    format: (headerName, policy, options) => {
      const directive = `Header always set ${headerName} "${escapeApacheValue(policy)}"`;
      if (options?.htmlOnly) {
        return `<FilesMatch "\\\\.html$">\n  ${directive}\n</FilesMatch>`;
      }
      return directive;
    },
  },
  {
    id: "nginx",
    name: "Nginx",
    description: "add_header in server or location block",
    supportsHtmlOnly: true,
    format: (headerName, policy, options) => {
      const directive = `add_header ${headerName} "${escapeNginxValue(policy)}" always;`;
      if (options?.htmlOnly) {
        return `location ~* \\\\.html$ {\n  ${directive}\n}`;
      }
      return directive;
    },
  },
  {
    id: "caddy",
    name: "Caddy",
    description: "header directive in Caddyfile",
    supportsHtmlOnly: true,
    format: (headerName, policy, options) => {
      const directive = `header ${headerName} "${escapeNginxValue(policy)}"`;
      if (options?.htmlOnly) {
        return `@html path *.html\n${directive} @html`;
      }
      return directive;
    },
  },
  {
    id: "litespeed",
    name: "LiteSpeed",
    description: "Header directive (Apache-compatible syntax)",
    supportsHtmlOnly: true,
    format: (headerName, policy, options) => {
      const directive = `Header always set ${headerName} "${escapeApacheValue(policy)}"`;
      if (options?.htmlOnly) {
        return `<FilesMatch "\\\\.html$">\n  ${directive}\n</FilesMatch>`;
      }
      return directive;
    },
  },
  {
    id: "iis",
    name: "Microsoft IIS",
    description: "customHeaders in web.config",
    htmlOnlyUnsupportedReason:
      "IIS location paths are virtual directories, not file-extension wildcards. Use URL Rewrite to scope headers to .html URLs or HTML responses.",
    format: (headerName, policy) => {
      return `<add name="${headerName}" value="${escapeApacheValue(policy)}" />`;
    },
  },
  {
    id: "cloudflare",
    name: "Cloudflare Pages",
    description:
      "_headers in public/ or build output for site-wide rules (path patterns only)",
    supportsHtmlOnly: true,
    setupNote:
      "Cloudflare Pages can export site-wide CSP in _headers (below). HTML-only CSP cannot use _headers — it requires Pages Functions middleware. Check \"Only apply CSP response header to HTML files\" to export functions/_middleware.ts.",
    htmlOnlySetupNote:
      "Deploy the middleware export below as functions/_middleware.ts and enable Pages Functions. Do not add the same CSP to public/_headers — middleware sets it on HTML responses by Content-Type.",
    format: (headerName, policy, options) => {
      if (options?.htmlOnly) {
        return `// Cloudflare Pages: HTML-only CSP requires Pages Functions — not _headers.
// 1. Save as functions/_middleware.ts (create the functions/ folder if needed).
// 2. Optional: npm i -D @cloudflare/workers-types for local TypeScript types.
// 3. Do not add the same CSP to public/_headers; middleware sets it on HTML responses only.
// 4. _headers rules do not apply to responses from Pages Functions — use middleware for SSR too.
//
// Docs: https://developers.cloudflare.com/pages/functions/middleware/
import type { PagesFunction } from "@cloudflare/workers-types";

const CSP_HEADER = "${headerName}";
const CSP_VALUE = "${escapeTsString(policy)}";

export const onRequest: PagesFunction = async (context) => {
  const response = await context.next();
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set(CSP_HEADER, CSP_VALUE);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};`;
      }

      return formatHeadersFileBlock("/*", headerName, policy);
    },
  },
  {
    id: "netlify",
    name: "Netlify",
    description: "_headers in the publish directory (for example public/)",
    htmlOnlyUnsupportedReason:
      "Netlify _headers splats match greedily to the end of the path, so /*.html is treated as /*. HTML is also commonly served at extension-less URLs, which splats cannot target.",
    format: (headerName, policy) =>
      formatHeadersFileBlock("/*", headerName, policy),
  },
  {
    id: "firebase",
    name: "Firebase Hosting",
    description: "hosting.headers array in firebase.json (glob source patterns)",
    supportsHtmlOnly: true,
    format: (headerName, policy, options) => {
      if (options?.htmlOnly) {
        return `// Matches extension-less paths (typical HTML document routes).
// **/*.html only applies when the URL contains ".html"; it misses "/" and cleanUrls routes.
{
  "hosting": {
    "headers": [
      {
        "source": "/**/!(*.*)",
        "headers": [
          {
            "key": "${headerName}",
            "value": "${escapeJsonString(policy)}"
          }
        ]
      }
    ]
  }
}`;
      }

      const source = "**";
      return `{
  "hosting": {
    "headers": [
      {
        "source": "${source}",
        "headers": [
          {
            "key": "${headerName}",
            "value": "${escapeJsonString(policy)}"
          }
        ]
      }
    ]
  }
}`;
    },
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "headers array in vercel.json",
    htmlOnlyUnsupportedReason:
      "Vercel header rules match the request pathname. With cleanUrls, HTML pages are served without a .html suffix, so /(.*)\\.html does not match document routes.",
    format: (headerName, policy) => `{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "${headerName}",
          "value": "${escapeJsonString(policy)}"
        }
      ]
    }
  ]
}`,
  },
  {
    id: "traefik",
    name: "Traefik",
    description: "customResponseHeaders in dynamic or static config",
    htmlOnlyUnsupportedReason:
      "Traefik middleware applies custom response headers to every response on the matched route. This export snippet cannot limit CSP to HTML files only.",
    format: (headerName, policy) =>
      `[http.middlewares]\n  [http.middlewares.csp-headers.headers.customResponseHeaders]\n    ${headerName} = "${escapeNginxValue(policy)}"`,
  },
  {
    id: "envoy",
    name: "Envoy",
    description: "response_headers_to_add in HTTP connection manager",
    htmlOnlyUnsupportedReason:
      "Envoy response_headers_to_add applies to every response from the connection manager. This export snippet cannot filter by file type or Content-Type.",
    format: (headerName, policy) =>
      `response_headers_to_add:\n- header:\n    key: "${headerName}"\n    value: "${escapeNginxValue(policy)}"`,
  },
];

/**
 * Looks up export metadata by server id.
 *
 * @param id - Server identifier from the policy output dropdown.
 * @returns Matching export definition, or `undefined` if not found.
 */
export function getWebServerExport(
  id: WebServerId,
): WebServerExport | undefined {
  return WEB_SERVER_EXPORTS.find((server) => server.id === id);
}
