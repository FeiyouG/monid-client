/**
 * Get task command - Get task details by ID
 */

import { Command } from "@cliffy/command";
import { Table } from "@cliffy/table";
import type { Task } from "../../../../types/index.ts";
import { apiGet } from "../../../../lib/api-client.ts";
import { error, info, prettyJson } from "../../../../utils/display.ts";

export const getCommand = new Command()
  .name("get")
  .description("Get task details by ID")
  .option("-t, --task-id <id:string>", "Task ID", { required: true })
  .action(async (options: { taskId: string }) => {
    try {
      info("Fetching task...");
      
      const task = await apiGet<Task>(`/v1/tasks/${options.taskId}`);
      
      console.log("");
      displayTask(task);
    } catch (err) {
      error(`Failed to get task: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });

function displayTask(task: Task): void {
  new Table()
    .header(["Property", "Value"])
    .body([
      ["Task ID", task.taskId],
      ["Name", task.name],
      ["Description", task.description || "N/A"],
      ["Query", task.query],
      ["Workspace", task.workspaceId],
      ["Created", new Date(task.createdAt).toLocaleString()],
      ["Updated", new Date(task.updatedAt).toLocaleString()],
    ])
    .border(true)
    .render();
  
  console.log("");
  console.log("Output Schema:");
  console.log(prettyJson(task.outputSchema));
}
