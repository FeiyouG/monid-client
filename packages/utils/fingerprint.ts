/**
 * Key lookup utilities
 */

import type { ApiKeyConfig } from "../types/index.ts";

/**
 * Find an API key by label.
 */
export function findKeyByLabel(
  keys: ApiKeyConfig[],
  label: string,
): ApiKeyConfig | undefined {
  return keys.find((k) => k.label === label);
}
