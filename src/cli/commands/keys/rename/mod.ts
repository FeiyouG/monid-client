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
        console.log("Example: scopeos-cli keys rename --old-label old-name --new-label new-name");
        Deno.exit(1);
      }
      
      const config = await loadConfig();
      if (!config || !config.workspace) {
        error("Not authenticated. Run 'scopeos-cli auth login' first.");
        Deno.exit(1);
      }
      
      const targetKey = findKeyByLabelOrFingerprint(config.keys, identifier);
      if (!targetKey) {
        error(`Key '${identifier}' not found`);
        Deno.exit(1);
      }
      
      // Check collision
      if (config.keys.some(k => k.label === options.newLabel)) {
        error(`Key with label '${options.newLabel}' already exists`);
        console.log("Use 'scopeos-cli keys list' to see existing keys.");
        Deno.exit(1);
      }
      
      const oldLabel = targetKey.label;
      targetKey.label = options.newLabel;
      
      if (config.activated_key === oldLabel) {
        config.activated_key = options.newLabel;
      }
      
      await saveConfig(config);
      
      // Rename file
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
      
      success(`Renamed key from '${oldLabel}' to '${options.newLabel}'`);
      
      if (config.activated_key === options.newLabel) {
        info("This is currently the active key");
      }
    } catch (err) {
      error(`Failed to rename key: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });
