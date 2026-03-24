/**
 * SSH-style fingerprint generation
 * Format: SHA256:{base64}
 */

import { encodeBase64 } from "@std/encoding/base64";
import type { UnifiedKeyConfig } from "../types/index.ts";

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
