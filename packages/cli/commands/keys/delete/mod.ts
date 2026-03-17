/**
 * Delete key command - Delete a local key
 */

import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import { join } from "@std/path";
import { getKeysDir, loadConfig, saveConfig } from "../../../../lib/config.ts";
import { getAccessToken } from "../../../../lib/credentials.ts";
import { findKeyByLabelOrFingerprint } from "../../../../utils/fingerprint.ts";
import { error, info, success, warning } from "../../../../utils/display.ts";
import { CONFIG } from "@monid/core";

export const deleteCommand = new Command()
  .name("delete")
  .description("Delete a local key")
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
        if (!config || !config.workspace) {
          error("Not authenticated. Run 'monid auth login' first.");
          Deno.exit(1);
        }

        const targetKey = findKeyByLabelOrFingerprint(config.keys, identifier);
        if (!targetKey) {
          error(`Key '${identifier}' not found`);
          Deno.exit(1);
        }

        if (targetKey.status != "REVOKED") {
          error(`Can't delete key ${identifier}. Please revoke it first`);
          Deno.exit(1);
        }

        const confirmed = options.yes || await Confirm.prompt(
          `Delete key '${targetKey.label}'? This cannot be undone.`,
        );

        if (!confirmed) {
          info("Delete cancelled");
          return;
        }

        try {
          const url =
            `${CONFIG.api.endpoint}/v1/verification-keys/${targetKey.key_id}/revoke`;
          const accessToken = await getAccessToken();
          const response = await fetch(url, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "x-workspace-id": config.workspace.id,
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Failed to delete: ${response.status} ${errorText}`,
            );
          }
        } catch {
          warning(
            `Failed to delete keys from dashboard; please manually delete them at ${CONFIG.api.dashboardUrl}/dashboard/verification-keys`,
          );
        }

        // Remove from config
        config.keys = config.keys.filter((k) => k.label !== targetKey.label);

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
      } catch (err) {
        error(
          `Failed to delete key: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        throw err;
      }
    },
  );
