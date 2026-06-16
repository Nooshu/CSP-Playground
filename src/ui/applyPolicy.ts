/**
 * Applies a parsed CSP policy to all directive sections in the builder.
 *
 * @remarks
 * Resets every section first, then enables and fills only directives present in
 * the parsed policy. Used by {@link createUrlImporter} after remote lookup.
 *
 * @see {@link parsePolicyString}
 */

import type { ParsedPolicy } from "../csp/parsePolicy";
import type { DirectiveSectionHandle } from "./DirectiveSection";

/**
 * Pre-fills directive sections from a parsed policy object.
 *
 * @param sections - All builder directive handles to reset and update.
 * @param parsed - Policy directives map from {@link parsePolicyString}.
 * @returns Count of directives that received imported values.
 *
 * @remarks
 * Directives absent from `parsed.directives` remain disabled after reset.
 * Report-only mode is handled separately by the URL importer on the output panel.
 */
export function applyParsedPolicy(
  sections: DirectiveSectionHandle[],
  parsed: ParsedPolicy,
): number {
  for (const section of sections) {
    section.reset();
  }

  let appliedCount = 0;

  for (const section of sections) {
    const directiveName = section.element.dataset.directive;
    if (!directiveName) continue;

    const values = parsed.directives[directiveName];
    if (values === undefined) continue;

    section.setState({ enabled: true, values });
    appliedCount += 1;
  }

  return appliedCount;
}
