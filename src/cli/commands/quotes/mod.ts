/**
 * Quotes command group - Price quote management
 */

import { Command } from "@cliffy/command";
import { getCommand } from "./get/mod.ts";

export const quotesCommand = new Command()
  .name("quotes")
  .description("Price quote management")
  .command("get", getCommand);
