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
