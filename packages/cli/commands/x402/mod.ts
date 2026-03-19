/**
 * x402 command group - x402 protocol operations (crypto payments)
 */

import { Command } from "@cliffy/command";
import { x402Command as searchCommand } from "./search/mod.ts";

export const x402Command = new Command()
  .name("x402")
  .description("x402 protocol operations (crypto payments)")
  .command("search", searchCommand);
