/**
 * Add API key command
 */

import { Command } from "@cliffy/command";
import { loadConfig, saveConfig, createDefaultConfig } from "../../../../lib/config.ts";
import { migrateIfNeeded } from "../../../../lib/migration.ts";
import { setSecret } from "../../../../lib/secrets.ts";
import {
  obfuscateApiKey,
  extractApiKeyPrefix,
  validateApiKeyFormat,
} from "../../../../utils/obfuscate.ts";
import { success, error } from "../../../../utils/display.ts";

export const addCommand = new Command()
  .name("add")
  .description("Add an API key")
  .option("-k, --api-key <key:string>", "API key to add", { required: true })
  .option("-l, --label <label:string>", "Label for the API key", { required: true })
  .action(async (options: { apiKey: string; label: string }) => {
    try {
      const { apiKey, label } = options;

      try {
        validateApiKeyFormat(apiKey);
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        Deno.exit(1);
      }

      const prefix = extractApiKeyPrefix(apiKey);

      let config = await loadConfig();
      if (!config) {
        config = createDefaultConfig();
      }

      await migrateIfNeeded(config);

      if (config.keys.some((k) => k.label === label)) {
        error(`A key with label "${label}" already exists`);
        Deno.exit(1);
      }

      setSecret(label, apiKey);

      config.keys.push({ type: "api", label, prefix });

      if (config.keys.length === 1) {
        config.activated_key = label;
      }

      await saveConfig(config);

      success("API key added successfully");
      console.log(`  Label: ${label}`);
      console.log(`  Prefix: ${prefix}`);
      console.log(`  Key: ${obfuscateApiKey(apiKey)}`);

      if (config.activated_key === label) {
        console.log(`  Status: Activated`);
      }
    } catch (err) {
      error(`Failed to add API key: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });
