/**
 * SSH-style fingerprint generation
 * Format: SHA256:{base64}
 */

import { encodeBase64 } from "@std/encoding/base64";

export async function generateFingerprint(publicKeyRaw: Uint8Array): Promise<string> {
  // Hash the raw public key with SHA-256
  const hashBuffer = await crypto.subtle.digest("SHA-256", publicKeyRaw);
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
