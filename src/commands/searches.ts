/**
 * Searches commands: execute searches and manage executions
 */

import type { ParsedArgs, Task, Quote, Execution, ExecutionCreate, JSONSchema, TaskCapability, QuoteCreate } from "../types/index.ts";
import { apiGet, apiPost } from "../lib/api-client.ts";
import { pollExecution } from "../lib/polling.ts";
import { success, error, info, box, confirm, prettyJson, statusBadge, formatTimeRemaining } from "../utils/display.ts";
import { exists } from "@std/fs";

export async function searchesCommand(subcommand: string, args: ParsedArgs): Promise<void> {
  // Special case: if subcommand looks like a query (not a known subcommand), treat as search
  if (subcommand && !["check", "run"].includes(subcommand)) {
    // Reconstruct the full query from all arguments
    const query = [subcommand, ...(args._.slice(2) as string[])].join(" ");
    await searchesRun(query, args);
  } else {
    switch (subcommand) {
      case "run":
        {
          const query = (args._.slice(2) as string[]).join(" ");
          await searchesRun(query, args);
        }
        break;
      case "check":
        await searchesCheck(args);
        break;
      default:
        console.error(`Unknown searches subcommand: ${subcommand}`);
        console.log("Available: <query>, run <query>, check <executionId>");
        Deno.exit(1);
    }
  }
}

export async function executionCommand(subcommand: string, args: ParsedArgs): Promise<void> {
  switch (subcommand) {
    case "get":
      await executionGet(args);
      break;
    default:
      console.error(`Unknown execution subcommand: ${subcommand}`);
      console.log("Available: get <executionId>");
      Deno.exit(1);
  }
}

/**
 * Main search command: creates task, gets quote, executes search
 */
async function searchesRun(query: string, args: ParsedArgs): Promise<void> {
  try {
    if (!query || query.trim() === "") {
      error("Please provide a search query");
      console.log("Example: scopeos-cli searches 'Find information about Acme Corp' --wait");
      Deno.exit(1);
    }

    const outputSchemaArg = args.outputSchema as string | undefined;
    const shouldWait = args.wait as boolean || false;
    const outputFile = args.output as string | undefined;

    // Step 1: Create a temporary task
    info("Creating search task...");

    const outputSchema = outputSchemaArg 
      ? await parseSchemaInput(outputSchemaArg)
      : createDefaultOutputSchema();

    const taskCreate = {
      title: query.substring(0, 50) + (query.length > 50 ? "..." : ""),
      description: query,
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" }
        },
        required: ["query"]
      } as JSONSchema,
      outputSchema,
      capabilities: getDefaultCapabilities(),
    };

    const task = await apiPost<Task>("/v1/tasks", taskCreate);
    success(`Task created: ${task.taskId}`);

    // Step 2: Get quote
    info("Getting price quote...");

    const quoteCreate: QuoteCreate = {
      input: { query },
    };

    const quote = await apiPost<Quote>(`/v1/tasks/${task.taskId}/quotes`, quoteCreate);
    
    console.log("");
    console.log(`Estimated price: ${quote.estimatedPrice.amount} ${quote.estimatedPrice.currency}`);
    console.log(`Quote expires: ${formatTimeRemaining(quote.expiresAt)}`);
    console.log("");

    // Ask for confirmation
    const confirmed = await confirm(
      `Proceed with execution?`,
      args.yes as boolean || false
    );

    if (!confirmed) {
      info("Execution cancelled");
      console.log("");
      info(`Task ID: ${task.taskId}`);
      info(`Quote ID: ${quote.quoteId}`);
      console.log("");
      return;
    }

    // Step 3: Execute search
    info("Starting search execution...");

    const executionCreate: ExecutionCreate = {
      quoteId: quote.quoteId,
    };

    const execution = await apiPost<Execution>("/v1/searches", executionCreate);
    
    console.log("");
    success(`Execution started: ${execution.executionId}`);
    console.log("");

    // Step 4: Wait or return immediately
    if (shouldWait) {
      info("Waiting for completion...");
      console.log("");

      const completedExecution = await pollExecution(execution.executionId);

      console.log("");
      displayExecutionResult(completedExecution, outputFile);
    } else {
      console.log(`Status: ${statusBadge(execution.status)}`);
      console.log("");
      info(`Check status with: scopeos-cli searches check ${execution.executionId}`);
      info(`Or wait for completion: scopeos-cli execution get ${execution.executionId} --wait`);
      console.log("");
    }

  } catch (err) {
    error(`Search failed: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

/**
 * Check execution status (alias for execution get)
 */
async function searchesCheck(args: ParsedArgs): Promise<void> {
  const executionId = args._[2] as string | undefined;

  if (!executionId) {
    error("Please provide an execution ID");
    console.log("Example: scopeos-cli searches check 01JBXZ...");
    Deno.exit(1);
  }

  // Reuse execution get logic
  await executionGet(args);
}

/**
 * Get execution status and results
 */
async function executionGet(args: ParsedArgs): Promise<void> {
  try {
    const executionId = args._[2] as string | undefined;
    const outputFile = args.output as string | undefined;
    const shouldWait = args.wait as boolean || false;

    if (!executionId) {
      error("Please provide an execution ID");
      console.log("Example: scopeos-cli execution get 01JBXZ...");
      Deno.exit(1);
    }

    info("Fetching execution status...");

    let execution = await apiGet<Execution>(`/v1/executions/${executionId}`);

    // If wait flag and not completed, poll until completion
    if (shouldWait && execution.status !== "COMPLETED" && execution.status !== "FAILED") {
      console.log("");
      info("Waiting for completion...");
      console.log("");
      execution = await pollExecution(executionId);
    }

    console.log("");
    displayExecutionResult(execution, outputFile);

  } catch (err) {
    error(`Failed to get execution: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

/**
 * Display execution result based on status
 */
function displayExecutionResult(execution: Execution, outputFile?: string): void {
  // Display basic metadata
  const metadata = [
    `Execution ID: ${execution.executionId}`,
    `Task ID:      ${execution.taskId}`,
    `Quote ID:     ${execution.quoteId}`,
    `Status:       ${statusBadge(execution.status)}`,
    `Created:      ${new Date(execution.createdAt).toLocaleString()}`,
  ];

  if (execution.startedAt) {
    metadata.push(`Started:      ${new Date(execution.startedAt).toLocaleString()}`);
  }

  if (execution.completedAt) {
    metadata.push(`Completed:    ${new Date(execution.completedAt).toLocaleString()}`);
  }

  if (execution.actualPrice) {
    metadata.push(`Actual Price: ${execution.actualPrice.amount} ${execution.actualPrice.currency}`);
  }

  box(metadata.join("\n"));
  console.log("");

  // Handle different statuses
  if (execution.status === "FAILED") {
    error(`Execution failed: ${execution.error || "Unknown error"}`);
    console.log("");
    return;
  }

  if (execution.status === "RUNNING" || execution.status === "READY") {
    info(`Execution is still ${execution.status.toLowerCase()}`);
    info(`Check again with: scopeos-cli execution get ${execution.executionId}`);
    info(`Or wait for completion: scopeos-cli execution get ${execution.executionId} --wait`);
    console.log("");
    return;
  }

  if (execution.status === "COMPLETED") {
    if (!execution.result) {
      info("Execution completed, but results have expired (TTL: 24 hours)");
      info("Re-run the search if you need the results again");
      console.log("");
      return;
    }

    // Display results
    success("Execution completed successfully!");
    console.log("");
    console.log("Results:");
    console.log(prettyJson(execution.result.data));
    console.log("");

    if (execution.result.expiresAt) {
      info(`Results expire: ${formatTimeRemaining(execution.result.expiresAt)}`);
    }

    // Save to file if requested
    if (outputFile) {
      saveResultsToFile(execution.result.data, outputFile);
    }

    console.log("");
  }
}

/**
 * Save results to a file
 */
function saveResultsToFile(data: Record<string, unknown>, filePath: string): void {
  try {
    const json = JSON.stringify(data, null, 2);
    Deno.writeTextFileSync(filePath, json);
    success(`Results saved to: ${filePath}`);
  } catch (err) {
    error(`Failed to save results: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Parse schema input from JSON string or file path
 */
async function parseSchemaInput(input: string): Promise<JSONSchema> {
  try {
    // Check if input is a file path
    if (await exists(input)) {
      const content = await Deno.readTextFile(input);
      return JSON.parse(content) as JSONSchema;
    }

    // Otherwise, parse as JSON string
    return JSON.parse(input) as JSONSchema;
  } catch (err) {
    throw new Error(`Invalid schema: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Create a default output schema for generic search results
 */
function createDefaultOutputSchema(): JSONSchema {
  return {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            url: { type: "string" },
            metadata: { type: "object" },
          },
        },
      },
      summary: { type: "string" },
      metadata: { type: "object" },
    },
  };
}

/**
 * Get default capabilities configuration
 * TODO: Make this configurable via config file
 */
function getDefaultCapabilities(): TaskCapability[] {
  return [
    {
      capabilityId: "apify.actor.website-scraper",
      prepareInput: {
        startUrls: "{{input.query}}",
        maxDepth: 2,
        maxPages: 10,
      },
    },
  ];
}
