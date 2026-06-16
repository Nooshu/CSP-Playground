import { describe, expect, it } from "vitest";
import {
  getWebServerExport,
  WEB_SERVER_EXPORTS,
} from "../../src/csp/serverExports";

describe("serverExports", () => {
  const policy = `default-src 'self'; script-src 'self' "unsafe\"value"`;

  it("formats exports for each supported server", () => {
    for (const server of WEB_SERVER_EXPORTS) {
      const output = server.format("Content-Security-Policy", policy);
      expect(output).toContain("Content-Security-Policy");
      expect(output.length).toBeGreaterThan(0);
    }
  });

  it("looks up exports by id", () => {
    expect(getWebServerExport("nginx")?.name).toBe("Nginx");
    expect(getWebServerExport("missing" as "nginx")).toBeUndefined();
  });
});
