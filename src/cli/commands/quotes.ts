/**
 * Quotes commands - migrated to Cliffy framework
 * Uses grouped options with conflicts/depends
 */

import { Command } from "@cliffy/command";
import type { Quote, QuoteCreate, Task } from "../../types/index.ts";
import { parseSchema } from "../shared/task-flags.ts";
import { apiPost } from "../../lib/api-client.ts";
import { success, error, info, box, formatTimeRemaining } from "../../utils/display.ts";

export const quotesCommand = new Command()
  .name("quotes")
  .description("Price quote management")
  
  .command("get", "Get price quote for task execution")
    // GROUP 1: Task creation flags (all depend on each other)
    .option("-n, --name <name:string>", "Task name", {
      depends: ["query", "output-schema"],
      conflicts: ["task-id"]
    })
    .option("-q, --query <query:string>", "Query", {
      depends: ["name", "output-schema"],
      conflicts: ["task-id"]
    })
    .option("-s, --output-schema <schema:string>", "Schema", {
      depends: ["name", "query"],
      conflicts: ["task-id"]
    })
    .option("-d, --description <desc:string>", "Description (optional with name/query/schema)", {
      depends: ["name"] // Only valid with task creation
    })
    
    // GROUP 2: Use existing task
    .option("-t, --task-id <id:string>", "Existing task ID", {
      conflicts: ["name", "query", "output-schema", "description"]
    })
    
    .action(async (options: any) => {
      try {
        let taskId = options.taskId;
        
        // Create task if flags provided
        if (options.name && options.query && options.outputSchema) {
          info("Creating task...");
          
          const schema = await parseSchema(options.outputSchema);
          const task = await apiPost<Task>("/v1/tasks", {
            name: options.name,
            description: options.description,
            query: options.query,
            outputSchema: schema,
          });
          
          taskId = task.taskId;
          success(`Task created: ${taskId}`);
        }
        
        if (!taskId) {
          error("Provide --task-id OR (--name + --query + --output-schema)");
          Deno.exit(1);
        }
        
        // Create quote
        info("Creating quote...");
        const quoteCreate: QuoteCreate = { taskId };
        const quote = await apiPost<Quote>(`/v1/tasks/${taskId}/quotes`, quoteCreate);
        
        console.log("");
        success("Quote created successfully");
        console.log("");
        
        box(
          `Quote ID:        ${quote.quoteId}\n` +
          `Task ID:         ${quote.taskId}\n` +
          `Estimated Price: ${quote.price.value} ${quote.price.currency}\n` +
          `Expiry:          ${formatTimeRemaining(quote.expiresAt)}`
        );
        
        console.log("");
        info(`Execute: scopeos-cli search --quote-id ${quote.quoteId}`);
      } catch (err) {
        error(`Failed to get quote: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    });
