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
    supportsHtmlOnly: true,
    format: (headerName, policy, options) => {
      const headerLine = `<add name="${headerName}" value="${escapeApacheValue(policy)}" />`;
      if (options?.htmlOnly) {
        return `<location path=\"*.html\">\n  <system.webServer>\n    <httpProtocol>\n      <customHeaders>\n        ${headerLine}\n      </customHeaders>\n    </httpProtocol>\n  </system.webServer>\n</location>`;
      }
      return headerLine;
    },
  },
  {
    id: "cloudflare",
    name: "Cloudflare Pages",
    description:
      "_headers in public/ or build output; HTML-only via Pages Functions middleware",
    supportsHtmlOnly: true,
    format: (headerName, policy, options) => {
      if (options?.htmlOnly) {
        return `// functions/_middleware.ts
// Pages _headers matches directory paths only (not file extensions).
// Use middleware to add CSP only to HTML responses.
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
    supportsHtmlOnly: true,
    format: (headerName, policy, options) => {
      if (options?.htmlOnly) {
        return formatHeadersFileBlock("/*.html", headerName, policy);
      }
      return formatHeadersFileBlock("/*", headerName, policy);
    },
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "headers array in vercel.json",
    supportsHtmlOnly: true,
    format: (headerName, policy, options) => {
      const source = options?.htmlOnly ? "/(.*)\\.html" : "/(.*)";
      return `{
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
}`;
    },
  },
  {
    id: "traefik",
    name: "Traefik",
    description: "customResponseHeaders in dynamic or static config",
    format: (headerName, policy) =>
      `[http.middlewares]\n  [http.middlewares.csp-headers.headers.customResponseHeaders]\n    ${headerName} = "${escapeNginxValue(policy)}"`,
  },
  {
    id: "envoy",
    name: "Envoy",
    description: "response_headers_to_add in HTTP connection manager",
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
export function getWebServerExport(id: WebServerId): WebServerExport | undefined {
  return WEB_SERVER_EXPORTS.find((server) => server.id === id);
}
