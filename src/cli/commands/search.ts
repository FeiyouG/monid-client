/**
 * Search command - migrated to Cliffy framework
 * Uses grouped options with conflicts/depends for mutual exclusivity
 */

import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import type { Task, Quote, QuoteCreate, Execution, ExecutionCreate } from "../../types/index.ts";
import { parseSchema } from "../shared/task-flags.ts";
import { apiPost } from "../../lib/api-client.ts";
import { pollExecution } from "../../lib/polling.ts";
import { success, error, info, statusBadge, formatTimeRemaining } from "../../utils/display.ts";
import { displayExecutionResult } from "./executions.ts";

export const searchCommand = new Command()
  .name("search")
  .description("Execute a search")
  
  // GROUP 1: Task creation (all depend on each other, conflict with task-id and quote-id)
  .option("-n, --name <name:string>", "Task name", {
    depends: ["query", "output-schema"],
    conflicts: ["task-id", "quote-id"]
  })
  .option("-q, --query <query:string>", "Query", {
    depends: ["name", "output-schema"],
    conflicts: ["task-id", "quote-id"]
  })
  .option("-s, --output-schema <schema:string>", "Schema", {
    depends: ["name", "query"],
    conflicts: ["task-id", "quote-id"]
  })
  .option("-d, --description <desc:string>", "Description", {
    depends: ["name"] // Only with task creation
  })
  
  // GROUP 2: Use existing task
  .option("-t, --task-id <id:string>", "Existing task ID", {
    conflicts: ["name", "query", "output-schema", "description", "quote-id"]
  })
  
  // GROUP 3: Use existing quote
  .option("--quote-id <id:string>", "Existing quote ID", {
    conflicts: ["name", "query", "output-schema", "description", "task-id"]
  })
  
  // Independent options
  .option("-y, --yes", "Skip confirmation")
  .option("-w, --wait", "Wait for completion")
  .option("-o, --output <file:string>", "Save results to file")
  
  .action(async (options: any) => {
    try {
      let quoteId = options.quoteId;
      
      // Option 1: Create task + quote
      if (options.name && options.query && options.outputSchema) {
        info("Creating task...");
        
        const schema = await parseSchema(options.outputSchema);
        const task = await apiPost<Task>("/v1/tasks", {
          name: options.name,
          description: options.description,
          query: options.query,
          outputSchema: schema,
        });
        
        success(`Task created: ${task.taskId}`);
        
        info("Getting quote...");
        const quoteCreate: QuoteCreate = { taskId: task.taskId };
        const quote = await apiPost<Quote>(`/v1/tasks/${task.taskId}/quotes`, quoteCreate);
        quoteId = quote.quoteId;
        
        console.log("");
        console.log(`Price: ${quote.price.value} ${quote.price.currency}`);
        console.log(`Expires: ${formatTimeRemaining(quote.expiresAt)}`);
        console.log("");
      }
      // Option 2: Use task-id to get quote
      else if (options.taskId) {
        info("Getting quote...");
        
        const quoteCreate: QuoteCreate = { taskId: options.taskId };
        const quote = await apiPost<Quote>(`/v1/tasks/${options.taskId}/quotes`, quoteCreate);
        quoteId = quote.quoteId;
        
        console.log("");
        console.log(`Price: ${quote.price.value} ${quote.price.currency}`);
        console.log(`Expires: ${formatTimeRemaining(quote.expiresAt)}`);
        console.log("");
      }
      // Option 3: Use existing quote
      // (quoteId already set)
      
      if (!quoteId) {
        error("Provide one of: (--name + --query + --output-schema), --task-id, or --quote-id");
        Deno.exit(1);
      }
      
      // Confirm
      const confirmed = options.yes || await Confirm.prompt("Proceed with execution?");
      if (!confirmed) {
        info("Execution cancelled");
        return;
      }
      
      // Execute
      info("Starting execution...");
      const executionCreate: ExecutionCreate = { quoteId };
      const execution = await apiPost<Execution>("/v1/searches", executionCreate);
      
      console.log("");
      success(`Execution started: ${execution.executionId}`);
      console.log("");
      
      if (options.wait) {
        info("Waiting for completion...");
        console.log("");
        const completed = await pollExecution(execution.executionId);
        console.log("");
        displayExecutionResult(completed, options.output);
      } else {
        console.log(`Status: ${statusBadge(execution.status)}`);
        console.log("");
        info(`Check: scopeos-cli executions get --execution-id ${execution.executionId}`);
      }
    } catch (err) {
      error(`Search failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });
