/**
 * Remove API key command
 */

import { Command } from "@cliffy/command";
import { loadConfig, saveConfig } from "../../../../lib/config.ts";
import { obfuscateApiKey } from "../../../../utils/obfuscate.ts";
import { decryptData, generateSystemPassword } from "../../../../lib/crypto.ts";
import { success, error, info } from "../../../../utils/display.ts";

export const removeCommand = new Command()
  .name("remove")
  .description("Remove an API key")
  .option("-l, --label <label:string>", "Label of the API key to remove", { required: true })
  .action(async (options: { label: string }) => {
    try {
      const label = options.label;

      const config = await loadConfig();
      if (!config || !config.keys || config.keys.length === 0) {
        error("No keys found");
        Deno.exit(1);
      }

      const key = config.keys.find(k => k.label === label);
      
      if (!key) {
        error(`Key not found: ${label}`);
        Deno.exit(1);
      }

      // Validate this is an API key
      if (key.type !== "api") {
        error(`Cannot remove Agent Key '${label}'`);
        info("Agent keys must be deleted using 'monid keys delete --label <name>'");
        Deno.exit(1);
      }

      // Decrypt to show obfuscated version
      const password = await generateSystemPassword();
      const decryptedKey = await decryptData(key.key_encrypted, password);

      // Remove from config
      const keyIndex = config.keys.findIndex(k => k.label === label);
      config.keys.splice(keyIndex, 1);

      // Clear activation if this was the active key
      if (config.activated_key === label) {
        delete config.activated_key;
      }

      await saveConfig(config);

      success("API key removed successfully");
      console.log(`  Label: ${label}`);
      console.log(`  Key: ${obfuscateApiKey(decryptedKey)}`);
    } catch (err) {
      error(`Failed to remove API key: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });
