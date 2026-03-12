/**
 * Generate key command - Generate and register a new key pair
 * Includes inline helpers: parseExpiryDate, registerKey
 */

import { Command } from "@cliffy/command";
import { Column, Table } from "@cliffy/table";
import { join } from "@std/path";
import type {
  VerificationKey,
  VerificationKeyCreate,
} from "../../../../types/verification-key.ts";
import { getKeysDir, loadConfig, saveConfig } from "../../../../lib/config.ts";
import { getAccessToken } from "../../../../lib/credentials.ts";
import { ensureWorkspaceSelected } from "../../../../lib/workspace.ts";
import {
  encryptData,
  exportKeyPair,
  generateEd25519KeyPair,
  generateSystemPassword,
} from "../../../../lib/crypto.ts";
import {
  formatPublicKey,
  generateFingerprint,
  getShortFingerprint,
} from "../../../../utils/fingerprint.ts";
import {
  error,
  formatTimeRemaining,
  info,
  success,
} from "../../../../utils/display.ts";
import { BUILD_CONFIG } from "../../../../config/build-config.ts";

export const generateCommand = new Command()
  .name("generate")
  .description("Generate and register a new key pair")
  .option("-l, --label <label:string>", "Key label", { required: true })
  .option(
    "--expires-at <date:string>",
    "Expiry date (ISO 8601 or relative like '1y', '30d')",
  )
  .action(async (options: { label: string; expiresAt?: string }) => {
    try {
      const { label, expiresAt: expiresAtArg } = options;

      // Get access token first
      const accessToken = await getAccessToken();
      if (!accessToken) {
        error(
          "Authentication expired. Please run 'scopeos-cli auth login' first.",
        );
        Deno.exit(1);
      }

      // Ensure workspace is selected
      const workspaceId = await ensureWorkspaceSelected(accessToken);

      // Reload config
      const config = await loadConfig();
      if (!config) {
        error(
          "Configuration error. Please run 'scopeos-cli auth login' first.",
        );
        Deno.exit(1);
      }

      // Check for label collision
      if (config.keys.find((k) => k.label === label)) {
        error(`Key with label '${label}' already exists.`);
        console.log(
          "Use 'scopeos-cli keys list' to see existing keys or 'scopeos-cli keys rename' to rename an existing key.",
        );
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
      const encryptedPrivateKey = await encryptData(
        exported.privateKeyPEM,
        systemPassword,
      );

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

      const registeredKey = await registerKey(
        accessToken,
        workspaceId,
        keyCreate,
      );

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

      new Table()
        .header(["id", "Label", "fingerprint", "Status", "Expires"])
        .body([
          [
            registeredKey.keyId,
            registeredKey.label,
            getShortFingerprint(registeredKey.fingerprint),
            registeredKey.status || "ACTIVE",
            registeredKey.expiresAt
              ? formatTimeRemaining(registeredKey.expiresAt)
              : "Never",
          ],
        ]).columns([
          new Column().minWidth(10),
        ])
        .border(false)
        .render();
      new Table();

      console.log("");
      console.log(
        `View at: ${BUILD_CONFIG.api.dashboardUrl}/dashboard/verification-keys`,
      );
      console.log("");
    } catch (err) {
      error(
        `Key generation failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  });

// Helper functions (inline, only used by generate command)

function parseExpiryDate(input: string): Date {
  // Try parsing as ISO 8601 first
  const isoDate = new Date(input);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Parse relative duration
  const match = input.match(/^(\d+)(y|M|d|h)$/);
  if (!match) {
    throw new Error(
      `Invalid expiry format: ${input}. Use ISO 8601 (e.g., '2027-12-31') or relative duration (e.g., '1y', '30d')`,
    );
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  const now = new Date();
  switch (unit) {
    case "y": // years
      return new Date(now.setFullYear(now.getFullYear() + value));
    case "M": // months
      return new Date(now.setMonth(now.getMonth() + value));
    case "d": // days
      return new Date(now.setDate(now.getDate() + value));
    case "h": // hours
      return new Date(now.setHours(now.getHours() + value));
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}

async function registerKey(
  accessToken: string,
  workspaceId: string,
  keyCreate: VerificationKeyCreate,
): Promise<VerificationKey> {
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
