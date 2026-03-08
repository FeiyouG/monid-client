#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env --allow-run

import { parseArgs } from "@std/cli/parse-args";
import { authCommand } from "./src/commands/auth.ts";
import { keysCommand } from "./src/commands/keys.ts";

const VERSION = "0.1.0";

function showHelp() {
  console.log(`
ScopeOS CLI v${VERSION}

Usage: scopeos-cli <command> [options]

Commands:
  auth login              Authenticate with OAuth provider
  auth logout             Clear local credentials
  auth whoami             Show current user and workspace info
  
  keys generate <label>   Generate and register a new key pair
  keys list               List all keys for current workspace
  keys activate <label>   Set the active key for signing requests
  keys delete <label>     Delete a local key
  keys rename <old> <new> Rename a key label
  keys revoke <label>     Revoke a key on the server
  
Options:
  --help, -h              Show this help message
  --version, -v           Show version information
  --verbose               Show detailed output
  --yes, -y               Skip confirmation prompts

Examples:
  scopeos-cli auth login
  scopeos-cli keys generate my-key
  scopeos-cli keys activate my-key
  scopeos-cli keys rename old-key new-key
  scopeos-cli keys revoke my-key
  scopeos-cli auth logout -y
`);
}

async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "version", "verbose", "yes"],
    string: ["label", "method", "data", "key", "header", "output"],
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
