/**
 * Activate key command
 */

import { Command } from "@cliffy/command";
import { loadConfig, saveConfig } from "../../../../lib/config.ts";
import { migrateIfNeeded } from "../../../../lib/migration.ts";
import { getSecret } from "../../../../lib/secrets.ts";
import { success, error, info } from "../../../../utils/display.ts";
import { obfuscateApiKey } from "../../../../utils/obfuscate.ts";

export const activateCommand = new Command()
  .name("activate")
  .description("Set the active API key")
  .option("-l, --label <label:string>", "Key label", { required: true })
  .action(async (options: { label: string }) => {
    try {
      const config = await loadConfig();
      if (!config) {
        error("No configuration found");
        Deno.exit(1);
      }

      await migrateIfNeeded(config);

      const targetKey = config.keys.find((k) => k.label === options.label);
      if (!targetKey) {
        error(`Key '${options.label}' not found`);
        info("Run 'monid keys list' to see available keys");
        Deno.exit(1);
      }

      config.activated_key = targetKey.label;
      await saveConfig(config);

      const rawKey = getSecret(targetKey.label);

      success(`Activated API key: ${targetKey.label}`);
      if (rawKey) {
        info(`Key: ${obfuscateApiKey(rawKey)}`);
      }
      info(`Prefix: ${targetKey.prefix}`);
    } catch (err) {
      error(`Failed to activate key: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });
