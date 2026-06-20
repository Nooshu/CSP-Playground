import { expect, test } from "@playwright/test";

test.describe("CSP Playground smoke", () => {
  test.beforeEach(async ({ context, page }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await expect(page.locator("#app")).toBeVisible();
  });

  test("loads the builder shell", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Import existing policy" }),
    ).toBeVisible();
    await expect(page.locator("#directive-section-default-src")).toBeVisible();
    await expect(page.locator("#generated-policy")).toBeVisible();
    await expect(page.locator(".security-score-panel")).toBeVisible();
  });

  test("enables default-src and updates the policy preview", async ({
    page,
  }) => {
    const section = page.locator("#directive-section-default-src");
    await section.getByRole("checkbox").check();
    await section.locator(".keyword-select").selectOption("'self'");
    await section.getByRole("button", { name: "Add keyword" }).click();

    await expect(page.locator("#policy-preview")).toContainText(
      "default-src 'self'",
    );
    await expect(page.locator("#header-preview")).toContainText(
      "Content-Security-Policy:",
    );
  });

  test("copies the generated policy to the clipboard", async ({ page }) => {
    const section = page.locator("#directive-section-default-src");
    await section.getByRole("checkbox").check();
    await section.locator(".keyword-select").selectOption("'self'");
    await section.getByRole("button", { name: "Add keyword" }).click();

    await page.getByRole("button", { name: "Copy policy" }).click();

    await expect
      .poll(async () => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("default-src 'self'");
  });

  test("imports a policy from pasted headers", async ({ page }) => {
    await page.getByRole("radio", { name: "Paste headers or policy" }).check();
    await page
      .locator("#csp-paste")
      .fill("Content-Security-Policy: default-src 'none'; script-src 'self'");
    await page.getByRole("button", { name: "Import CSP" }).click();

    await expect(page.locator("#url-importer-status")).toContainText(
      /imported/i,
    );
    await expect(page.locator("#policy-preview")).toContainText(
      "default-src 'none'",
    );
  });

  test("imports a policy from a URL using the lookup API", async ({ page }) => {
    await page.route("**/api/csp-lookup", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "https://example.com/",
          policy: "default-src 'self'",
          reportOnly: false,
          source: "header-enforce",
        }),
      });
    });

    await page.locator("#site-url").fill("https://example.com");
    await page.getByRole("button", { name: "Import CSP" }).click();

    await expect(page.locator("#url-importer-status")).toContainText(
      /imported/i,
    );
    await expect(page.locator("#policy-preview")).toContainText(
      "default-src 'self'",
    );
  });
});
