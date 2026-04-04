/**
 * Rename key command
 */

import { Command } from "@cliffy/command";
import { loadConfig, saveConfig } from "../../../../lib/config.ts";
import { migrateIfNeeded } from "../../../../lib/migration.ts";
import { getSecret, setSecret, deleteSecret } from "../../../../lib/secrets.ts";
import { success, error, info } from "../../../../utils/display.ts";

export const renameCommand = new Command()
  .name("rename")
  .description("Rename an API key label")
  .option("--old-label <label:string>", "Current label", { required: true })
  .option("--new-label <label:string>", "New label", { required: true })
  .action(async (options: { oldLabel: string; newLabel: string }) => {
    try {
      const config = await loadConfig();
      if (!config) {
        error("No configuration found");
        Deno.exit(1);
      }

      await migrateIfNeeded(config);

      if (config.keys.some((k) => k.label === options.newLabel)) {
        error(`A key with label '${options.newLabel}' already exists`);
        Deno.exit(1);
      }

      const targetKey = config.keys.find((k) => k.label === options.oldLabel);
      if (!targetKey) {
        error(`Key '${options.oldLabel}' not found`);
        Deno.exit(1);
      }

      const rawKey = getSecret(options.oldLabel);
      if (rawKey) {
        setSecret(options.newLabel, rawKey);
        deleteSecret(options.oldLabel);
      }

      const oldLabel = targetKey.label;
      targetKey.label = options.newLabel;

      if (config.activated_key === oldLabel) {
        config.activated_key = options.newLabel;
      }

      await saveConfig(config);

      success(`Renamed API key from '${oldLabel}' to '${options.newLabel}'`);

      if (config.activated_key === options.newLabel) {
        info("This is currently the active key");
      }
    } catch (err) {
      error(`Failed to rename key: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });
