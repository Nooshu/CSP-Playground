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
  | "traefik"
  | "envoy";

/** Metadata and formatter for one web server export target. */
export interface WebServerExport {
  id: WebServerId;
  /** Display name in the server export dropdown. */
  name: string;
  /** Short help text describing where to paste the snippet. */
  description: string;
  /** Produces a config fragment for the given header name and policy value. */
  format: (headerName: string, policy: string) => string;
}

/** Escapes values embedded in Apache `Header` directives (double-quoted). */
function escapeApacheValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Escapes values embedded in Nginx/Caddy-style double-quoted config strings. */
function escapeNginxValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
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
    format: (headerName, policy) =>
      `Header always set ${headerName} "${escapeApacheValue(policy)}"`,
  },
  {
    id: "nginx",
    name: "Nginx",
    description: "add_header in server or location block",
    format: (headerName, policy) =>
      `add_header ${headerName} "${escapeNginxValue(policy)}" always;`,
  },
  {
    id: "caddy",
    name: "Caddy",
    description: "header directive in Caddyfile",
    format: (headerName, policy) =>
      `header ${headerName} "${escapeNginxValue(policy)}"`,
  },
  {
    id: "litespeed",
    name: "LiteSpeed",
    description: "Header directive (Apache-compatible syntax)",
    format: (headerName, policy) =>
      `Header always set ${headerName} "${escapeApacheValue(policy)}"`,
  },
  {
    id: "iis",
    name: "Microsoft IIS",
    description: "customHeaders in web.config",
    format: (headerName, policy) =>
      `<add name="${headerName}" value="${escapeApacheValue(policy)}" />`,
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
