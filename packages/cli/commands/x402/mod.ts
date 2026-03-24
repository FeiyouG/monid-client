/**
 * x402 command group - x402 protocol operations (crypto payments)
 */

import { Command } from "@cliffy/command";
import { x402RunCommand } from "./run/mod.ts";
import { x402RunsCommand } from "./runs/mod.ts";

export const x402Command = new Command()
  .name("x402")
  .description("x402 protocol operations (crypto payments)")
  .command("run", x402RunCommand)
  .command("runs", x402RunsCommand);
