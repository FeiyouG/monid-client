/**
 * List wallets command
 */

import { Command } from "@cliffy/command";
import { Cell, Column, Table } from "@cliffy/table";
import { loadConfig } from "../../../../lib/config.ts";
import { error } from "../../../../utils/display.ts";

export const listCommand = new Command()
  .name("list")
  .description("List all wallets")
  .action(async () => {
    try {
      const config = await loadConfig();
      if (!config) {
        error("No configuration found.");
        Deno.exit(1);
      }

      if (!config.wallets || config.wallets.length === 0) {
        console.log("No wallets found. Add one with:");
        console.log("  monid wallet add --private-key <0x...> --label <name>");
        return;
      }

      const rows = [];

      for (const wallet of config.wallets) {
        const isActive = wallet.label === config.activated_wallet;
        rows.push([
          new Cell(isActive ? "*" : "").align("center"),
          wallet.label,
          wallet.address,
        ]);
      }

      console.log("\nWallets:");
      new Table()
        .header(["Active", "Label", "Address"])
        .body(rows)
        .columns([new Column().minWidth(8)])
        .border(false)
        .render();

      if (config.activated_wallet) {
        console.log("\n* = Currently activated");
      }
    } catch (err) {
      error(
        `Failed to list wallets: ${err instanceof Error ? err.message : String(err)}`
      );
      throw err;
    }
  });
