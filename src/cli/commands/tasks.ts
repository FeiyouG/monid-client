/**
 * Tasks commands - migrated to Cliffy framework
 */

import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import type { Task, TaskCreate, TaskUpdate, TasksListResponse } from "../../types/index.ts";
import { parseSchema } from "../shared/task-flags.ts";
import { apiPost, apiGet, apiPatch, apiDelete } from "../../lib/api-client.ts";
import { success, error, info, table, box, prettyJson } from "../../utils/display.ts";

export const tasksCommand = new Command()
  .name("tasks")
  .description("Task management")
  
  .command("create", "Create a new search task template")
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
    })
  
  .command("list", "List all tasks with pagination")
    .option("-l, --limit <n:number>", "Items per page", { default: 10 })
    .option("-c, --cursor <cursor:string>", "Pagination cursor")
    .action(async (options: { limit: number; cursor?: string }) => {
      try {
        info("Fetching tasks...");
        
        let path = `/v1/tasks?limit=${options.limit}`;
        if (options.cursor) {
          path += `&cursor=${encodeURIComponent(options.cursor)}`;
        }
        
        const response = await apiGet<TasksListResponse>(path);
        
        if (response.items.length === 0) {
          console.log("");
          console.log("No tasks found. Create one with:");
          console.log("  scopeos-cli tasks create --name '...' --query '...' --output-schema schema.json");
          return;
        }
        
        const headers = ["TASK ID", "NAME", "DESCRIPTION", "CREATED"];
        const rows = response.items.map((task: Task) => [
          task.taskId,
          task.name.substring(0, 30) + (task.name.length > 30 ? "..." : ""),
          (task.description || "").substring(0, 40) + (task.description && task.description.length > 40 ? "..." : ""),
          new Date(task.createdAt).toLocaleDateString(),
        ]);
        
        console.log("");
        table(headers, rows);
        console.log("");
        
        if (response.cursor) {
          info(`More available. Use: --cursor ${response.cursor}`);
        }
      } catch (err) {
        error(`Failed to list tasks: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    })
  
  .command("get", "Get task details by ID")
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
    })
  
  .command("update", "Update an existing task")
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
        
        const task = await apiPatch<Task>(`/v1/tasks/${options.taskId}`, taskUpdate);
        
        console.log("");
        success("Task updated successfully");
        console.log("");
        displayTask(task);
      } catch (err) {
        error(`Failed to update task: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    })
  
  .command("delete", "Delete a task")
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
        
        await apiDelete(`/v1/tasks/${options.taskId}`);
        
        console.log("");
        success(`Task '${options.taskId}' deleted`);
        info("Existing executions have been preserved");
      } catch (err) {
        error(`Failed to delete task: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    });

function displayTask(task: Task): void {
  const basicInfo = [
    `Task ID:     ${task.taskId}`,
    `Name:        ${task.name}`,
    `Description: ${task.description || "N/A"}`,
    `Query:       ${task.query}`,
    `Workspace:   ${task.workspaceId}`,
    `Created:     ${new Date(task.createdAt).toLocaleString()}`,
    `Updated:     ${new Date(task.updatedAt).toLocaleString()}`,
    "",
    "Output Schema:",
    prettyJson(task.outputSchema),
  ];
  
  box(basicInfo.join("\n"));
}
