/**
 * Batched policy state and serialized string for coordinated UI updates.
 *
 * @remarks
 * The output panel and security score both need the same policy string on every
 * form change. Building the string once avoids duplicate work and keeps previews
 * in sync with scoring input.
 */

import { buildPolicyString, type PolicyState } from "../csp/buildPolicy";

/** Policy state plus its serialized CSP string, computed once per change. */
export interface PolicyUpdateSnapshot {
  state: PolicyState;
  policy: string;
}

/**
 * Collects builder state and builds the policy string in one pass.
 *
 * @param state - Current directive values from the form.
 */
export function createPolicyUpdateSnapshot(
  state: PolicyState,
): PolicyUpdateSnapshot {
  return { state, policy: buildPolicyString(state) };
}
