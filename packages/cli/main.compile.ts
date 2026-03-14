#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env --allow-run

/**
 * ScopeOS CLI - Compile Entry Point
 * 
 * This entrypoint is used for compiling binaries with `deno compile`.
 * It imports from the same command modules but the config system will use
 * generated.ts (hardcoded values) instead of dev.ts (env-based values).
 * 
 * The difference is that packages imported by this file will resolve config
 * from @scopeos/core/config/generated when the dependency graph is built.
 */

import { Command } from "@cliffy/command";
import { CompletionsCommand } from "@cliffy/command/completions";

// Import commands - they will use hardcoded config in compiled binary
import { authCommand } from "./commands/auth/mod.ts";
import { keysCommand } from "./commands/keys/mod.ts";
import { tasksCommand } from "./commands/tasks/mod.ts";
import { quotesCommand } from "./commands/quotes/mod.ts";
import { searchCommand } from "./commands/search/mod.ts";
import { executionsCommand } from "./commands/executions/mod.ts";

// Note: Commands will import config which resolves to generated.ts in compiled binary
// We don't need to explicitly import it here, but it's available via @scopeos/core

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
