/**
 * Executions command group - Execution management
 */

import { Command } from "@cliffy/command";
import { getCommand } from "./get/mod.ts";
import { listCommand } from "./list/mod.ts";

export const executionsCommand = new Command()
  .name("executions")
  .description("Execution management")
  .command("list", listCommand)
  .command("get", getCommand);
