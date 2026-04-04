/**
 * Cryptographic operations -- Ed25519 key import and signing.
 *
 * API key encryption has been replaced by a plaintext credentials file.
 * Legacy encrypt/decrypt functions live in migration.ts only.
 */

export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return await crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "Ed25519" },
    true,
    ["sign"],
  );
}

export async function sign(
  privateKey: CryptoKey,
  data: Uint8Array,
): Promise<Uint8Array> {
  const signature = await crypto.subtle.sign(
    { name: "Ed25519" },
    privateKey,
    data as BufferSource,
  );
  return new Uint8Array(signature);
}
