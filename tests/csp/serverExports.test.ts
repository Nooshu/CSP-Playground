import { describe, expect, it } from "vitest";
import {
  getWebServerExport,
  WEB_SERVER_EXPORTS,
} from "../../src/csp/serverExports";

describe("serverExports", () => {
  const policy = `default-src 'self'; script-src 'self' "unsafe"value"`;

  it("formats exports for each supported server", () => {
    for (const server of WEB_SERVER_EXPORTS) {
      const output = server.format("Content-Security-Policy", policy);
      expect(output).toContain("Content-Security-Policy");
      expect(output.length).toBeGreaterThan(0);
    }
  });

  it("looks up exports by id", () => {
    expect(getWebServerExport("nginx")?.name).toBe("Nginx");
    expect(getWebServerExport("cloudflare")?.name).toBe("Cloudflare Pages");
    expect(getWebServerExport("missing" as "nginx")).toBeUndefined();
  });

  it("formats html-only exports for Apache, Nginx, Caddy, and LiteSpeed", () => {
    const options = { htmlOnly: true };

    expect(
      getWebServerExport("apache")!.format(
        "Content-Security-Policy",
        policy,
        options,
      ),
    ).toContain("<FilesMatch");
    expect(
      getWebServerExport("nginx")!.format(
        "Content-Security-Policy",
        policy,
        options,
      ),
    ).toContain("add_header Content-Security-Policy");
    expect(
      getWebServerExport("nginx")!.format(
        "Content-Security-Policy",
        policy,
        options,
      ),
    ).toContain(".html$");
    expect(
      getWebServerExport("caddy")!.format(
        "Content-Security-Policy",
        policy,
        options,
      ),
    ).toContain("@html");
    expect(
      getWebServerExport("litespeed")!.format(
        "Content-Security-Policy",
        policy,
        options,
      ),
    ).toContain("<FilesMatch");
  });

  it("formats Cloudflare HTML-only export with Pages middleware", () => {
    const cloudflare = getWebServerExport("cloudflare");
    expect(cloudflare).toBeDefined();
    expect(cloudflare?.setupNote).toContain("_headers");
    expect(cloudflare?.htmlOnlySetupNote).toContain("functions/_middleware.ts");

    const output = cloudflare!.format("Content-Security-Policy", policy, {
      htmlOnly: true,
    });
    expect(output).toContain("functions/_middleware.ts");
    expect(output).toContain("requires Pages Functions");
    expect(output).toContain('contentType.includes("text/html")');
    expect(output).not.toContain("/*.html");
    expect(output).not.toMatch(/^\/\*\n\s+Content-Security-Policy:/m);
  });

  it("formats Firebase HTML-only export for extension-less document routes", () => {
    const firebase = getWebServerExport("firebase");
    const output = firebase!.format("Content-Security-Policy", policy, {
      htmlOnly: true,
    });

    expect(output).toContain('"source": "/**/!(*.*)"');
    expect(output).toContain("cleanUrls");
    expect(output).not.toContain('"source": "**/*.html"');
  });

  it("formats Firebase site-wide export inside hosting.headers", () => {
    const firebase = getWebServerExport("firebase");
    expect(firebase?.name).toBe("Firebase Hosting");

    const output = firebase!.format(
      "Content-Security-Policy-Report-Only",
      policy,
    );
    expect(output).toContain('"hosting"');
    expect(output).toContain('"source": "**"');
    expect(output).toContain('"key": "Content-Security-Policy-Report-Only"');
    expect(output).toContain('"value":');
    expect(output).not.toContain("vercel.json");
  });

  it("documents servers that cannot scope HTML-only exports", () => {
    const unsupported = [
      "iis",
      "netlify",
      "vercel",
      "traefik",
      "envoy",
    ] as const;

    for (const id of unsupported) {
      const server = getWebServerExport(id);
      expect(server?.supportsHtmlOnly).toBeUndefined();
      expect(server?.htmlOnlyUnsupportedReason?.length).toBeGreaterThan(0);
    }
  });

  it("marks only traditional servers, Cloudflare, and Firebase as HTML-only capable", () => {
    const supported = WEB_SERVER_EXPORTS.filter(
      (server) => server.supportsHtmlOnly === true,
    ).map((server) => server.id);

    expect(supported).toEqual([
      "apache",
      "nginx",
      "caddy",
      "litespeed",
      "cloudflare",
      "firebase",
    ]);
  });
});
