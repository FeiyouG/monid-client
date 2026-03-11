/**
 * SSH-style fingerprint generation
 * Format: SHA256:{base64}
 */

import { encodeBase64 } from "@std/encoding/base64";

export async function generateFingerprint(publicKeyRaw: Uint8Array): Promise<string> {
  // Hash the raw public key with SHA-256
  const hashBuffer = await crypto.subtle.digest("SHA-256", publicKeyRaw as Uint8Array<ArrayBuffer>);
  const hashArray = new Uint8Array(hashBuffer);
  
  // Encode as base64
  const base64Hash = encodeBase64(hashArray);
  
  // Format as SSH-style fingerprint
  return `SHA256:${base64Hash}`;
}

// Format public key for display (ed25519-{base64})
export function formatPublicKey(publicKeyRaw: Uint8Array): string {
  const base64Key = encodeBase64(publicKeyRaw);
  return base64Key;
}

/**
 * Generates a short, user-friendly fingerprint for display purposes
 * Extracts first 7 hex characters from the SHA256 fingerprint
 *
 * @param fingerprintSha256 - Full SSH-style fingerprint (e.g., "SHA256:base64hash")
 * @returns Short hex fingerprint (e.g., "5afc1bc")
 *
 * @example
 * ```typescript
 * const short = getShortFingerprint("SHA256:WvwbyYAgGxioxL+IoCHvYHNDpJI/X17X23EmbZQP3jw=");
 * // Returns: "5afc1bc"
 * ```
 */
export function getShortFingerprint(fingerprintSha256: string): string {
  try {
    // Extract base64 hash after "SHA256:" prefix
    const base64Hash = fingerprintSha256.replace(/^SHA256:/, "");

    // Decode base64 to bytes
    const binaryString = atob(base64Hash);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert first 4 bytes to hex (7 chars requires 3.5 bytes, use 4 for clean conversion)
    const hex = Array.from(bytes.slice(0, 4))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Return first 7 hex characters
    return hex.substring(0, 7);
  } catch (error) {
    // If parsing fails, return a fallback
    console.error("Failed to generate short fingerprint:", error);
    return "unknown";
  }
}

/**
 * Check if a fingerprint matches (supports short or full fingerprint)
 *
 * @param keyFingerprint - Full fingerprint from key config
 * @param searchFingerprint - User-provided fingerprint (short or full)
 * @returns True if fingerprints match
 */
export function matchesFingerprint(
  keyFingerprint: string,
  searchFingerprint: string
): boolean {
  // Exact match on full fingerprint
  if (keyFingerprint === searchFingerprint) return true;
  
  // Match on short fingerprint
  const keyShort = getShortFingerprint(keyFingerprint);
  const searchShort = searchFingerprint.startsWith("SHA256:")
    ? getShortFingerprint(searchFingerprint)
    : searchFingerprint;
  
  return keyShort === searchShort;
}

/**
 * Find key by label or fingerprint (short or full)
 *
 * @param keys - Array of key configs
 * @param identifier - Label or fingerprint to search for
 * @returns Matching key or undefined
 */
export function findKeyByLabelOrFingerprint(
  keys: any[],
  identifier: string
): any | undefined {
  // Try exact label match first
  const byLabel = keys.find(k => k.label === identifier);
  if (byLabel) return byLabel;
  
  // Try fingerprint match (short or full)
  return keys.find(k => matchesFingerprint(k.fingerprint, identifier));
}
