/**
 * Create task command - Create a new search task template
 */

import { Command } from "@cliffy/command";
import { Table, Column } from "@cliffy/table";
import type { Task } from "../../../../types/index.ts";
import { parseSchema } from "../../../shared/task-flags.ts";
import { success, error, info, prettyJson } from "../../../../utils/display.ts";
import type { TaskCreate } from "../../../../types/task.ts";
import { getCliCoreClient } from "../../../core-client.ts";

export const createCommand = new Command()
  .name("create")
  .description("Create a new search task template")
  .option("-n, --name <name:string>", "Task name", { required: true })
  .option("-d, --description <desc:string>", "Task description")
  .option("-q, --query <query:string>", "Search query", { required: true })
  .option("-s, --output-schema <schema:string>", "Output schema (file or JSON)", { required: true })
  .action(async (options) => {
    try {
      info("Creating task...");
      
      const outputSchema = await parseSchema(options.outputSchema);
      
      const taskCreate: TaskCreate = {
        name: options.name,
        description: options.description,
        query: options.query,
        outputSchema,
      };

      const task = await getCliCoreClient().tasks.create(taskCreate);
      
      console.log("");
      success("Task created successfully");
      console.log("");
      displayTask(task);
    } catch (err) {
      error(`Failed to create task: ${err instanceof Error ? err.message : String(err)}`);
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
