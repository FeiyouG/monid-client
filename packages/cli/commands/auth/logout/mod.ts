/**
 * Logout command - Clear local credentials and revoke all keys
 * Handles key revocation, credential cleanup, and config preservation
 */

import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import { join } from "@std/path";
import { CONFIG } from "@monid/core";
import {
  deleteConfig,
  loadConfig,
  saveConfig,
  getKeysDir,
  deleteCredentials,
} from "../../../../lib/config.ts";
import { getAccessToken } from "../../../../lib/credentials.ts";
import { success, error, info } from "../../../../utils/display.ts";
import { revokeKey } from "../helpers.ts";

export const logoutCommand = new Command()
  .name("logout")
  .description("Clear local credentials and revoke all keys")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (options: { yes?: boolean }) => {
    const { yes } = options;
    try {
      const config = await loadConfig();
      
      // If no config or no keys, just delete everything
      if (!config || config.keys.length === 0) {
        await deleteConfig();
        success("Logged out successfully");
        success("Local credentials cleared");
        return;
      }
      
      // List keys that will be revoked
      console.log("\nThe following keys will be revoked on the server:");
      for (const key of config.keys) {
        console.log(`  - ${key.label} (${key.key_id})`);
      }
      console.log("");
      
      // Ask for confirmation
      const confirmed = yes || await Confirm.prompt(
        "This will revoke all keys and clear local credentials. Continue?"
      );
      
      if (!confirmed) {
        info("Logout cancelled");
        return;
      }
      
      info("Revoking keys...");
      
      // Try to get access token
      const accessToken = await getAccessToken();
      const failedRevocations: string[] = [];
      
      if (accessToken && config.workspace) {
        // Attempt to revoke each key
        for (const key of config.keys) {
          const revoked = await revokeKey(accessToken, config.workspace.id, key.key_id);
          if (!revoked) {
            failedRevocations.push(`${key.label} (${key.key_id})`);
          }
        }
      } else {
        // No valid token - can't revoke
        info("No valid authentication token - skipping server-side revocation");
        failedRevocations.push(...config.keys.map(k => `${k.label} (${k.key_id})`));
      }
      
      // Delete all local key files
      if (config.workspace) {
        try {
          const keysDir = await getKeysDir(config.workspace.id);
          for (const key of config.keys) {
            try {
              const keyPath = join(keysDir, key.label);
              await Deno.remove(keyPath);
            } catch {
              // Ignore if file doesn't exist
            }
          }
        } catch {
          // Ignore if keys directory doesn't exist
        }
      }
      
      // Clear keys and auth from config, but keep workspace
      config.keys = [];
      delete config.activated_key;
      delete config.auth;
      await saveConfig(config);
      
      // Delete credentials
      await deleteCredentials();
      
      console.log("");
      success("Logged out successfully");
      success("Local credentials cleared");
      success("Local key files deleted");
      success("Config cleared (workspace info preserved)");
      
      // Warn about failed revocations
      if (failedRevocations.length > 0) {
        console.log("");
        error(`Warning: Failed to revoke ${failedRevocations.length} key(s) on the server:`);
        for (const failed of failedRevocations) {
          console.log(`  - ${failed}`);
        }
        console.log("");
        info(`Please manually revoke them at: ${CONFIG.api.dashboardUrl}/dashboard/verification-keys`);
      }
      
      console.log("");
    } catch (err) {
      error(`Logout failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });
