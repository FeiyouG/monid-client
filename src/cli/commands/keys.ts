/**
 * Keys commands - migrated to Cliffy framework
 * Uses grouped options with conflicts/depends for parameter validation
 */

import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import { join } from "@std/path";
import type { VerificationKey, VerificationKeyCreate } from "../../types/verification-key.ts";
import { loadConfig, saveConfig, getKeysDir } from "../../lib/config.ts";
import { getAccessToken } from "../../lib/credentials.ts";
import { ensureWorkspaceSelected } from "../../lib/workspace.ts";
import {
  generateEd25519KeyPair,
  exportKeyPair,
  encryptData,
  generateSystemPassword,
} from "../../lib/crypto.ts";
import {
  generateFingerprint,
  formatPublicKey,
  getShortFingerprint,
  findKeyByLabelOrFingerprint,
} from "../../utils/fingerprint.ts";
import { success, error, info, box, table } from "../../utils/display.ts";
import { BUILD_CONFIG } from "../../config/build-config.ts";

export const keysCommand = new Command()
  .name("keys")
  .description("API key management")
  
  .command("generate", "Generate and register a new key pair")
    .option("-l, --label <label:string>", "Key label", { required: true })
    .option("--expires-at <date:string>", "Expiry date (ISO 8601 or relative like '1y', '30d')")
    .action(async (options: { label: string; expiresAt?: string }) => {
      try {
        const { label, expiresAt: expiresAtArg } = options;
        
        // Get access token first
        const accessToken = await getAccessToken();
        if (!accessToken) {
          error("Authentication expired. Please run 'scopeos-cli auth login' first.");
          Deno.exit(1);
        }
        
        // Ensure workspace is selected
        const workspaceId = await ensureWorkspaceSelected(accessToken);
        
        // Reload config
        const config = await loadConfig();
        if (!config) {
          error("Configuration error. Please run 'scopeos-cli auth login' first.");
          Deno.exit(1);
        }
        
        // Check for label collision
        if (config.keys.find(k => k.label === label)) {
          error(`Key with label '${label}' already exists.`);
          console.log("Use 'scopeos-cli keys list' to see existing keys or 'scopeos-cli keys rename' to rename an existing key.");
          Deno.exit(1);
        }
        
        info("Generating Ed25519 key pair...");
        
        // Generate key pair
        const keyPair = await generateEd25519KeyPair();
        const exported = await exportKeyPair(keyPair);
        
        // Generate fingerprints
        const fingerprint = await generateFingerprint(exported.publicKeyRaw);
        const fingerprintShort = getShortFingerprint(fingerprint);
        const publicKeyFormatted = formatPublicKey(exported.publicKeyRaw);
        
        info("Encrypting private key...");
        
        // Encrypt and save private key
        const systemPassword = await generateSystemPassword();
        const encryptedPrivateKey = await encryptData(exported.privateKeyPEM, systemPassword);
        
        const keysDir = await getKeysDir(workspaceId);
        const keyFilePath = join(keysDir, label);
        await Deno.writeTextFile(keyFilePath, encryptedPrivateKey);
        
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
        
        // Add key to config with fingerprint_short
        const keyConfig: any = {
          key_id: registeredKey.keyId,
          label: registeredKey.label,
          fingerprint: registeredKey.fingerprint,
          fingerprint_short: fingerprintShort,
          algorithm: registeredKey.algorithm,
          status: registeredKey.status || "ACTIVE",
          created_at: registeredKey.createdAt,
        };
        
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
          `Label:       ${registeredKey.label}\n` +
          `Fingerprint: ${fingerprintShort}\n` +
          `Key ID:      ${registeredKey.keyId}\n` +
          `Workspace:   ${workspaceId}\n` +
          `Status:      ${registeredKey.status}\n` +
          `Expires:     ${registeredKey.expiresAt ? new Date(registeredKey.expiresAt).toLocaleDateString() : "Never"}\n` +
          `\n` +
          `View at: ${BUILD_CONFIG.api.dashboardUrl}/dashboard/verification-keys`
        );
        console.log("");
      } catch (err) {
        error(`Key generation failed: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    })
  
  .command("list", "List all keys for current workspace")
    .action(async () => {
      try {
        const config = await loadConfig();
        if (!config || !config.workspace) {
          error("Not authenticated. Run 'scopeos-cli auth login' first.");
          Deno.exit(1);
        }
        
        if (config.keys.length === 0) {
          console.log("No keys found. Generate one with:");
          console.log("  scopeos-cli keys generate --label <name>");
          return;
        }
        
        const headers = ["LABEL", "STATUS", "FINGERPRINT", "KEY ID", "EXPIRES"];
        const rows = config.keys.map(key => [
          key.label + (key.label === config.activated_key ? " *" : ""),
          key.status || "ACTIVE",
          key.fingerprint_short || "unknown",
          key.key_id.substring(0, 12) + "...",
          key.expires_at ? new Date(key.expires_at).toLocaleDateString() : "Never"
        ]);
        
        console.log("");
        table(headers, rows);
        console.log("");
        console.log("* = activated key");
      } catch (err) {
        error(`Failed to list keys: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    })
  
  .command("activate", "Set the active key for signing requests")
    // GROUP: label OR fingerprint (exactly one required)
    .option("-l, --label <label:string>", "Key label", {
      conflicts: ["fingerprint"]
    })
    .option("-f, --fingerprint <fp:string>", "Fingerprint (short or full)", {
      conflicts: ["label"]
    })
    .action(async (options: { label?: string; fingerprint?: string }) => {
      try {
        const identifier = options.label || options.fingerprint;
        if (!identifier) {
          error("Please provide --label or --fingerprint");
          console.log("Example: scopeos-cli keys activate --label my-key");
          console.log("Example: scopeos-cli keys activate --fingerprint 5afc1bc");
          Deno.exit(1);
        }
        
        const config = await loadConfig();
        if (!config || !config.workspace) {
          error("Not authenticated. Run 'scopeos-cli auth login' first.");
          Deno.exit(1);
        }
        
        const targetKey = findKeyByLabelOrFingerprint(config.keys, identifier);
        if (!targetKey) {
          error(`Key '${identifier}' not found`);
          info("Run 'scopeos-cli keys list' to see available keys");
          Deno.exit(1);
        }
        
        // Validate status
        if (targetKey.status === "REVOKED") {
          error(`Cannot activate revoked key '${targetKey.label}'`);
          info("This key has been revoked on the server");
          info("Generate a new key with 'scopeos-cli keys generate --label <name>'");
          Deno.exit(1);
        }
        
        // Check expiry
        if (targetKey.expires_at) {
          const expiryDate = new Date(targetKey.expires_at);
          if (expiryDate < new Date()) {
            error(`Cannot activate expired key '${targetKey.label}'`);
            info(`This key expired on ${expiryDate.toLocaleString()}`);
            info("Generate a new key with 'scopeos-cli keys generate --label <name>'");
            Deno.exit(1);
          }
        }
        
        config.activated_key = targetKey.label;
        await saveConfig(config);
        
        success(`Activated key: ${targetKey.label} (${targetKey.fingerprint_short || "unknown"})`);
      } catch (err) {
        error(`Failed to activate key: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    })
  
  .command("delete", "Delete a local key")
    // GROUP: label OR fingerprint
    .option("-l, --label <label:string>", "Key label", {
      conflicts: ["fingerprint"]
    })
    .option("-f, --fingerprint <fp:string>", "Fingerprint", {
      conflicts: ["label"]
    })
    .option("-y, --yes", "Skip confirmation")
    .action(async (options: { label?: string; fingerprint?: string; yes?: boolean }) => {
      try {
        const identifier = options.label || options.fingerprint;
        if (!identifier) {
          error("Please provide --label or --fingerprint");
          Deno.exit(1);
        }
        
        const config = await loadConfig();
        if (!config || !config.workspace) {
          error("Not authenticated. Run 'scopeos-cli auth login' first.");
          Deno.exit(1);
        }
        
        const targetKey = findKeyByLabelOrFingerprint(config.keys, identifier);
        if (!targetKey) {
          error(`Key '${identifier}' not found`);
          Deno.exit(1);
        }
        
        const confirmed = options.yes || await Confirm.prompt(
          `Delete key '${targetKey.label}'? This cannot be undone.`
        );
        
        if (!confirmed) {
          info("Delete cancelled");
          return;
        }
        
        // Remove from config
        config.keys = config.keys.filter(k => k.label !== targetKey.label);
        
        // Re-assign activated key if needed
        if (config.activated_key === targetKey.label) {
          const nextActive = config.keys.find(k => k.status === "ACTIVE");
          config.activated_key = nextActive?.label;
        }
        
        await saveConfig(config);
        
        // Delete key file
        try {
          const keysDir = await getKeysDir(config.workspace.id);
          const keyFilePath = join(keysDir, targetKey.label);
          await Deno.remove(keyFilePath);
        } catch {
          // File might not exist, ignore
        }
        
        success(`Deleted key: ${targetKey.label}`);
        
        if (config.activated_key) {
          info(`Active key is now: ${config.activated_key}`);
        } else {
          info("No active key. Generate a new one with 'keys generate'");
        }
      } catch (err) {
        error(`Failed to delete key: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    })
  
  .command("rename", "Rename a key label")
    // GROUP: (old-label OR old-fingerprint) AND new-label
    .option("--old-label <label:string>", "Current label", {
      conflicts: ["old-fingerprint"]
    })
    .option("--old-fingerprint <fp:string>", "Current fingerprint", {
      conflicts: ["old-label"]
    })
    .option("--new-label <label:string>", "New label", { required: true })
    .action(async (options: { oldLabel?: string; oldFingerprint?: string; newLabel: string }) => {
      try {
        const identifier = options.oldLabel || options.oldFingerprint;
        if (!identifier) {
          error("Please provide --old-label or --old-fingerprint");
          console.log("Example: scopeos-cli keys rename --old-label old-name --new-label new-name");
          Deno.exit(1);
        }
        
        const config = await loadConfig();
        if (!config || !config.workspace) {
          error("Not authenticated. Run 'scopeos-cli auth login' first.");
          Deno.exit(1);
        }
        
        const targetKey = findKeyByLabelOrFingerprint(config.keys, identifier);
        if (!targetKey) {
          error(`Key '${identifier}' not found`);
          Deno.exit(1);
        }
        
        // Check collision
        if (config.keys.some(k => k.label === options.newLabel)) {
          error(`Key with label '${options.newLabel}' already exists`);
          console.log("Use 'scopeos-cli keys list' to see existing keys.");
          Deno.exit(1);
        }
        
        const oldLabel = targetKey.label;
        targetKey.label = options.newLabel;
        
        if (config.activated_key === oldLabel) {
          config.activated_key = options.newLabel;
        }
        
        await saveConfig(config);
        
        // Rename file
        try {
          const keysDir = await getKeysDir(config.workspace.id);
          await Deno.rename(
            join(keysDir, oldLabel),
            join(keysDir, options.newLabel)
          );
        } catch (err) {
          error(`Failed to rename key file: ${err}`);
          // Revert config changes
          targetKey.label = oldLabel;
          if (config.activated_key === options.newLabel) {
            config.activated_key = oldLabel;
          }
          await saveConfig(config);
          throw err;
        }
        
        success(`Renamed key from '${oldLabel}' to '${options.newLabel}'`);
        
        if (config.activated_key === options.newLabel) {
          info("This is currently the active key");
        }
      } catch (err) {
        error(`Failed to rename key: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    })
  
  .command("revoke", "Revoke a key on the server")
    // GROUP: label OR fingerprint
    .option("-l, --label <label:string>", "Key label", {
      conflicts: ["fingerprint"]
    })
    .option("-f, --fingerprint <fp:string>", "Fingerprint", {
      conflicts: ["label"]
    })
    .option("-y, --yes", "Skip confirmation")
    .action(async (options: { label?: string; fingerprint?: string; yes?: boolean }) => {
      try {
        const identifier = options.label || options.fingerprint;
        if (!identifier) {
          error("Please provide --label or --fingerprint");
          Deno.exit(1);
        }
        
        const config = await loadConfig();
        if (!config || !config.workspace) {
          error("Not authenticated. Run 'scopeos-cli auth login' first.");
          Deno.exit(1);
        }
        
        const targetKey = findKeyByLabelOrFingerprint(config.keys, identifier);
        if (!targetKey) {
          error(`Key '${identifier}' not found`);
          Deno.exit(1);
        }
        
        const accessToken = await getAccessToken();
        if (!accessToken) {
          error("Authentication expired. Please run 'scopeos-cli auth login' first.");
          Deno.exit(1);
        }
        
        const confirmed = options.yes || await Confirm.prompt(
          `Revoke key '${targetKey.label}' on the server? This cannot be undone.`
        );
        
        if (!confirmed) {
          info("Revoke cancelled");
          return;
        }
        
        info("Revoking key on server...");
        
        // API call to revoke
        const url = `${BUILD_CONFIG.api.endpoint}/v1/verification-keys/${targetKey.key_id}/revoke`;
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
          throw new Error(`Failed to revoke: ${response.status} ${errorText}`);
        }
        
        // Update local config
        targetKey.status = "REVOKED";
        
        // Switch active key if needed
        if (config.activated_key === targetKey.label) {
          const activeKey = config.keys.find(k => k.status === "ACTIVE");
          config.activated_key = activeKey?.label;
          if (activeKey) {
            console.log("");
            info(`Switched active key to: ${activeKey.label}`);
          }
        }
        
        await saveConfig(config);
        
        console.log("");
        success(`Key '${targetKey.label}' has been revoked on the server and marked as REVOKED locally`);
        info("The key remains in config for audit purposes. Use 'keys delete' to remove it.");
        console.log("");
      } catch (err) {
        error(`Failed to revoke key: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    });

// Helper functions

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
  
  return await response.json() as VerificationKey;
}
