/**
 * Search command - migrated to Cliffy framework
 * Uses grouped options with conflicts/depends for mutual exclusivity
 */

import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import type {
  Execution,
  ExecutionCreate,
  Quote,
  QuoteCreate,
  Task,
} from "../../../types/index.ts";
import { parseSchema } from "../../shared/task-flags.ts";
import { type AiError, apiGet, apiPost } from "../../../lib/api-client.ts";
import { pollExecution } from "../../../lib/polling.ts";
import {
  error,
  formatTimeRemaining,
  info,
  statusBadge,
  success,
} from "../../../utils/display.ts";
import { displayExecutionResult } from "../executions/get/mod.ts";
import { formatPrice } from "../../../types/quote.ts";
import { TaskCreate } from "../../../types/task.ts";

export const searchCommand = new Command()
  .name("search")
  .description("Execute a search")
  // GROUP 1: Task creation (all depend on each other, conflict with task-id and quote-id)
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
    depends: ["name"], // Only with task creation
  })
  // GROUP 2: Use existing task
  .option("-t, --task-id <id:string>", "Existing task ID", {
    conflicts: ["name", "query", "output-schema", "description", "quote-id"],
  })
  // GROUP 3: Use existing quote
  .option("--quote-id <id:string>", "Existing quote ID", {
    conflicts: ["name", "query", "output-schema", "description", "task-id"],
  })
  // Independent options
  .option("-y, --yes", "Skip confirmation")
  .option(
    "-w, --wait [timeout:number]",
    "Wait for completion (optional timeout in seconds)",
  )
  .option("-o, --output <file:string>", "Save results to file")
  .action(async (options) => {
    try {
      let quote: Quote | undefined = undefined;
      if (options.name && options.query && options.outputSchema) {
        const outputSchema = await parseSchema(options.outputSchema);

        const taskCreate: TaskCreate = {
          name: options.name,
          description: options.description,
          query: options.query,
          outputSchema,
        };

        quote = await apiPost<Quote>(
          `/v1/tasks/${options.taskId}/quotes`,
          taskCreate,
        );
      } else if (options.taskId) {
        const quoteCreate: QuoteCreate = { taskId: options.taskId };
        const quote = await apiPost<Quote>(
          `/v1/tasks/${options.taskId}/quotes`,
          quoteCreate,
        );
        quote.quoteId;
      } else if (options.quoteId) {
        try {
          quote = await apiGet<Quote>(`/v1/quotes/${options.quoteId}`);
        } catch (err) {
          if (err instanceof Error && err.message.search("404")) {
            error(
              `Quote ${options.quoteId} not found; it might have been expired`,
            );
          } else {
            throw err;
          }
          Deno.exit(1);
        }
      }

      if (!quote) {
        error(`Unkown options ${options}`);
        Deno.exit(1);
      }

      const formattedPrice = formatPrice(quote.price);
      const confirmed = options.yes ||
        await Confirm.prompt(`Proceed with search for ${formattedPrice}`);
      if (!confirmed) {
        info("Search cancelled");
        return;
      }

      // Execute
      info(`Starting execution (${formattedPrice})...`);
      const executionCreate: ExecutionCreate = { quoteId: quote.quoteId };
      const execution = await apiPost<Execution>(
        "/v1/searches",
        executionCreate,
      );

      console.log("");
      success(`Execution started: ${execution.executionId}`);
      console.log("");

      const waitTimeoutMs = getWaitTimeoutMs(
        options.wait as boolean | number | undefined,
      );

      if (options.wait !== undefined) {
        info("Waiting for completion...");
        console.log("");
        let completed: Execution;
        try {
          completed = await pollExecution(
            execution.executionId,
            waitTimeoutMs ? { timeout: waitTimeoutMs } : {},
          );
        } catch (err) {
          if (
            waitTimeoutMs && err instanceof Error &&
            err.message.includes("Polling timeout")
          ) {
            throw new Error(
              `Execution did not reach terminal status within ${
                Math.floor(waitTimeoutMs / 1000)
              } seconds`,
            );
          }
          throw err;
        }
        console.log("");
        displayExecutionResult(completed, options.output);
      } else {
        console.log(`Status: ${statusBadge(execution.status)}`);
        console.log("");
        info(
          `Check: scopeos-cli executions get --execution-id ${execution.executionId}`,
        );
      }
    } catch (err) {
      error(
        `Search failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  });

function getWaitTimeoutMs(wait?: boolean | number): number | undefined {
  if (wait === undefined || wait === true) {
    return undefined;
  }

  if (typeof wait !== "number" || !Number.isFinite(wait) || wait <= 0) {
    throw new Error(
      "Invalid --wait timeout. Please provide a positive number of seconds.",
    );
  }

  return wait * 1000;
}
