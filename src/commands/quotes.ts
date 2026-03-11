/**
 * Quotes commands: create
 */

import type { ParsedArgs, Quote, QuoteCreate } from "../types/index.ts";
import { apiPost } from "../lib/api-client.ts";
import { success, error, info, box, table, prettyJson, formatTimeRemaining } from "../utils/display.ts";
import { exists } from "@std/fs";

export async function quotesCommand(subcommand: string, args: ParsedArgs): Promise<void> {
  switch (subcommand) {
    case "create":
      await quotesCreate(args);
      break;
    default:
      console.error(`Unknown quotes subcommand: ${subcommand}`);
      console.log("Available: create");
      Deno.exit(1);
  }
}

async function quotesCreate(args: ParsedArgs): Promise<void> {
  try {
    const taskId = args._[2] as string | undefined;
    const inputArg = args.input as string | undefined;

    if (!taskId) {
      error("Please provide a task ID");
      console.log("Example: scopeos-cli quotes create 01JBXX... --input '{\"query\":\"Acme Corp\"}'");
      Deno.exit(1);
    }

    if (!inputArg) {
      error("Please provide input data");
      console.log("Example: scopeos-cli quotes create 01JBXX... --input '{\"query\":\"Acme Corp\"}'");
      console.log("Or from file: scopeos-cli quotes create 01JBXX... --input input.json");
      Deno.exit(1);
    }

    info("Creating quote...");

    // Parse input data
    const inputData = await parseInputData(inputArg);

    // Create quote
    const quoteCreate: QuoteCreate = {
      input: inputData,
    };

    const quote = await apiPost<Quote>(`/v1/tasks/${taskId}/quotes`, quoteCreate);

    console.log("");
    success("Quote created successfully");
    console.log("");
    displayQuote(quote);

    // Show next step
    console.log("");
    info(`Execute search with: scopeos-cli searches run --quote-id ${quote.quoteId}`);
    console.log("");

  } catch (err) {
    error(`Failed to create quote: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

/**
 * Parse input data from JSON string or file path
 */
async function parseInputData(input: string): Promise<Record<string, unknown>> {
  try {
    // Check if input is a file path
    if (await exists(input)) {
      const content = await Deno.readTextFile(input);
      return JSON.parse(content) as Record<string, unknown>;
    }

    // Otherwise, parse as JSON string
    return JSON.parse(input) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`Invalid input data: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Display quote details in formatted box
 */
function displayQuote(quote: Quote): void {
  const basicInfo = [
    `Quote ID:        ${quote.quoteId}`,
    `Task ID:         ${quote.taskId}`,
    `Estimated Price: ${quote.estimatedPrice.amount} ${quote.estimatedPrice.currency}`,
    `Created:         ${new Date(quote.createdAt).toLocaleString()}`,
    `Expiry:          ${formatTimeRemaining(quote.expiresAt)}`,
  ].join("\n");

  box(basicInfo);

  // Display per-capability breakdown
  if (quote.capabilities.length > 0) {
    console.log("");
    console.log("Capability Breakdown:");
    console.log("");

    const headers = ["CAPABILITY ID", "PRICE"];
    const rows = quote.capabilities.map(cap => [
      cap.capabilityId,
      `${cap.estimatedPrice.amount} ${cap.estimatedPrice.currency}`,
    ]);

    table(headers, rows);
  }
}
