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
