/**
 * Keys commands: generate, list, activate, delete
 */

import { join } from "@std/path";
import type { ParsedArgs } from "../types/index.ts";
import type { VerificationKey, VerificationKeyCreate } from "../types/verification-key.ts";
import { loadConfig, saveConfig, getKeysDir } from "../lib/config.ts";
import { getAccessToken } from "../lib/credentials.ts";
import { ensureWorkspaceSelected } from "../lib/workspace.ts";
import {
  generateEd25519KeyPair,
  exportKeyPair,
  encryptData,
  decryptData,
  generateSystemPassword,
} from "../lib/crypto.ts";
import { generateFingerprint, formatPublicKey } from "../utils/fingerprint.ts";
import { success, error, info, box, table, confirm } from "../utils/display.ts";
import { BUILD_CONFIG } from "../config/build-config.ts";

export async function keysCommand(subcommand: string, args: ParsedArgs): Promise<void> {
  switch (subcommand) {
    case "generate":
      await keysGenerate(args);
      break;
    case "list":
      await keysList(args);
      break;
    case "activate":
      await keysActivate(args);
      break;
    case "delete":
      await keysDelete(args);
      break;
    case "rename":
      await keysRename(args);
      break;
    case "revoke":
      await keysRevoke(args);
      break;
    default:
      console.error(`Unknown keys subcommand: ${subcommand}`);
      console.log("Available: generate, list, activate, delete, rename, revoke");
      Deno.exit(1);
  }
}

async function keysGenerate(args: ParsedArgs): Promise<void> {
  try {
    // Accept label as positional argument (args._[2]) or --label flag
    const label = (args._[2] as string | undefined) || (args.label as string | undefined);
    const expiresAtArg = args.expiresAt as string | undefined;
    
    if (!label) {
      error("Please provide a key label");
      console.log("Example: scopeos-cli keys generate my-production-key");
      console.log("With expiry: scopeos-cli keys generate my-key --expires-at 2027-12-31");
      console.log("            scopeos-cli keys generate my-key --expires-at 1y");
      Deno.exit(1);
    }
    
    // Get access token first
    const accessToken = await getAccessToken();
    if (!accessToken) {
      error("Authentication expired. Please run 'scopeos-cli auth login' first.");
      Deno.exit(1);
    }
    
    // Ensure workspace is selected (will prompt if not)
    const workspaceId = await ensureWorkspaceSelected(accessToken);
    
    // Reload config after workspace selection
    const config = await loadConfig();
    if (!config) {
      error("Configuration error. Please run 'scopeos-cli auth login' first.");
      Deno.exit(1);
    }
    
    // Check for label collision
    const existingKey = config.keys.find(k => k.label === label);
    if (existingKey) {
      error(`Key with label '${label}' already exists.`);
      console.log("Use 'scopeos-cli keys list' to see existing keys or 'scopeos-cli keys rename' to rename an existing key.");
      Deno.exit(1);
    }
    
    info("Generating Ed25519 key pair...");
    
    // Generate key pair
    const keyPair = await generateEd25519KeyPair();
    const exported = await exportKeyPair(keyPair);
    
    // Generate fingerprint
    const fingerprint = await generateFingerprint(exported.publicKeyRaw);
    const publicKeyFormatted = formatPublicKey(exported.publicKeyRaw);
    
    info("Encrypting private key...");
    
    // Encrypt private key
    const systemPassword = await generateSystemPassword();
    const encryptedPrivateKey = await encryptData(exported.privateKeyPEM, systemPassword);
    
    // Save encrypted private key
    const keysDir = await getKeysDir(workspaceId);
    const keyFilePath = join(keysDir, label);
    await Deno.writeTextFile(keyFilePath, encryptedPrivateKey);
    
    // Set file permissions to 0600 (owner only)
    if (Deno.build.os !== "windows") {
      await Deno.chmod(keyFilePath, 0o600);
    }
    
    success("Private key saved locally");
    
    // Calculate expiry date
    let expiresAt: string | undefined;
    if (expiresAtArg) {
      try {
        const expiryDate = parseExpiryDate(expiresAtArg);
        expiresAt = expiryDate.toISOString();
        info(`Key will expire at: ${expiryDate.toLocaleString()}`);
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        Deno.exit(1);
      }
    } else {
      expiresAt = undefined;
      info("Key will never expire (no expiry date set)");
    }
    
    // Register with backend
    info("Registering public key with backend...");
    
    const keyCreate: VerificationKeyCreate = {
      workspaceId,
      createdBy: config.auth?.user_id || "unknown",
      publicKey: publicKeyFormatted,
      fingerprint,
      label,
      algorithm: "ED25519",
      expiresAt,
    };
    
    const registeredKey = await registerKey(accessToken, workspaceId, keyCreate);
    
    // Add key to config
    const keyConfig: any = {
      key_id: registeredKey.keyId,
      label: registeredKey.label,
      fingerprint: registeredKey.fingerprint,
      algorithm: registeredKey.algorithm,
      status: registeredKey.status || "ACTIVE",  // Default to ACTIVE if backend doesn't return status
      created_at: registeredKey.createdAt,
    };
    
    // Only add expires_at if it exists (avoid undefined in YAML)
    if (registeredKey.expiresAt) {
      keyConfig.expires_at = registeredKey.expiresAt;
    }
    
    config.keys.push(keyConfig);
    
    // Set as activated key if none exists
    if (!config.activated_key) {
      config.activated_key = label;
    }
    
    await saveConfig(config);
    
    console.log("");
    success("Key pair generated and activated");
    console.log("");
    box(
      `Label: ${registeredKey.label}\n` +
      `Key ID: ${registeredKey.keyId}\n` +
      `Fingerprint: ${registeredKey.fingerprint}\n` +
      `Workspace: ${workspaceId}\n` +
      `Status: ${registeredKey.status}\n` +
      `Expires: ${registeredKey.expiresAt ? new Date(registeredKey.expiresAt).toLocaleDateString() : "Never"}\n` +
      `\n` +
      `View at: ${BUILD_CONFIG.api.dashboardUrl}/dashboard/verification-keys`
    );
    console.log("");
    
  } catch (err) {
    error(`Key generation failed: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

async function keysList(_args: ParsedArgs): Promise<void> {
  try {
    const config = await loadConfig();
    if (!config || !config.workspace) {
      error("Not authenticated. Run 'scopeos-cli auth login' first.");
      Deno.exit(1);
    }
    
    if (config.keys.length === 0) {
      console.log("No keys found. Generate one with 'scopeos-cli keys generate --label <name>'");
      return;
    }
    
    const headers = ["LABEL", "STATUS", "KEY ID", "FINGERPRINT", "EXPIRES"];
    const rows = config.keys.map(key => {
      const labelDisplay = key.label + (key.label === config.activated_key ? " *" : "");
      const status = key.status || "ACTIVE";  // Backward compat: default to ACTIVE
      const keyId = key.key_id.substring(0, 12) + "...";
      const fingerprint = key.fingerprint.substring(0, 30) + "...";
      const expires = key.expires_at 
        ? new Date(key.expires_at).toLocaleDateString() 
        : "Never";
      
      return [labelDisplay, status, keyId, fingerprint, expires];
    });
    
    console.log("");
    table(headers, rows);
    console.log("");
    console.log("* = activated key");
    console.log("");
    
  } catch (err) {
    error(`Failed to list keys: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

async function keysActivate(args: ParsedArgs): Promise<void> {
  try {
    const label = args._[2] as string | undefined;
    
    if (!label) {
      error("Please provide a key label");
      console.log("Example: scopeos-cli keys activate my-production-key");
      Deno.exit(1);
    }
    
    const config = await loadConfig();
    if (!config || !config.workspace) {
      error("Not authenticated. Run 'scopeos-cli auth login' first.");
      Deno.exit(1);
    }
    
    // Check if key exists
    const targetKey = config.keys.find(k => k.label === label);
    if (!targetKey) {
      error(`Key '${label}' not found`);
      Deno.exit(1);
    }
    
    // Prevent activating revoked keys
    if (targetKey.status === "REVOKED") {
      error(`Cannot activate revoked key '${label}'`);
      info("This key has been revoked on the server");
      info("Generate a new key with 'scopeos-cli keys generate --label <name>'");
      Deno.exit(1);
    }
    
    // Check if expired
    if (targetKey.expires_at) {
      const expiryDate = new Date(targetKey.expires_at);
      if (expiryDate < new Date()) {
        error(`Cannot activate expired key '${label}'`);
        info(`This key expired on ${expiryDate.toLocaleString()}`);
        info("Generate a new key with 'scopeos-cli keys generate --label <name>'");
        Deno.exit(1);
      }
    }
    
    config.activated_key = label as string;
    await saveConfig(config);
    
    success(`Activated key: ${label}`);
    
  } catch (err) {
    error(`Failed to activate key: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

async function keysDelete(args: ParsedArgs): Promise<void> {
  try {
    const label = args._[2] as string | undefined;
    
    if (!label) {
      error("Please provide a key label");
      console.log("Example: scopeos-cli keys delete my-old-key");
      Deno.exit(1);
    }
    
    const config = await loadConfig();
    if (!config || !config.workspace) {
      error("Not authenticated. Run 'scopeos-cli auth login' first.");
      Deno.exit(1);
    }
    
    const workspaceId = config.workspace.id;
    
    // Remove from config
    const keyIndex = config.keys.findIndex(k => k.label === label);
    if (keyIndex === -1) {
      error(`Key '${label}' not found`);
      Deno.exit(1);
    }
    
    // Ask for confirmation
    const confirmed = await confirm(
      `Delete key '${label}'? This cannot be undone.`,
      args.yes as boolean || false
    );
    
    if (!confirmed) {
      info("Delete cancelled");
      return;
    }
    
    config.keys.splice(keyIndex, 1);
    
    // If this was the activated key, handle re-assignment
    if (config.activated_key === label) {
      // Find first ACTIVE key
      const nextActiveKey = config.keys.find(k => k.status === "ACTIVE");
      if (nextActiveKey) {
        config.activated_key = nextActiveKey.label;
      } else {
        delete config.activated_key;  // FIXED: Use delete instead of = undefined
      }
    }
    
    await saveConfig(config);
    
    // Delete key file
    try {
      const keysDir = await getKeysDir(workspaceId);
      const keyFilePath = join(keysDir, label as string);
      await Deno.remove(keyFilePath);
    } catch {
      // File might not exist, ignore
    }
    
    success(`Deleted key: ${label}`);
    
    if (config.activated_key) {
      info(`Active key is now: ${config.activated_key}`);
    } else {
      info("No active key. Generate a new one with 'keys generate'");
    }
    
  } catch (err) {
    error(`Failed to delete key: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

async function keysRename(args: ParsedArgs): Promise<void> {
  try {
    const oldLabel = args._[2] as string | undefined;
    const newLabel = args._[3] as string | undefined;
    
    if (!oldLabel || !newLabel) {
      error("Please provide both old and new key labels");
      console.log("Example: scopeos-cli keys rename my-old-key my-new-key");
      Deno.exit(1);
    }
    
    const config = await loadConfig();
    if (!config || !config.workspace) {
      error("Not authenticated. Run 'scopeos-cli auth login' first.");
      Deno.exit(1);
    }
    
    const workspaceId = config.workspace.id;
    
    // Check if old label exists
    const keyIndex = config.keys.findIndex(k => k.label === oldLabel);
    if (keyIndex === -1) {
      error(`Key '${oldLabel}' not found`);
      Deno.exit(1);
    }
    
    // Check if new label already exists (collision check)
    const newLabelExists = config.keys.some(k => k.label === newLabel);
    if (newLabelExists) {
      error(`Key with label '${newLabel}' already exists`);
      console.log("Use 'scopeos-cli keys list' to see existing keys.");
      Deno.exit(1);
    }
    
    // Update the key label in config
    config.keys[keyIndex].label = newLabel;
    
    // Update activated_key if it matches old label
    if (config.activated_key === oldLabel) {
      config.activated_key = newLabel;
    }
    
    await saveConfig(config);
    
    // Rename the key file
    try {
      const keysDir = await getKeysDir(workspaceId);
      const oldKeyPath = join(keysDir, oldLabel);
      const newKeyPath = join(keysDir, newLabel);
      await Deno.rename(oldKeyPath, newKeyPath);
    } catch (renameErr) {
      error(`Failed to rename key file: ${renameErr instanceof Error ? renameErr.message : String(renameErr)}`);
      // Revert config changes
      config.keys[keyIndex].label = oldLabel;
      if (config.activated_key === newLabel) {
        config.activated_key = oldLabel;
      }
      await saveConfig(config);
      throw renameErr;
    }
    
    success(`Renamed key from '${oldLabel}' to '${newLabel}'`);
    
    if (config.activated_key === newLabel) {
      info("This is currently the active key");
    }
    
  } catch (err) {
    error(`Failed to rename key: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

/**
 * Parse expiry date from user input
 * Supports:
 * - ISO 8601: "2027-12-31T23:59:59Z" or "2027-12-31"
 * - Relative: "1y", "365d", "30d", "6M"
 */
function parseExpiryDate(input: string): Date {
  // Try parsing as ISO 8601 first
  const isoDate = new Date(input);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }
  
  // Parse relative duration
  const match = input.match(/^(\d+)(y|M|d|h)$/);
  if (!match) {
    throw new Error(`Invalid expiry format: ${input}. Use ISO 8601 (e.g., '2027-12-31') or relative duration (e.g., '1y', '30d')`);
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const now = new Date();
  switch (unit) {
    case 'y': // years
      return new Date(now.setFullYear(now.getFullYear() + value));
    case 'M': // months
      return new Date(now.setMonth(now.getMonth() + value));
    case 'd': // days
      return new Date(now.setDate(now.getDate() + value));
    case 'h': // hours
      return new Date(now.setHours(now.getHours() + value));
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}

async function keysRevoke(args: ParsedArgs): Promise<void> {
  try {
    const label = args._[2] as string | undefined;
    
    if (!label) {
      error("Please provide a key label");
      console.log("Example: scopeos-cli keys revoke my-key");
      Deno.exit(1);
    }
    
    const config = await loadConfig();
    if (!config || !config.workspace) {
      error("Not authenticated. Run 'scopeos-cli auth login' first.");
      Deno.exit(1);
    }
    
    // Find the key
    const key = config.keys.find(k => k.label === label);
    if (!key) {
      error(`Key '${label}' not found`);
      Deno.exit(1);
    }
    
    // Get access token
    const accessToken = await getAccessToken();
    if (!accessToken) {
      error("Authentication expired. Please run 'scopeos-cli auth login' first.");
      Deno.exit(1);
    }
    
    // Ask for confirmation
    const confirmed = await confirm(
      `Revoke key '${label}' on the server? This cannot be undone.`,
      args.yes as boolean || false
    );
    
    if (!confirmed) {
      info("Revoke cancelled");
      return;
    }
    
    info("Revoking key on server...");
    
    // Call revoke API
    const url = `${BUILD_CONFIG.api.endpoint}/v1/verification-keys/${key.key_id}/revoke`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "x-workspace-id": config.workspace.id,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to revoke key: ${response.status} ${errorText}`);
    }
    
    // Update local config to mark key as REVOKED
    const keyIndex = config.keys.findIndex(k => k.label === label);
    if (keyIndex !== -1) {
      config.keys[keyIndex].status = "REVOKED";
    }
    
    // If this was the activated key, switch to another ACTIVE key
    if (config.activated_key === label) {
      const activeKey = config.keys.find(k => k.status === "ACTIVE");
      if (activeKey) {
        config.activated_key = activeKey.label;
        console.log("");
        info(`Switched active key to: ${activeKey.label}`);
      } else {
        delete config.activated_key;
        console.log("");
        info("No active keys remaining. Generate a new key with 'keys generate'");
      }
    }
    
    await saveConfig(config);
    
    console.log("");
    success(`Key '${label}' has been revoked on the server and marked as REVOKED locally`);
    info("The key remains in config for audit purposes. Use 'keys delete' to remove it.");
    console.log("");
    
  } catch (err) {
    error(`Failed to revoke key: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

async function registerKey(accessToken: string, workspaceId: string, keyCreate: VerificationKeyCreate): Promise<VerificationKey> {
  const url = `${BUILD_CONFIG.api.endpoint}/v1/verification-keys`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "x-workspace-id": workspaceId,
    },
    body: JSON.stringify(keyCreate),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to register key: ${response.status} ${errorText}`);
  }
  
  const key: VerificationKey = await response.json();
  return key;
}
