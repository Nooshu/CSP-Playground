/**
 * Lazy-loaded human-readable descriptions for CSP flags (sandbox, etc.).
 *
 * @remarks
 * Descriptions are served from `/data/flag-descriptions.json` and cached in memory
 * for the lifetime of the page. Consumers include {@link createFlagInfoIcon}.
 */

/** Nested map of description group → flag key → explanation text. */
export type FlagDescriptionGroups = Record<string, Record<string, string>>;

const FLAG_DESCRIPTIONS_URL = "/data/flag-descriptions.json";

let cachedDescriptions: FlagDescriptionGroups | null = null;
let loadPromise: Promise<FlagDescriptionGroups> | null = null;

/**
 * Loads and caches flag descriptions from the static JSON asset.
 *
 * @returns Parsed description groups; subsequent calls reuse the same promise.
 *
 * @throws {Error} When the fetch fails or the response is not OK.
 */
export async function loadFlagDescriptions(): Promise<FlagDescriptionGroups> {
  if (cachedDescriptions) return cachedDescriptions;

  if (!loadPromise) {
    loadPromise = fetch(FLAG_DESCRIPTIONS_URL, {
      headers: { Accept: "application/json" },
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error("Could not load flag descriptions.");
      }
      const data = (await response.json()) as FlagDescriptionGroups;
      cachedDescriptions = data;
      return data;
    });
  }

  return loadPromise;
}

/**
 * Looks up a single flag description, swallowing load failures.
 *
 * @param group - Top-level key in the JSON (e.g. `"sandbox"`).
 * @param key - Flag name within the group.
 * @returns Description text, or `null` when missing or unloadable.
 */
export async function getFlagDescription(
  group: string,
  key: string,
): Promise<string | null> {
  try {
    const descriptions = await loadFlagDescriptions();
    return descriptions[group]?.[key] ?? null;
  } catch {
    return null;
  }
}
