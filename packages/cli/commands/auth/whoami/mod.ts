/**
 * Whoami command - Show current user and workspace info
 * Displays authentication status and token validity
 */

import { Command } from "@cliffy/command";
import { Table, Column } from "@cliffy/table";
import { loadConfig } from "../../../../lib/config.ts";
import { loadCredentials } from "../../../../lib/credentials.ts";
import { error } from "../../../../utils/display.ts";

export const whoamiCommand = new Command()
  .name("whoami")
  .description("Show current user and workspace info")
  .action(async () => {
    try {
      const config = await loadConfig();

      if (!config || !config.workspace) {
        error("Not authenticated. Run 'scopeos-cli auth login' first.");
        Deno.exit(1);
      }

      const workspaceLabel = config.workspace.slug || config.workspace.name || "unknown";
      
      new Table()
        .header(["Property", "Value"])
        .body([
          ["User Email", config.auth?.user_email || "unknown"],
          ["User ID", config.auth?.user_id || "unknown"],
          ["Workspace Name", workspaceLabel],
          ["Workspace ID", config.workspace.id],
          ["Last login", config.auth?.last_login || "unknown"],
          ["Active Key", config.activated_key || "none (run 'keys generate' to create one)"],
        ])
        .columns([new Column().minWidth(10)])
        .border(false)
        .render();

      // Check if credentials are still valid
      console.log("");
      const creds = await loadCredentials();
      if (creds) {
        console.log(
          `Token status: valid (expires in ${
            Math.floor(creds.expires_in / 60)
          } minutes)`,
        );
      } else {
        console.log("Token status: expired or missing");
      }
    } catch (err) {
      error(`Failed to get user info: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });
