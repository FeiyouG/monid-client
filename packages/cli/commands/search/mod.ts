/**
 * Search command - migrated to Cliffy framework
 * Uses grouped options with conflicts/depends for mutual exclusivity
 */

import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import type { Quote } from "../../../types/index.ts";
import { parseSchema } from "../../shared/task-flags.ts";
import {
  error,
  info,
  statusBadge,
  success,
} from "../../../utils/display.ts";
import { displayExecutionResult } from "../executions/get/mod.ts";
import { formatPrice } from "../../../types/quote.ts";
import type { TaskCreate } from "../../../types/task.ts";
import { getCliCoreClient } from "../../core-client.ts";

export const searchCommand = new Command()
  .name("search")
  .description("Execute a search")
  .option("-n, --name <name:string>", "Task name", {
    depends: ["query", "output-schema"],
    conflicts: ["task-id", "quote-id"],
  })
  .option("-q, --query <query:string>", "Query", {
    depends: ["name", "output-schema"],
    conflicts: ["task-id", "quote-id"],
  })
  .option("-s, --output-schema <schema:string>", "Schema", {
    depends: ["name", "query"],
    conflicts: ["task-id", "quote-id"],
  })
  .option("-d, --description <desc:string>", "Description", {
    depends: ["name"],
  })
  .option("-t, --task-id <id:string>", "Existing task ID", {
    conflicts: ["name", "query", "output-schema", "description", "quote-id"],
  })
  .option("--quote-id <id:string>", "Existing quote ID", {
    conflicts: ["name", "query", "output-schema", "description", "task-id"],
  })
  .option("-y, --yes", "Skip confirmation")
  .option(
    "-w, --wait [timeout:number]",
    "Wait for completion (optional timeout in seconds)",
  )
  .option("-o, --output <file:string>", "Save results to file")
  .action(async (options) => {
    try {
      const client = getCliCoreClient();
      const quote = await resolveQuote(options);

      const formattedPrice = formatPrice(quote.price);
      const confirmed = options.yes ||
        await Confirm.prompt(`Proceed with search for ${formattedPrice}`);
      if (!confirmed) {
        info("Search cancelled");
        return;
      }

      info(`Starting execution (${formattedPrice})...`);
      const result = await client.search.run({
        quoteId: quote.quoteId,
        wait: options.wait as boolean | number | undefined,
      });

      console.log("");
      success(`Execution started: ${result.execution.executionId}`);
      console.log("");

      if (options.wait !== undefined) {
        displayExecutionResult(result.execution, options.output);
      } else {
        console.log(`Status: ${statusBadge(result.execution.status)}`);
        console.log("");
        info(
          `Check: scopeos-cli executions get --execution-id ${result.execution.executionId}`,
        );
      }
    } catch (err) {
      error(
        `Search failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  });

async function resolveQuote(options: Record<string, unknown>): Promise<Quote> {
  const client = getCliCoreClient();

  if (typeof options.quoteId === "string") {
    try {
      return await client.quotes.getById(options.quoteId);
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) {
        error(`Quote ${options.quoteId} not found; it might have expired`);
        Deno.exit(1);
      }
      throw err;
    }
  }

  if (typeof options.taskId === "string") {
    return client.quotes.get({ taskId: options.taskId });
  }

  if (
    typeof options.name === "string" &&
    typeof options.query === "string" &&
    typeof options.outputSchema === "string"
  ) {
    const outputSchema = await parseSchema(options.outputSchema);
    const taskCreate: TaskCreate = {
      name: options.name,
      description: typeof options.description === "string"
        ? options.description
        : undefined,
      query: options.query,
      outputSchema,
    };
    return client.quotes.get({ taskCreate });
  }

  error("Provide one of: --quote-id, --task-id, or (--name + --query + --output-schema)");
  Deno.exit(1);
}
