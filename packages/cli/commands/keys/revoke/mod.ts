/**
 * Revoke key command - Revoke a key on the server
 */

import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import { loadConfig, saveConfig } from "../../../../lib/config.ts";
import { getAccessToken } from "../../../../lib/credentials.ts";
import { findKeyByLabelOrFingerprint } from "../../../../utils/fingerprint.ts";
import { error, info, success } from "../../../../utils/display.ts";
import { CONFIG } from "@monid/core";

export const revokeCommand = new Command()
  .name("revoke")
  .description("Revoke a key on the server")
  .option("-l, --label <label:string>", "Key label", {
    conflicts: ["fingerprint"],
  })
  .option("-f, --fingerprint <fp:string>", "Fingerprint", {
    conflicts: ["label"],
  })
  .option("-y, --yes", "Skip confirmation")
  .action(
    async (
      options: { label?: string; fingerprint?: string; yes?: boolean },
    ) => {
      try {
        const identifier = options.label || options.fingerprint;
        if (!identifier) {
          error("Please provide --label or --fingerprint");
          Deno.exit(1);
        }

        const config = await loadConfig();
        if (!config) {
          error("No configuration found");
          Deno.exit(1);
        }

        // Find key by label or fingerprint
        let targetKey;
        
        if (options.label) {
          targetKey = config.keys.find(k => k.label === options.label);
        } else if (options.fingerprint) {
          // Only verification keys have fingerprints
          targetKey = config.keys.find(k => 
            k.type === "verification" && 
            (k.fingerprint === options.fingerprint || k.fingerprint_short === options.fingerprint)
          );
        }

        if (!targetKey) {
          error(`Key '${identifier}' not found`);
          Deno.exit(1);
        }

        // Validate this is a verification key
        if (targetKey.type !== "verification") {
          error(`Cannot revoke API key '${targetKey.label}'`);
          info("API keys can only be removed using 'monid keys remove --label <name>'");
          Deno.exit(1);
        }

        if (!config.workspace) {
          error("Not authenticated. Run 'monid auth login' first.");
          Deno.exit(1);
        }

        if (targetKey.label == config.activated_key) {
          error(`Can't revoke activated key`);
          Deno.exit(1);
        }

        const accessToken = await getAccessToken();
        if (!accessToken) {
          error(
            "Authentication expired. Please run 'monid auth login' first.",
          );
          Deno.exit(1);
        }

        const confirmed = options.yes || await Confirm.prompt(
          `Revoke key '${targetKey.label}' on the server? This cannot be undone.`,
        );

        if (!confirmed) {
          info("Revoke cancelled");
          return;
        }

        info("Revoking key on server...");

        // API call to revoke
        const url =
          `${CONFIG.api.endpoint}/v1/verification-keys/${targetKey.key_id}/revoke`;
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
        await saveConfig(config);

        success(
          `Key '${targetKey.label}' has been revoked on the server and marked as REVOKED locally`,
        );
      } catch (err) {
        error(
          `Failed to revoke key: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        throw err;
      }
    },
  );
