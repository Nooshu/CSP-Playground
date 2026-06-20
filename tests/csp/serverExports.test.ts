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

  it("formats html-only exports for Apache, Nginx, Caddy, Lighttpd, and IIS", () => {
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
    expect(
      getWebServerExport("iis")!.format(
        "Content-Security-Policy",
        policy,
        options,
      ),
    ).toContain("<location path=");
  });

  it("formats Cloudflare HTML-only export with Pages middleware", () => {
    const cloudflare = getWebServerExport("cloudflare");
    expect(cloudflare).toBeDefined();

    const output = cloudflare!.format("Content-Security-Policy", policy, {
      htmlOnly: true,
    });
    expect(output).toContain("functions/_middleware.ts");
    expect(output).toContain('contentType.includes("text/html")');
    expect(output).not.toContain("/*.html");
  });

  it("formats Netlify and Vercel HTML-only exports", () => {
    const netlify = getWebServerExport("netlify");
    const vercel = getWebServerExport("vercel");

    expect(
      netlify?.format("Content-Security-Policy", policy, { htmlOnly: true }),
    ).toContain("/*.html");
    expect(
      vercel?.format("Content-Security-Policy", policy, { htmlOnly: true }),
    ).toContain('"/(.*)\\.html"');
  });
});
