#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env --allow-run

/**
 * Monid CLI - Development Entry Point
 * 
 * This entrypoint is used for local development with `deno run`.
 * It uses generated configuration from @monid/core/config (created by config:gen:local).
 * 
 * For compiled binaries, use main.compile.ts which uses the same generated config.
 */

import { Command } from "@cliffy/command";
import { CompletionsCommand } from "@cliffy/command/completions";
import { VERSION } from "@monid/core";
import { keysCommand } from "./commands/keys/mod.ts";
import { walletCommand } from "./commands/wallet/mod.ts";
import { tasksCommand } from "./commands/tasks/mod.ts";
import { quotesCommand } from "./commands/quotes/mod.ts";
import { searchCommand } from "./commands/search/mod.ts";
import { searchesCommand } from "./commands/searches/mod.ts";
import { executionsCommand } from "./commands/executions/mod.ts";

await new Command()
  .name("monid")
  .version(VERSION)
  .description("Monid CLI - Agentic payment platform for executing AI-powered searches")
  
  // Register all commands
  // .command("auth", authCommand)
  .command("keys", keysCommand)
  .command("wallet", walletCommand)
  .command("tasks", tasksCommand)
  .command("quotes", quotesCommand)
  .command("search", searchCommand)
  .command("searches", searchesCommand)
  .command("executions", executionsCommand)
  
  // Add shell completions command
  .command("completions", new CompletionsCommand())
  
  // Parse and execute
  .parse(Deno.args);
