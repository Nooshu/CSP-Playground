export type WebServerId =
  | "apache"
  | "nginx"
  | "caddy"
  | "litespeed"
  | "iis"
  | "traefik"
  | "envoy";

export interface WebServerExport {
  id: WebServerId;
  name: string;
  description: string;
  format: (headerName: string, policy: string) => string;
}

function escapeApacheValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeNginxValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

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

export function getWebServerExport(id: WebServerId): WebServerExport | undefined {
  return WEB_SERVER_EXPORTS.find((server) => server.id === id);
}
