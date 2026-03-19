/**
 * x402 execution command group - execution management via SIWX auth
 */

import { Command } from "@cliffy/command";
import { getCommand } from "./get/mod.ts";

export const executionCommand = new Command()
  .name("execution")
  .description("x402 execution management (SIWX authenticated)")
  .command("get", getCommand);
