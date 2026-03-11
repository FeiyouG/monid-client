#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env --allow-run

import { parseArgs } from "@std/cli/parse-args";
import { authCommand } from "./src/commands/auth.ts";
import { keysCommand } from "./src/commands/keys.ts";
import { tasksCommand } from "./src/commands/tasks.ts";
import { quotesCommand } from "./src/commands/quotes.ts";
import { searchesCommand, executionCommand } from "./src/commands/searches.ts";

const VERSION = "0.1.0";

function showHelp() {
  console.log(`
ScopeOS CLI v${VERSION}

Usage: scopeos-cli <command> [options]

Commands:
  Authentication:
    auth login              Authenticate with OAuth provider
    auth logout             Clear local credentials
    auth whoami             Show current user and workspace info
  
  API Keys:
    keys generate <label>   Generate and register a new key pair
    keys list               List all keys for current workspace
    keys activate <label>   Set the active key for signing requests
    keys delete <label>     Delete a local key
    keys rename <old> <new> Rename a key label
    keys revoke <label>     Revoke a key on the server
  
  Tasks:
    tasks create            Create a new search task template
    tasks list              List all tasks with pagination
    tasks get <taskId>      Get task details by ID
    tasks update <taskId>   Update an existing task
    tasks delete <taskId>   Delete a task (preserves executions)
  
  Quotes:
    quotes create <taskId>  Get price quote for task execution
  
  Searches:
    searches <query>        Execute a search with natural language query
    searches check <execId> Check execution status and get results
  
  Executions:
    execution get <execId>  Get execution status and results
  
Options:
  --help, -h              Show this help message
  --version, -v           Show version information
  --verbose               Show detailed output
  --yes, -y               Skip confirmation prompts
  --wait                  Wait for search execution to complete (searches)
  --output <file>         Save results to file (searches/execution)
  --output-schema <json>  Specify output schema (searches)
  --limit <n>             Items per page (tasks list, default: 10)
  --cursor <cursor>       Pagination cursor (tasks list)

Examples:
  # Authentication
  scopeos-cli auth login
  scopeos-cli keys generate my-key
  
  # Tasks
  scopeos-cli tasks create --title "Research" --description "Company research" \\
    --input-schema schema.json --output-schema output.json --capabilities caps.json
  scopeos-cli tasks list --limit 20
  scopeos-cli tasks get 01JBXX...
  scopeos-cli tasks update 01JBXX... --title "New Title"
  scopeos-cli tasks delete 01JBXX... -y
  
  # Quotes
  scopeos-cli quotes create 01JBXX... --input '{"company":"Acme Corp"}'
  scopeos-cli quotes create 01JBXX... --input input.json
  
  # Searches
  scopeos-cli searches "Find information about Acme Corp" --wait --output results.json
  scopeos-cli searches "Company research query" --output-schema schema.json
  scopeos-cli searches check 01JBXZ...
  
  # Executions
  scopeos-cli execution get 01JBXZ... --output results.json
  scopeos-cli execution get 01JBXZ... --wait
`);
}

async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "version", "verbose", "yes", "wait"],
    string: ["label", "method", "data", "key", "header", "output", "outputSchema", "inputSchema", "capabilities", "input", "cursor", "title", "description", "limit"],
    collect: ["header"],
    alias: {
      h: "help",
      v: "version",
      y: "yes",
    },
  });

  if (args.help) {
    showHelp();
    Deno.exit(0);
  }

  if (args.version) {
    console.log(`scopeos-cli v${VERSION}`);
    Deno.exit(0);
  }

  const [command, subcommand, ...rest] = args._;

  try {
    if (command === "auth") {
      await authCommand(subcommand as string, args);
    } else if (command === "keys") {
      await keysCommand(subcommand as string, args);
    } else if (command === "tasks") {
      await tasksCommand(subcommand as string, args);
    } else if (command === "quotes") {
      await quotesCommand(subcommand as string, args);
    } else if (command === "searches") {
      await searchesCommand(subcommand as string, args);
    } else if (command === "execution") {
      await executionCommand(subcommand as string, args);
    } else {
      console.error(`Unknown command: ${command}`);
      console.log("Run 'scopeos-cli --help' for usage information");
      Deno.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    if (args.verbose) {
      console.error(error);
    }
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
