export type FlagDescriptionGroups = Record<string, Record<string, string>>;

const FLAG_DESCRIPTIONS_URL = "/data/flag-descriptions.json";

let cachedDescriptions: FlagDescriptionGroups | null = null;
let loadPromise: Promise<FlagDescriptionGroups> | null = null;

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
