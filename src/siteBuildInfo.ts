/**
 * Build metadata and GitHub URLs shown in the site footer.
 */

/** Semantic app version shown in the site footer. */
export const SITE_VERSION = "1.0";

/** GitHub repository URL (no trailing slash). */
export const GITHUB_REPO_URL = "https://github.com/Nooshu/CSP-Playground";

/** Default branch used for repository file links. */
export const GITHUB_DEFAULT_BRANCH = "main";

/** SPDX-style license name for the project. */
export const SITE_LICENSE_NAME = "MIT";

/** License file path at the repository root. */
export const LICENSE_FILE_PATH = "LICENSE";

/** Git commit and version details injected at build time. */
export interface SiteBuildInfo {
  version: string;
  gitCommitShort: string;
}

/**
 * Returns the URL to the license file on GitHub.
 */
export function githubLicenseUrl(): string {
  return `${GITHUB_REPO_URL}/blob/${GITHUB_DEFAULT_BRANCH}/${LICENSE_FILE_PATH}`;
}

/**
 * Returns the URL to a commit on GitHub.
 *
 * @param commitShort - Short commit hash from the deployed build.
 */
export function githubCommitUrl(commitShort: string): string {
  return `${GITHUB_REPO_URL}/commit/${commitShort}`;
}
