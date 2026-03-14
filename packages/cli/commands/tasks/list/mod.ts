/**
 * List tasks command - List all tasks with pagination
 */

import { Command } from "@cliffy/command";
import { Table, Column } from "@cliffy/table";
import type { Task } from "../../../../types/index.ts";
import { error, info } from "../../../../utils/display.ts";
import { getCliCoreClient } from "../../../core-client.ts";

export const listCommand = new Command()
  .name("list")
  .description("List all tasks with pagination")
  .option("-l, --limit <n:number>", "Items per page", { default: 10 })
  .option("-c, --cursor <cursor:string>", "Pagination cursor")
  .action(async (options: { limit: number; cursor?: string }) => {
    try {
      info("Fetching tasks...");
      
      const response = await getCliCoreClient().tasks.list({
        limit: options.limit,
        cursor: options.cursor,
      });
      
      if (response.items.length === 0) {
        console.log("");
        console.log("No tasks found. Create one with:");
        console.log("  scopeos-cli tasks create --name '...' --query '...' --output-schema schema.json");
        return;
      }
      
      const rows = response.items.map((task: Task) => [
        task.taskId,
        task.name.substring(0, 30) + (task.name.length > 30 ? "..." : ""),
        (task.description || "").substring(0, 40) + (task.description && task.description.length > 40 ? "..." : ""),
        new Date(task.createdAt).toLocaleDateString(),
      ]);
      
      console.log("");
      new Table()
        .header(["Task ID", "Name", "Description", "Created"])
        .body(rows)
        .columns([new Column().minWidth(10)])
        .border(false)
        .render();
      console.log("");
      
      if (response.cursor) {
        info(`More available. Use: --cursor ${response.cursor}`);
      }
    } catch (err) {
      error(`Failed to list tasks: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });
