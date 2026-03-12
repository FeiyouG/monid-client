#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env --allow-run

/**
 * ScopeOS CLI - Main Entry Point
 * Migrated to Cliffy framework for better command structure and type safety
 */

import { Command } from "@cliffy/command";
import { CompletionsCommand } from "@cliffy/command/completions";
import { authCommand } from "./src/cli/commands/auth/mod.ts";
import { keysCommand } from "./src/cli/commands/keys/mod.ts";
import { tasksCommand } from "./src/cli/commands/tasks/mod.ts";
import { quotesCommand } from "./src/cli/commands/quotes/mod.ts";
import { searchCommand } from "./src/cli/commands/search/mod.ts";
import { executionsCommand } from "./src/cli/commands/executions/mod.ts";

const VERSION = "0.1.0";

await new Command()
  .name("scopeos-cli")
  .version(VERSION)
  .description("ScopeOS CLI - Agentic payment platform for executing AI-powered searches")
  
  // Register all commands
  .command("auth", authCommand)
  .command("keys", keysCommand)
  .command("tasks", tasksCommand)
  .command("quotes", quotesCommand)
  .command("search", searchCommand)
  .command("executions", executionsCommand)
  
  // Add shell completions command
  .command("completions", new CompletionsCommand())
  
  // Parse and execute
  .parse(Deno.args);
