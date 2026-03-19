/**
 * Wallet command group - EVM wallet management for x402 payments
 */

import { Command } from "@cliffy/command";
import { addCommand } from "./add/mod.ts";
import { listCommand } from "./list/mod.ts";
import { removeCommand } from "./remove/mod.ts";
import { activateCommand } from "./activate/mod.ts";

export const walletCommand = new Command()
  .name("wallet")
  .description("EVM wallet management for x402 payments")
  .command("add", addCommand)
  .command("list", listCommand)
  .command("remove", removeCommand)
  .command("activate", activateCommand);
