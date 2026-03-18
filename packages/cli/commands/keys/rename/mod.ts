/**
 * Rename key command - Rename a key label
 */

import { Command } from "@cliffy/command";
import { join } from "@std/path";
import { loadConfig, saveConfig, getKeysDir } from "../../../../lib/config.ts";
import { findKeyByLabelOrFingerprint } from "../../../../utils/fingerprint.ts";
import { success, error, info } from "../../../../utils/display.ts";

export const renameCommand = new Command()
  .name("rename")
  .description("Rename a key label")
  .option("--old-label <label:string>", "Current label", {
    conflicts: ["old-fingerprint"]
  })
  .option("--old-fingerprint <fp:string>", "Current fingerprint", {
    conflicts: ["old-label"]
  })
  .option("--new-label <label:string>", "New label", { required: true })
  .action(async (options: { oldLabel?: string; oldFingerprint?: string; newLabel: string }) => {
    try {
      const identifier = options.oldLabel || options.oldFingerprint;
      if (!identifier) {
        error("Please provide --old-label or --old-fingerprint");
        console.log("Example: monid keys rename --old-label old-name --new-label new-name");
        Deno.exit(1);
      }
      
      const config = await loadConfig();
      if (!config) {
        error("No configuration found");
        Deno.exit(1);
      }
      
      // Check for duplicate new label across all keys
      const allLabels = config.keys.map(k => k.label);
      
      if (allLabels.includes(options.newLabel)) {
        error(`A key with label '${options.newLabel}' already exists`);
        console.log("Use 'monid keys list' to see existing keys.");
        Deno.exit(1);
      }
      
      // Find key by label or fingerprint
      let targetKey;
      
      if (options.oldLabel) {
        targetKey = config.keys.find(k => k.label === options.oldLabel);
      } else if (options.oldFingerprint) {
        // Only verification keys have fingerprints
        targetKey = config.keys.find(k => 
          k.type === "verification" && 
          (k.fingerprint === options.oldFingerprint || k.fingerprint_short === options.oldFingerprint)
        );
      }
      
      if (!targetKey) {
        error(`Key '${identifier}' not found`);
        Deno.exit(1);
      }
      
      const oldLabel = targetKey.label;
      targetKey.label = options.newLabel;
      
      if (config.activated_key === oldLabel) {
        config.activated_key = options.newLabel;
      }
      
      // Handle file rename for verification keys only
      if (targetKey.type === "verification") {
        if (!config.workspace) {
          error("Not authenticated. Run 'monid auth login' first.");
          Deno.exit(1);
        }
        
        try {
          const keysDir = await getKeysDir(config.workspace.id);
          await Deno.rename(
            join(keysDir, oldLabel),
            join(keysDir, options.newLabel)
          );
        } catch (err) {
          error(`Failed to rename key file: ${err}`);
          // Revert config changes
          targetKey.label = oldLabel;
          if (config.activated_key === options.newLabel) {
            config.activated_key = oldLabel;
          }
          await saveConfig(config);
          throw err;
        }
      }
      
      await saveConfig(config);
      
      const keyType = targetKey.type === "api" ? "API key" : "Agent Key";
      success(`Renamed ${keyType} from '${oldLabel}' to '${options.newLabel}'`);
      
      if (config.activated_key === options.newLabel) {
        info("This is currently the active key");
      }
    } catch (err) {
      error(`Failed to rename key: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });
