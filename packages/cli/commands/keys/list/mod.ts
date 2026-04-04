/**
 * List keys command
 */

import { Command } from "@cliffy/command";
import { Cell, Column, Table } from "@cliffy/table";
import { loadConfig } from "../../../../lib/config.ts";
import { migrateIfNeeded } from "../../../../lib/migration.ts";
import { getSecret } from "../../../../lib/secrets.ts";
import { error } from "../../../../utils/display.ts";
import { obfuscateApiKey } from "../../../../utils/obfuscate.ts";

export const listCommand = new Command()
  .name("list")
  .description("List all keys")
  .action(async () => {
    try {
      const config = await loadConfig();
      if (!config) {
        error("No configuration found.");
        Deno.exit(1);
      }

      await migrateIfNeeded(config);

      if (!config.keys || config.keys.length === 0) {
        console.log("No keys found. Add an API key:");
        console.log("  monid keys add --api-key <key> --label <name>");
        return;
      }

      const rows = [];

      for (const key of config.keys) {
        const isActive = key.label === config.activated_key;
        const rawKey = getSecret(key.label);
        const display = rawKey
          ? obfuscateApiKey(rawKey)
          : "[not found - re-add required]";

        rows.push([
          new Cell(isActive ? "*" : "").align("center"),
          "API Key",
          key.label,
          display,
          key.prefix,
        ]);
      }

      console.log("\nKeys:");
      new Table()
        .header(["Activated", "Type", "Label", "Key", "Prefix"])
        .body(rows)
        .columns([new Column().minWidth(10)])
        .border(false)
        .render();

      if (config.activated_key) {
        console.log("\n* = Currently activated");
      }
    } catch (err) {
      error(
        `Failed to list keys: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  });
