/**
 * Remove API key command
 */

import { Command } from "@cliffy/command";
import { loadConfig, saveConfig } from "../../../../lib/config.ts";
import { migrateIfNeeded } from "../../../../lib/migration.ts";
import { deleteSecret } from "../../../../lib/secrets.ts";
import { success, error } from "../../../../utils/display.ts";

export const removeCommand = new Command()
  .name("remove")
  .description("Remove an API key")
  .option("-l, --label <label:string>", "Label of the API key to remove", { required: true })
  .action(async (options: { label: string }) => {
    try {
      const { label } = options;

      const config = await loadConfig();
      if (!config || !config.keys || config.keys.length === 0) {
        error("No keys found");
        Deno.exit(1);
      }

      await migrateIfNeeded(config);

      const key = config.keys.find((k) => k.label === label);
      if (!key) {
        error(`Key not found: ${label}`);
        Deno.exit(1);
      }

      deleteSecret(label);

      const keyIndex = config.keys.findIndex((k) => k.label === label);
      config.keys.splice(keyIndex, 1);

      if (config.activated_key === label) {
        delete config.activated_key;
      }

      await saveConfig(config);

      success("API key removed successfully");
      console.log(`  Label: ${label}`);
    } catch (err) {
      error(`Failed to remove API key: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });
