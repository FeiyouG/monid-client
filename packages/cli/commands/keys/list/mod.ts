/**
 * List keys command - List all keys for current workspace
 */

import { Command } from "@cliffy/command";
import { Cell, Column, Table } from "@cliffy/table";
import { loadConfig } from "../../../../lib/config.ts";
import { getShortFingerprint } from "../../../../utils/fingerprint.ts";
import { error, formatTimeRemaining } from "../../../../utils/display.ts";
import { obfuscateApiKey } from "../../../../utils/obfuscate.ts";
import { decryptData, generateSystemPassword } from "../../../../lib/crypto.ts";

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

      if (!config.keys || config.keys.length === 0) {
        console.log("No keys found. Generate a verification key or add an API key:");
        console.log("  monid keys generate --label <name>");
        console.log("  monid keys add --api-key <key> --label <name>");
        return;
      }

      // Build unified table rows
      const password = await generateSystemPassword();
      const rows = [];
      
      for (const key of config.keys) {
        const isActive = key.label === config.activated_key;
        
        if (key.type === "verification") {
          rows.push([
            new Cell(isActive ? "*" : "").align("center"),
            "Agent Key",
            key.label,
            key.fingerprint_short || getShortFingerprint(key.fingerprint),
            key.status || "ACTIVE",
            "",
            key.expires_at ? formatTimeRemaining(key.expires_at) : "Never",
          ]);
        } else if (key.type === "api") {
          const decryptedKey = await decryptData(key.key_encrypted, password);
          const obfuscated = obfuscateApiKey(decryptedKey);
          
          rows.push([
            new Cell(isActive ? "*" : "").align("center"),
            "API Key",
            key.label,
            obfuscated,
            "",
            key.prefix,
            "",
          ]);
        }
      }

      console.log("\nKeys:");
      new Table()
        .header(["Activated", "Type", "Label", "Identifier", "Status", "Prefix", "Expires"])
        .body(rows)
        .columns([new Column().minWidth(10)])
        .border(false)
        .render();

      if (config.activated_key) {
        console.log("\n* = Currently activated");
      }
    } catch (err) {
      error(
        `Failed to list keys: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  });
