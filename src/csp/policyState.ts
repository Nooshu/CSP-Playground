/**
 * Helpers for inspecting in-memory builder policy state.
 */

import type { PolicyState } from "./buildPolicy";

/**
 * Returns whether the builder has no enabled directives yet.
 *
 * @param state - Current policy state from the directive form.
 * @returns `true` when every directive is disabled or `state` is empty.
 */
export function isPolicyStateEmpty(state: PolicyState): boolean {
  return !Object.values(state).some((directive) => directive.enabled);
}
