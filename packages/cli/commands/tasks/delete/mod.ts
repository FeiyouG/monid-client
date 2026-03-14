/**
 * Delete task command - Delete a task
 */

import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import { success, error, info } from "../../../../utils/display.ts";
import { getCliCoreClient } from "../../../core-client.ts";

export const deleteCommand = new Command()
  .name("delete")
  .description("Delete a task")
  .option("-t, --task-id <id:string>", "Task ID", { required: true })
  .option("-y, --yes", "Skip confirmation")
  .action(async (options: { taskId: string; yes?: boolean }) => {
    try {
      const confirmed = options.yes || await Confirm.prompt(
        `Delete task '${options.taskId}'? This cannot be undone (executions will be preserved).`
      );
      
      if (!confirmed) {
        info("Delete cancelled");
        return;
      }
      
      info("Deleting task...");
      
      await getCliCoreClient().tasks.delete(options.taskId);
      
      console.log("");
      success(`Task '${options.taskId}' deleted`);
      info("Existing executions have been preserved");
    } catch (err) {
      error(`Failed to delete task: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });
