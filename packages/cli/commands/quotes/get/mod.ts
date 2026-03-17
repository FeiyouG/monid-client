/**
 * Get price quote for task execution
 * Uses grouped options: either create new task OR use existing task ID
 */

import { Command } from "@cliffy/command";
import { Column, Table } from "@cliffy/table";
import type { Quote } from "../../../../types/index.ts";
import { parseSchema } from "../../../shared/task-flags.ts";
import {
  error,
  formatTimeRemaining,
  info,
  success,
} from "../../../../utils/display.ts";
import { getCliCoreClient } from "../../../core-client.ts";
import type { TaskCreate } from "../../../../types/task.ts";

export const getCommand = new Command()
  .name("get")
  .description("Get price quote for task execution")
  // GROUP 1: Task creation flags (all depend on each other)
  .option("-n, --name <name:string>", "Task name", {
    depends: ["query", "output-schema"],
    conflicts: ["task-id"],
  })
  .option("-q, --query <query:string>", "Query", {
    depends: ["name", "output-schema"],
    conflicts: ["task-id"],
  })
  .option("-s, --output-schema <schema:string>", "Schema", {
    depends: ["name", "query"],
    conflicts: ["task-id"],
  })
  .option(
    "-d, --description <desc:string>",
    "Description (optional with name/query/schema)",
    {
      depends: ["name"], // Only valid with task creation
    },
  )
  // GROUP 2: Use existing task
  .option("-t, --task-id <id:string>", "Existing task ID", {
    conflicts: ["name", "query", "output-schema", "description"],
  })
  .action(async (options: { name?: string; query?: string; outputSchema?: string; description?: string; taskId?: string; output?: string }) => {
    try {
      const client = getCliCoreClient();
      let quote: Quote;

      // Create task if flags provided
      if (options.name && options.query && options.outputSchema) {
        info("Creating task and getting a quote...");

        const schema = await parseSchema(options.outputSchema);
        const taskCreate: TaskCreate = {
          name: options.name,
          description: options.description,
          query: options.query,
          outputSchema: schema,
        };

        quote = await client.quotes.get({ taskCreate });
        success(`Task created: ${quote.taskId}`);
      } else if (options.taskId) {
        info("Getting a quote...");
        quote = await client.quotes.get({ taskId: options.taskId });
      } else {
        error("Provide --task-id OR (--name + --query + --output-schema)");
        Deno.exit(1);
      }

      new Table()
        .header(["Quote Id", "Task Id", "Estimated Price", "Expiry"])
        .body([
          [
            quote.quoteId,
            quote.taskId,
            `${quote.price.value} ${quote.price.currency}`,
            formatTimeRemaining(quote.expiresAt),
          ],
        ])
        .columns([new Column().minWidth(10)])
        .border(false)
        .render();

      console.log("");
    } catch (err) {
      error(
        `Failed to get quote: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  });
