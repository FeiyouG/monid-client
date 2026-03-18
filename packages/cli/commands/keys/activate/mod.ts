/**
 * Activate key command - Set the active key for signing requests
 */

import { Command } from "@cliffy/command";
import { loadConfig, saveConfig } from "../../../../lib/config.ts";
import { findKeyByLabelOrFingerprint } from "../../../../utils/fingerprint.ts";
import { success, error, info } from "../../../../utils/display.ts";
import { obfuscateApiKey } from "../../../../utils/obfuscate.ts";
import { decryptData, generateSystemPassword } from "../../../../lib/crypto.ts";

export const activateCommand = new Command()
  .name("activate")
  .description("Set the active key for signing requests")
  .option("-l, --label <label:string>", "Key label", {
    conflicts: ["fingerprint"]
  })
  .option("-f, --fingerprint <fp:string>", "Fingerprint (short or full)", {
    conflicts: ["label"]
  })
  .action(async (options: { label?: string; fingerprint?: string }) => {
    try {
      const identifier = options.label || options.fingerprint;
      if (!identifier) {
        error("Please provide --label or --fingerprint");
        console.log("Example: monid keys activate --label my-key");
        console.log("Example: monid keys activate --fingerprint 5afc1bc");
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
        info("Run 'monid keys list' to see available keys");
        Deno.exit(1);
      }
      
      // Type-specific validation and activation
      if (targetKey.type === "api") {
        const password = await generateSystemPassword();
        const decryptedKey = await decryptData(targetKey.key_encrypted, password);
        
        config.activated_key = targetKey.label;
        await saveConfig(config);
        
        success(`Activated API key: ${targetKey.label}`);
        info(`Key: ${obfuscateApiKey(decryptedKey)}`);
        info(`Prefix: ${targetKey.prefix}`);
      } else if (targetKey.type === "verification") {
        // Validate status
        if (targetKey.status === "REVOKED") {
          error(`Cannot activate revoked key '${targetKey.label}'`);
          info("This key has been revoked on the server");
          info("Generate a new key with 'monid keys generate --label <name>'");
          Deno.exit(1);
        }
        
        // Check expiry
        if (targetKey.expires_at) {
          const expiryDate = new Date(targetKey.expires_at);
          if (expiryDate < new Date()) {
            error(`Cannot activate expired key '${targetKey.label}'`);
            info(`This key expired on ${expiryDate.toLocaleString()}`);
            info("Generate a new key with 'monid keys generate --label <name>'");
            Deno.exit(1);
          }
        }
        
        config.activated_key = targetKey.label;
        await saveConfig(config);
        
        success(`Activated Agent Key: ${targetKey.label} (${targetKey.fingerprint_short || "unknown"})`);
      }
    } catch (err) {
      error(`Failed to activate key: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });
