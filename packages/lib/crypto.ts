/**
 * Cryptographic operations
 * Ed25519 key generation and management
 */

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface ExportedKeyPair {
  publicKeyPEM: string;
  privateKeyPEM: string;
  publicKeyRaw: Uint8Array;
}

// Generate Ed25519 key pair
export async function generateEd25519KeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "Ed25519",
    },
    true, // extractable
    ["sign", "verify"]
  ) as CryptoKeyPair;
  
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

// Export key pair to PEM format
export async function exportKeyPair(keyPair: KeyPair): Promise<ExportedKeyPair> {
  // Export private key as PKCS#8
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));
  const privateKeyPEM = formatPEM(privateKeyBase64, "PRIVATE KEY");
  
  // Export public key as SPKI
  const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
  const publicKeyPEM = formatPEM(publicKeyBase64, "PUBLIC KEY");
  
  // Also get raw public key for fingerprint
  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  
  return {
    publicKeyPEM,
    privateKeyPEM,
    publicKeyRaw: new Uint8Array(publicKeyRaw),
  };
}

// Format base64 as PEM
function formatPEM(base64: string, label: string): string {
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += 64) {
    lines.push(base64.substring(i, i + 64));
  }
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

// Import private key from PEM
export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Remove PEM headers and decode
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    {
      name: "Ed25519",
    },
    true,
    ["sign"]
  );
  
  return privateKey;
}

// Sign data with private key
export async function sign(privateKey: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  const signature = await crypto.subtle.sign(
    {
      name: "Ed25519",
    },
    privateKey,
    data
  );
  
  return new Uint8Array(signature);
}

// Simple encryption using AES-GCM
// Used for encrypting private keys at rest
export async function encryptData(data: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  
  // Derive key from password
  const passwordBytes = encoder.encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  
  // Use a fixed salt for simplicity (in production, store this separately)
  const salt = encoder.encode("scopeos-cli-salt-v1");
  
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  
  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    dataBytes.buffer
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

// Decrypt data
export async function decryptData(encryptedBase64: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Decode base64
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  // Derive key from password
  const passwordBytes = encoder.encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  
  const salt = encoder.encode("scopeos-cli-salt-v1");
  
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted.buffer
  );
  
  return decoder.decode(decrypted);
}

// Generate system-specific encryption password
// This makes keys non-portable (security feature)
export async function generateSystemPassword(): Promise<string> {
  const username = Deno.env.get("USER") || Deno.env.get("USERNAME") || "unknown";
  const hostname = Deno.hostname();
  
  // Combine username and hostname as password
  // In production, could also include machine ID
  return `${username}@${hostname}:scopeos-cli`;
}
