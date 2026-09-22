import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  PAGES_ROUTES,
  writePagesRoutes,
} from "../../scripts/generate-dist-routes.mjs";

describe("generate-dist-routes", () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("excludes fingerprinted assets from Functions invocation", () => {
    expect(PAGES_ROUTES.version).toBe(1);
    expect(PAGES_ROUTES.include).toContain("/*");
    expect(PAGES_ROUTES.exclude).toContain("/assets/*");
    expect(PAGES_ROUTES.exclude).toContain("/*.js");
    expect(PAGES_ROUTES.exclude).toContain("/*.css");
  });

  it("writes _routes.json for the build output", () => {
    tempDir = mkdtempSync(join(tmpdir(), "csp-routes-"));
    writePagesRoutes(tempDir);

    const written = JSON.parse(
      readFileSync(join(tempDir, "_routes.json"), "utf8"),
    );
    expect(written).toEqual(PAGES_ROUTES);
  });
});
