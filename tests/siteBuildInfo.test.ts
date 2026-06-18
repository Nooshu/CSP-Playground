import { describe, expect, it } from "vitest";
import {
  GITHUB_DEFAULT_BRANCH,
  GITHUB_REPO_URL,
  LICENSE_FILE_PATH,
  SITE_VERSION,
  githubCommitUrl,
  githubLicenseUrl,
} from "../src/siteBuildInfo";

describe("siteBuildInfo", () => {
  it("builds GitHub URLs for the license file and commits", () => {
    expect(SITE_VERSION).toBe("1.0");
    expect(githubLicenseUrl()).toBe(
      `${GITHUB_REPO_URL}/blob/${GITHUB_DEFAULT_BRANCH}/${LICENSE_FILE_PATH}`,
    );
    expect(githubCommitUrl("abc1234")).toBe(
      `${GITHUB_REPO_URL}/commit/abc1234`,
    );
  });
});
