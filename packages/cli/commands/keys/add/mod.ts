/**
 * Add API key command
 */

import { Command } from "@cliffy/command";
import { loadConfig, saveConfig, createDefaultConfig } from "../../../../lib/config.ts";
import { encryptData, generateSystemPassword } from "../../../../lib/crypto.ts";
import { 
  obfuscateApiKey,
  extractApiKeyPrefix 
} from "../../../../utils/obfuscate.ts";
import { success, error } from "../../../../utils/display.ts";

export const addCommand = new Command()
  .name("add")
  .description("Add an API key")
  .option("-k, --api-key <key:string>", "API key to add", { required: true })
  .option("-l, --label <label:string>", "Label for the API key", { required: true })
  .action(async (options: { apiKey: string; label: string }) => {
    try {
      const apiKey = options.apiKey;
      const label = options.label;

      // Extract prefix
      const prefix = extractApiKeyPrefix(apiKey);

      // Load config
      let config = await loadConfig();
      if (!config) {
        config = createDefaultConfig();
      }

      // Check for duplicate labels (across ALL keys)
      const allLabels = config.keys.map(k => k.label);
      
      if (allLabels.includes(label)) {
        error(`A key with label "${label}" already exists`);
        Deno.exit(1);
      }

      // Encrypt API key
      const password = await generateSystemPassword();
      const encryptedKey = await encryptData(apiKey, password);

      // Add to config
      config.keys.push({
        type: "api",
        label,
        key_encrypted: encryptedKey,
        prefix,
      });

      // Auto-activate if first key
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
