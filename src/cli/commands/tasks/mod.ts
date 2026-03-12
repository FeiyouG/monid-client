/**
 * Tasks command group - Task management
 */

import { Command } from "@cliffy/command";
import { createCommand } from "./create/mod.ts";
import { listCommand } from "./list/mod.ts";
import { getCommand } from "./get/mod.ts";
import { updateCommand } from "./update/mod.ts";
import { deleteCommand } from "./delete/mod.ts";

export const tasksCommand = new Command()
  .name("tasks")
  .description("Task management")
  .command("create", createCommand)
  .command("list", listCommand)
  .command("get", getCommand)
  .command("update", updateCommand)
  .command("delete", deleteCommand);
