/**
 * Request signing logic
 */

import { encodeBase64 } from "@std/encoding/base64";
import { join } from "@std/path";
import { loadConfig, getKeysDir } from "./config.ts";
import { decryptData, generateSystemPassword, importPrivateKey, sign } from "./crypto.ts";
import { generateNonce } from "../utils/nonce.ts";

export interface SignatureHeaders {
  "X-Workspace-ID": string;
  "X-Key-Fingerprint": string;
  "X-Signature-Algorithm": string;
  "X-Timestamp": string;
  "X-Nonce": string;
  "X-Signature": string;
}

export interface SignatureComponents {
  workspaceId: string;
  keyFingerprint: string;
  timestamp: number;
  nonce: string;
  algorithm: string;
  method: string;
  path: string;
  bodyHash: string;
}

// Generate signature for a request
export async function signRequest(
  method: string,
  path: string,
  body?: string
): Promise<SignatureHeaders> {
  // Load config
  const config = await loadConfig();
  if (!config || !config.workspace) {
    throw new Error("Not authenticated. Run 'scopeos-cli auth login' first.");
  }
  
  if (!config.activated_key) {
    throw new Error("No active key. Generate one with 'scopeos-cli keys generate --label <name>'");
  }
  
  // Find activated key
  const activeKey = config.keys.find(k => k.label === config.activated_key);
  if (!activeKey) {
    throw new Error(`Active key '${config.activated_key}' not found in config`);
  }
  
  // Load private key
  const workspaceId = config.workspace.id;
  const keysDir = await getKeysDir(workspaceId);
  const keyFilePath = join(keysDir, activeKey.label);
  
  const encryptedKey = await Deno.readTextFile(keyFilePath);
  const systemPassword = await generateSystemPassword();
  const privateKeyPEM = await decryptData(encryptedKey, systemPassword);
  const privateKey = await importPrivateKey(privateKeyPEM);
  
  // Generate signature components
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateNonce();
  const bodyHash = body ? await hashString(body) : await hashString("");
  
  const components: SignatureComponents = {
    workspaceId,
    keyFingerprint: activeKey.fingerprint,
    timestamp,
    nonce,
    algorithm: "Ed25519",
    method: method.toUpperCase(),
    path,
    bodyHash,
  };

  // Create message to sign
  const message = [
    components.workspaceId,
    components.keyFingerprint,
    components.timestamp.toString(),
    components.nonce,
    components.algorithm,
    components.method,
    components.path,
    components.bodyHash,
  ].join("\n");

  // Sign message
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  const signature = await sign(privateKey, messageBytes);
  const signatureBase64 = encodeBase64(signature);
  
  // Return headers
  return {
    "X-Workspace-ID": components.workspaceId,
    "X-Key-Fingerprint": components.keyFingerprint,
    "X-Signature-Algorithm": components.algorithm,
    "X-Timestamp": components.timestamp.toString(),
    "X-Nonce": components.nonce,
    "X-Signature": signatureBase64,
  };
}

// Hash a string with SHA-256
async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
