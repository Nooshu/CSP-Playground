import type { ParsedPolicy } from "../csp/parsePolicy";
import type { DirectiveSectionHandle } from "./DirectiveSection";

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
