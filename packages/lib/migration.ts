/**
 * Best-effort migration from legacy encrypted format to plaintext credentials.
 *
 * Handles:
 *   - API keys with key_encrypted field (hostname-based AES-GCM)
 *   - Verification keys (dropped, no longer supported)
 *   - Wallet keys stored as encrypted files in wallets/ directory
 */

import { join } from "@std/path";
import { exists } from "@std/fs";
import { setSecret } from "./secrets.ts";
import { saveConfig, getConfigDir, getWalletsDir } from "./config.ts";
import type { Config, ApiKeyConfig } from "../types/index.ts";

// ---------------------------------------------------------------------------
// Legacy decrypt helpers (only used during migration)
// ---------------------------------------------------------------------------

async function legacyDecrypt(
  encryptedBase64: string,
  password: string,
  saltString: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const combined = Uint8Array.from(atob(encryptedBase64), (c) =>
    c.charCodeAt(0)
  );
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(saltString),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted.buffer,
  );

  return decoder.decode(decrypted);
}

/**
 * Try all known password/salt combinations to decrypt a legacy value.
 */
async function tryLegacyDecrypt(
  encryptedBase64: string,
): Promise<string | null> {
  const username =
    Deno.env.get("USER") || Deno.env.get("USERNAME") || "unknown";
  const hostname = Deno.hostname();
  const hostnameShort = hostname.replace(/\.local$/, "");

  const attempts: Array<{ password: string; salt: string }> = [
    // Current hostname + monid salt
    { password: `${username}@${hostname}:monid`, salt: "monid-cli-salt-v1" },
    // Hostname without .local + monid salt
    { password: `${username}@${hostnameShort}:monid`, salt: "monid-cli-salt-v1" },
    // Current hostname + scopeos password & salt
    { password: `${username}@${hostname}:scopeos-cli`, salt: "scopeos-cli-salt-v1" },
    // Hostname without .local + scopeos
    { password: `${username}@${hostnameShort}:scopeos-cli`, salt: "scopeos-cli-salt-v1" },
    // Scopeos password with monid salt (mixed)
    { password: `${username}@${hostname}:scopeos-cli`, salt: "monid-cli-salt-v1" },
  ];

  for (const { password, salt } of attempts) {
    try {
      return await legacyDecrypt(encryptedBase64, password, salt);
    } catch { /* try next */ }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public migration entry point
// ---------------------------------------------------------------------------

/**
 * Run migration if the config contains legacy data.
 * Modifies the config in place and saves it. Returns true if migration ran.
 */
export async function migrateIfNeeded(config: Config): Promise<boolean> {
  // deno-lint-ignore no-explicit-any
  const rawKeys = config.keys as any[];

  const hasLegacyApiKeys = rawKeys.some(
    (k) => k.type === "api" && k.key_encrypted,
  );
  const hasVerificationKeys = rawKeys.some((k) => k.type === "verification");
  const hasLegacyWalletFiles = await hasEncryptedWalletFiles();

  if (!hasLegacyApiKeys && !hasVerificationKeys && !hasLegacyWalletFiles) {
    return false;
  }

  console.log("\nMigrating configuration to new format...\n");

  // --- Migrate API keys ---
  const migratedKeys: ApiKeyConfig[] = [];
  const failedKeys: string[] = [];

  for (const key of rawKeys) {
    if (key.type === "verification") continue; // drop

    if (key.type === "api" && key.key_encrypted) {
      const decrypted = await tryLegacyDecrypt(key.key_encrypted);
      if (decrypted) {
        setSecret(key.label, decrypted);
        migratedKeys.push({ type: "api", label: key.label, prefix: key.prefix || "" });
        console.log(`  Migrated API key "${key.label}".`);
      } else {
        failedKeys.push(key.label);
      }
    } else if (key.type === "api") {
      // Already migrated (no key_encrypted)
      migratedKeys.push(key as ApiKeyConfig);
    }
  }

  config.keys = migratedKeys;

  // --- Report verification keys dropped ---
  const verificationCount = rawKeys.filter((k) => k.type === "verification").length;
  if (verificationCount > 0) {
    console.log(`  Removed ${verificationCount} verification key(s) (no longer supported).`);
  }

  // --- Migrate wallet files ---
  if (hasLegacyWalletFiles && config.wallets) {
    const failedWallets: string[] = [];
    const walletsDir = await getWalletsDir();

    for (const wallet of config.wallets) {
      const keyPath = join(walletsDir, wallet.label);
      if (!await exists(keyPath)) continue;

      try {
        const encrypted = (await Deno.readTextFile(keyPath)).trim();
        const decrypted = await tryLegacyDecrypt(encrypted);
        if (decrypted) {
          setSecret(`wallet:${wallet.label}`, decrypted);
          await Deno.remove(keyPath);
          console.log(`  Migrated wallet "${wallet.label}".`);
        } else {
          failedWallets.push(wallet.label);
        }
      } catch {
        failedWallets.push(wallet.label);
      }
    }

    if (failedWallets.length > 0) {
      console.log(`\n! ${failedWallets.length} wallet(s) could not be migrated:\n`);
      for (const label of failedWallets) {
        console.log(`  "${label}": Re-add with: monid wallet add --private-key <key> --label ${label}\n`);
      }
    }
  }

  // --- Report failed API keys ---
  if (failedKeys.length > 0) {
    console.log(`\n! ${failedKeys.length} API key(s) could not be migrated:\n`);
    for (const label of failedKeys) {
      console.log(`  "${label}": Re-add with: monid keys add --api-key <key> --label ${label}\n`);
    }
  }

  // --- Fix activated key if it was removed ---
  if (config.activated_key && !config.keys.some((k) => k.label === config.activated_key)) {
    console.log(`  Cleared activated key "${config.activated_key}" (no longer available).`);
    delete config.activated_key;
    if (config.keys.length > 0) {
      config.activated_key = config.keys[0].label;
      console.log(`  Auto-activated key "${config.keys[0].label}".`);
    }
  }

  // --- Clean up legacy fields ---
  // deno-lint-ignore no-explicit-any
  const raw = config as any;
  delete raw.workspace;
  delete raw.auth;

  // Clean up legacy keys/ directory
  const keysDir = join(getConfigDir(), "keys");
  try {
    if (await exists(keysDir)) {
      await Deno.remove(keysDir, { recursive: true });
    }
  } catch { /* ignore */ }

  await saveConfig(config);
  console.log("Migration complete.\n");
  return true;
}

async function hasEncryptedWalletFiles(): Promise<boolean> {
  try {
    const walletsDir = await getWalletsDir();
    for await (const entry of Deno.readDir(walletsDir)) {
      if (entry.isFile) return true;
    }
  } catch { /* ignore */ }
  return false;
}
