/**
 * Searches command group - Search execution methods
 */

import { Command } from "@cliffy/command";
import { x402Command } from "./x402/mod.ts";

export const searchesCommand = new Command()
  .name("searches")
  .description("Search execution methods")
  .command("x402", x402Command);
