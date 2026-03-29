/**
 * Fingerprint utilities for verification keys
 */

import type { UnifiedKeyConfig } from "../types/index.ts";

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
 * Find a key by label or fingerprint from a unified key list.
 * Searches by exact label match first, then by fingerprint (full or short)
 * for verification keys.
 */
export function findKeyByIdentifier(
  keys: UnifiedKeyConfig[],
  options: { label?: string; fingerprint?: string }
): UnifiedKeyConfig | undefined {
  if (options.label) {
    return keys.find(k => k.label === options.label);
  }
  if (options.fingerprint) {
    return keys.find(k =>
      k.type === "verification" &&
      (k.fingerprint === options.fingerprint || k.fingerprint_short === options.fingerprint)
    );
  }
  return undefined;
}
