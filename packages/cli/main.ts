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
import { discoverCommand } from "./commands/discover/mod.ts";
import { inspectCommand } from "./commands/inspect/mod.ts";
import { runCommand } from "./commands/run/mod.ts";
import { runsCommand } from "./commands/runs/mod.ts";
import { x402Command } from "./commands/x402/mod.ts";

await new Command()
  .name("monid")
  .version(VERSION)
  .description("Monid CLI - Agentic payment platform for executing AI-powered data endpoints")
  
  // Register all commands
  .command("keys", keysCommand)
  .command("wallet", walletCommand)
  .command("discover", discoverCommand)
  .command("inspect", inspectCommand)
  .command("run", runCommand)
  .command("runs", runsCommand)
  .command("x402", x402Command)
  
  // Add shell completions command
  .command("completions", new CompletionsCommand())
  
  // Parse and execute
  .parse(Deno.args);
