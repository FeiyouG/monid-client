/**
 * Obfuscation utilities for API keys
 */

/**
 * Obfuscate API key for display
 * Example: "monid_live_abc123def456" → "monid_live_••••••6"
 */
export function obfuscateApiKey(key: string): string {
  // Split by underscore and remove last part to get prefix
  const parts = key.split('_');
  const suffix = parts.pop() || '';
  const prefix = parts.join('_');
  
  if (!prefix || !suffix) {
    return "••••••";
  }
  
  const lastChar = suffix.slice(-1);
  return `${prefix}_••••••${lastChar}`;
}

/**
 * Extract prefix from API key
 * Example: "monid_live_abc123" → "monid_live"
 */
export function extractApiKeyPrefix(key: string): string {
  const parts = key.split('_');
  parts.pop(); // Remove last part (the actual key)
  return parts.join('_');
}

/**
 * Validate API key format
 * @throws Error if key format is invalid
 */
export function validateApiKeyFormat(key: string): void {
  const parts = key.split('_');
  
  if (parts.length < 3) {
    throw new Error(
      "Malformatted API key: Expected format 'monid_<stage>_<key>' with at least 3 parts separated by underscores"
    );
  }
  
  if (parts[0] !== "monid") {
    throw new Error(
      "Malformatted API key: Must start with 'monid'"
    );
  }
}
