/**
 * List keys command - List all keys for current workspace
 */

import { Command } from "@cliffy/command";
import { Cell, Column, Table } from "@cliffy/table";
import { loadConfig } from "../../../../lib/config.ts";
import { getShortFingerprint } from "../../../../utils/fingerprint.ts";
import { error, formatTimeRemaining } from "../../../../utils/display.ts";

export const listCommand = new Command()
  .name("list")
  .description("List all keys for current workspace")
  .action(async () => {
    try {
      const config = await loadConfig();
      if (!config || !config.workspace) {
        error("Not authenticated. Run 'monid auth login' first.");
        Deno.exit(1);
      }

      if (config.keys.length === 0) {
        console.log("No keys found. Generate one with:");
        console.log("  monid keys generate --label <name>");
        return;
      }

      console.log("");
      new Table()
        .header(["Activated", "Label", "fingerprint", "Status", "Expires"])
        .body(config.keys.map((key) => [
          new Cell(key.label == config.activated_key ? "*" : "").align(
            "center",
          ),
          key.label,
          key.fingerprint_short || getShortFingerprint(key.fingerprint),
          key.status || "ACTIVE",
          key.expires_at ? formatTimeRemaining(key.expires_at) : "Never",
        ])).columns([
          new Column().minWidth(10),
        ])
        .border(false)
        .render();
    } catch (err) {
      error(
        `Failed to list keys: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  });
