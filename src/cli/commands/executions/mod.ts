/**
 * Executions command group - Execution management
 */

import { Command } from "@cliffy/command";
import { getCommand } from "./get/mod.ts";

export const executionsCommand = new Command()
  .name("executions")
  .description("Execution management")
  .command("get", getCommand);
