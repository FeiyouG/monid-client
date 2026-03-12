/**
 * Create task command - Create a new search task template
 */

import { Command } from "@cliffy/command";
import { Table } from "@cliffy/table";
import type { Task } from "../../../../types/index.ts";
import { parseSchema } from "../../../shared/task-flags.ts";
import { apiPost } from "../../../../lib/api-client.ts";
import { success, error, info, prettyJson } from "../../../../utils/display.ts";

export const createCommand = new Command()
  .name("create")
  .description("Create a new search task template")
  .option("-n, --name <name:string>", "Task name", { required: true })
  .option("-d, --description <desc:string>", "Task description")
  .option("-q, --query <query:string>", "Search query", { required: true })
  .option("-s, --output-schema <schema:string>", "Output schema (file or JSON)", { required: true })
  .action(async (options: { name: string; description?: string; query: string; outputSchema: string }) => {
    try {
      info("Creating task...");
      
      const outputSchema = await parseSchema(options.outputSchema);
      
      const taskCreate: any = {
        name: options.name,
        description: options.description,
        query: options.query,
        outputSchema,
      };
      
      const task = await apiPost<Task>("/v1/tasks", taskCreate);
      
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
    .border(true)
    .render();
  
  console.log("");
  console.log("Output Schema:");
  console.log(prettyJson(task.outputSchema));
}
