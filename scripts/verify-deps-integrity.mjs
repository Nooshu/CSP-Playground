#!/usr/bin/env node
/**
 * Verifies dependency pinning and SHA integrity in yarn.lock.
 * Run once after all dependency updates are complete: yarn verify:deps
 */

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageJsonPath = join(root, "package.json");
const yarnLockPath = join(root, "yarn.lock");

const RANGE_PATTERN = /^[~^*]/;

function loadPackageJson() {
  return JSON.parse(readFileSync(packageJsonPath, "utf8"));
}

/** @returns {string[]} */
function findUnpinnedDirectDeps(pkg) {
  const sections = ["dependencies", "devDependencies", "optionalDependencies"];
  const issues = [];

  for (const section of sections) {
    const deps = pkg[section];
    if (!deps || typeof deps !== "object") continue;

    for (const [name, version] of Object.entries(deps)) {
      if (typeof version !== "string") continue;
      if (RANGE_PATTERN.test(version.trim())) {
        issues.push(`${section}.${name}: "${version}" (use an exact version)`);
      }
    }
  }

  return issues;
}

/**
 * Parses yarn.lock v1 and finds resolved entries missing integrity.
 * @returns {{ key: string, resolved: string }[]}
 */
function findMissingIntegrity(yarnLock) {
  const missing = [];
  const blocks = yarnLock.split(/\n(?=\S)/);

  for (const block of blocks) {
    const lines = block.split("\n");
    const header = lines[0]?.trim();
    if (!header || header.startsWith("#")) continue;

    let resolved = null;
    let integrity = null;

    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (trimmed.startsWith("resolved ")) {
        resolved = trimmed;
      }
      if (trimmed.startsWith("integrity ")) {
        integrity = trimmed;
      }
    }

    if (resolved && !integrity) {
      missing.push({ key: header, resolved });
    }
  }

  return missing;
}

function runFrozenInstall() {
  const result = spawnSync("yarn", ["install", "--frozen-lockfile"], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    return {
      ok: false,
      message:
        result.stderr?.trim() ||
        result.stdout?.trim() ||
        "yarn install --frozen-lockfile failed",
    };
  }

  return { ok: true };
}

function main() {
  let failed = false;

  const pkg = loadPackageJson();
  const unpinned = findUnpinnedDirectDeps(pkg);

  if (unpinned.length > 0) {
    failed = true;
    console.error("Unpinned direct dependencies in package.json:\n");
    for (const issue of unpinned) {
      console.error(`  - ${issue}`);
    }
    console.error("");
  }

  let yarnLock;
  try {
    yarnLock = readFileSync(yarnLockPath, "utf8");
  } catch {
    console.error("yarn.lock not found. Run yarn install first.");
    process.exit(1);
  }

  const missingIntegrity = findMissingIntegrity(yarnLock);
  if (missingIntegrity.length > 0) {
    failed = true;
    console.error(
      "yarn.lock entries with resolved tarballs but no integrity hash:\n",
    );
    for (const entry of missingIntegrity) {
      console.error(`  - ${entry.key}`);
      console.error(`    ${entry.resolved}`);
    }
    console.error("");
  }

  const frozen = runFrozenInstall();
  if (!frozen.ok) {
    failed = true;
    console.error("Lockfile install check failed:\n");
    console.error(`  ${frozen.message}\n`);
  }

  if (failed) {
    console.error(
      "Dependency verification failed. Pin versions, run yarn install, then yarn verify:deps once.",
    );
    process.exit(1);
  }

  console.log(
    "Dependency verification passed: direct deps pinned, integrity present, lockfile frozen install OK.",
  );
}

main();
