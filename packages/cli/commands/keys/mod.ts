/**
 * Keys command group - API key management
 */

import { Command } from "@cliffy/command";
import { generateCommand } from "./generate/mod.ts";
import { listCommand } from "./list/mod.ts";
import { activateCommand } from "./activate/mod.ts";
import { deleteCommand } from "./delete/mod.ts";
import { renameCommand } from "./rename/mod.ts";
import { revokeCommand } from "./revoke/mod.ts";

export const keysCommand = new Command()
  .name("keys")
  .description("API key management")
  .command("generate", generateCommand)
  .command("list", listCommand)
  .command("activate", activateCommand)
  .command("delete", deleteCommand)
  .command("rename", renameCommand)
  .command("revoke", revokeCommand);
