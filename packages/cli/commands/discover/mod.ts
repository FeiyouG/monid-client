/**
 * monid discover — NL search for available data endpoints
 */

import { Command } from "@cliffy/command";
import { Table, Column } from "@cliffy/table";
import { getCliCoreClient } from "../../core-client.ts";
import { formatPrice } from "../../../types/api.ts";
import {
  error,
  info,
  success,
} from "../../../utils/display.ts";

export const discoverCommand = new Command()
  .name("discover")
  .description("Search for available data endpoints by natural language query")
  .option("-q, --query <query:string>", "Natural language search query", {
    required: true,
  })
  .option("-l, --limit <limit:number>", "Number of results (1-20, default 5)")
  .option("-j, --json", "Output raw JSON (for agents and scripting)")
  .action(async (options: { query: string; limit?: number; json?: boolean }) => {
    try {
      info(`Searching for: "${options.query}"...`);

      const client = getCliCoreClient();
      const response = await client.discover.discover(
        options.query,
        options.limit,
      );

      // --json: raw machine-readable output
      if (options.json) {
        console.log(JSON.stringify(response, null, 2));
        return;
      }

      if (response.count === 0) {
        console.log("");
        info("No matching endpoints found.");
        return;
      }

      console.log("");
      success(`Found ${response.count} endpoint${response.count > 1 ? "s" : ""}:`);
      console.log("");

      const table = new Table()
        .header(["Provider", "Endpoint", "Description", "Price"])
        .body(
          response.results.map((r) => [
            r.providerName ? `${r.providerName} (${r.provider})` : r.provider,
            r.endpoint,
            r.description.length > 60
              ? r.description.slice(0, 57) + "..."
              : r.description,
            formatPrice(r.price),
          ]),
        )
        .columns([
          new Column().minWidth(10),
          new Column().minWidth(20),
          new Column().minWidth(30).maxWidth(60),
          new Column().minWidth(12),
        ])
        .border();

      table.render();
      console.log("");
      info("Use `monid inspect --provider <provider> --endpoint <endpoint>` for details.");
    } catch (err) {
      error(
        `Discover failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  });
