/**
 * monid inspect — Get full details for a specific endpoint
 */

import { Command } from "@cliffy/command";
import { getCliCoreClient } from "../../core-client.ts";
import {
  error,
  info,
  renderObject,
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
  .option("-j, --json", "Output raw JSON (for agents and scripting)")
  .action(
    async (options: { provider: string; endpoint: string; json?: boolean }) => {
      try {
        info(`Inspecting ${options.provider}${options.endpoint}...`);

        const client = getCliCoreClient();
        const result = await client.inspect.inspect(
          options.provider,
          options.endpoint,
        );

        // --json: raw machine-readable output
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        // Human-readable hierarchical output
        console.log("");
        success(
          `${result.providerName} (${result.provider}) ${result.endpoint}`,
        );
        console.log("");
        console.log(renderObject(result).join("\n"));
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
    },
  );
