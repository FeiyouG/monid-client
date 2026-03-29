/**
 * monid inspect — Get full details for a specific endpoint
 */

import { Command } from "@cliffy/command";
import { getCliCoreClient } from "../../core-client.ts";
import { formatPrice } from "../../../types/api.ts";
import {
  error,
  info,
  prettyJson,
  success,
} from "../../../utils/display.ts";

export const inspectCommand = new Command()
  .name("inspect")
  .description(
    "Get full details for a specific endpoint — input schema, pricing, documentation",
  )
  .option("-p, --provider <provider:string>", "Provider name", {
    required: true,
  })
  .option("-e, --endpoint <endpoint:string>", "Endpoint path", {
    required: true,
  })
  .action(async (options: { provider: string; endpoint: string }) => {
    try {
      info(`Inspecting ${options.provider}${options.endpoint}...`);

      const client = getCliCoreClient();
      const result = await client.inspect.inspect(
        options.provider,
        options.endpoint,
      );

      console.log("");
      success(`${result.providerName} (${result.provider}) ${result.endpoint}`);
      console.log("");

      console.log(`  Description:  ${result.description}`);
      console.log(`  Price:        ${formatPrice(result.price)}`);
      if (result.docUrl) {
        console.log(`  Docs:         ${result.docUrl}`);
      }
      console.log("");

      if (result.summary) {
        console.log("  Summary:");
        for (const line of result.summary.split("\n")) {
          console.log(`    ${line}`);
        }
      } else {
        console.log("  Summary:      No summary available.");
      }
      console.log("");

      if (result.inputSchema) {
        console.log("  Input Schema:");
        const schemaLines = prettyJson(result.inputSchema).split("\n");
        for (const line of schemaLines) {
          console.log(`    ${line}`);
        }
      } else {
        console.log("  Input Schema: No input schema available.");
      }
      console.log("");

      console.log("  Usage:");
      console.log(`    CLI:       ${result.usage.cli}`);
      console.log(`    CLI x402:  ${result.usage.cliX402}`);
      console.log("");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("404")) {
        error(
          `Endpoint not found: ${options.provider}${options.endpoint}`,
        );
      } else {
        error(`Inspect failed: ${message}`);
      }
      throw err;
    }
  });
