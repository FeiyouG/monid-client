#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env --allow-run

/**
 * ScopeOS CLI - Development Entry Point
 * 
 * This entrypoint is used for local development with `deno run` or `deno task dev`.
 * It uses environment-based configuration from @scopeos/core/config (which reads from .env).
 * 
 * For compiled binaries, use main.compile.ts which uses hardcoded generated config.
 */

import { Command } from "@cliffy/command";
import { CompletionsCommand } from "@cliffy/command/completions";
import { authCommand } from "./commands/auth/mod.ts";
import { keysCommand } from "./commands/keys/mod.ts";
import { tasksCommand } from "./commands/tasks/mod.ts";
import { quotesCommand } from "./commands/quotes/mod.ts";
import { searchCommand } from "./commands/search/mod.ts";
import { executionsCommand } from "./commands/executions/mod.ts";

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
