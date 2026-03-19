#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env --allow-run

/**
 * Monid CLI - Compile Entry Point
 * 
 * This entrypoint is used for compiling binaries with `deno compile`.
 * It uses generated.ts (hardcoded config values from build time).
 * 
 * The VERSION is set during config generation via VERSION environment variable.
 */

import { Command } from "@cliffy/command";
import { CompletionsCommand } from "@cliffy/command/completions";
import { VERSION } from "@monid/core";

// Import commands - they will use hardcoded config in compiled binary
import { authCommand } from "./commands/auth/mod.ts";
import { keysCommand } from "./commands/keys/mod.ts";
import { walletCommand } from "./commands/wallet/mod.ts";
import { tasksCommand } from "./commands/tasks/mod.ts";
import { quotesCommand } from "./commands/quotes/mod.ts";
import { searchCommand } from "./commands/search/mod.ts";
import { x402Command } from "./commands/x402/mod.ts";
import { executionsCommand } from "./commands/executions/mod.ts";

await new Command()
  .name("monid")
  .version(VERSION)
  .description("Monid CLI - Agentic payment platform for executing AI-powered searches")
  
  // Register all commands
  .command("auth", authCommand)
  .command("keys", keysCommand)
  .command("wallet", walletCommand)
  .command("tasks", tasksCommand)
  .command("quotes", quotesCommand)
  .command("search", searchCommand)
  .command("x402", x402Command)
  .command("executions", executionsCommand)
  
  // Add shell completions command
  .command("completions", new CompletionsCommand())
  
  // Parse and execute
  .parse(Deno.args);
