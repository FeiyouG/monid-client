/**
 * Update task command - Update an existing task
 */

import { Command } from "@cliffy/command";
import { Table, Column } from "@cliffy/table";
import type { Task } from "../../../../types/index.ts";
import { parseSchema } from "../../../shared/task-flags.ts";
import { success, error, info, prettyJson } from "../../../../utils/display.ts";
import { getCliCoreClient } from "../../../core-client.ts";

export const updateCommand = new Command()
  .name("update")
  .description("Update an existing task")
  .option("-t, --task-id <id:string>", "Task ID", { required: true })
  .option("-n, --name <name:string>", "Task name")
  .option("-d, --description <desc:string>", "Task description")
  .option("-q, --query <query:string>", "Search query")
  .option("-s, --output-schema <schema:string>", "Output schema")
  .action(async (options: { taskId: string; name?: string; description?: string; query?: string; outputSchema?: string }) => {
    try {
      if (!options.name && !options.description && !options.query && !options.outputSchema) {
        error("Please provide at least one field to update");
        console.log("Available: --name, --description, --query, --output-schema");
        Deno.exit(1);
      }
      
      info("Updating task...");
      
      const taskUpdate: any = {};
      if (options.name) taskUpdate.name = options.name;
      if (options.description) taskUpdate.description = options.description;
      if (options.query) taskUpdate.query = options.query;
      if (options.outputSchema) taskUpdate.outputSchema = await parseSchema(options.outputSchema);
      
      const task = await getCliCoreClient().tasks.update(options.taskId, taskUpdate);
      
      console.log("");
      success("Task updated successfully");
      console.log("");
      displayTask(task);
    } catch (err) {
      error(`Failed to update task: ${err instanceof Error ? err.message : String(err)}`);
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
    .columns([new Column().minWidth(10)])
    .border(false)
    .render();
  
  console.log("");
  console.log("Output Schema:");
  console.log(prettyJson(task.outputSchema));
}
