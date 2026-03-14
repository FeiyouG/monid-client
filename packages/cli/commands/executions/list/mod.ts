/**
 * List executions command - List executions with optional pagination
 */

import { Command } from "@cliffy/command";
import { Column, Table } from "@cliffy/table";
import type { Execution } from "../../../../types/index.ts";
import { error, info, statusBadge } from "../../../../utils/display.ts";
import { getCliCoreClient } from "../../../core-client.ts";

export const listCommand = new Command()
  .name("list")
  .description("List all executions with pagination")
  .option("-t, --task-id <id:string>", "Existing task ID", { required: true })
  .option("-l, --limit <n:number>", "Items per page", { default: 10 })
  .option("-c, --cursor <cursor:string>", "Pagination cursor")
  .action(async (options) => {
    try {
      info("Fetching executions...");

      const response = await getCliCoreClient().executions.list({
        taskId: options.taskId,
        limit: options.limit,
        cursor: options.cursor,
      });
      const items = response.items;
      const nextCursor = response.cursor;

      if (items.length === 0) {
        console.log("");
        console.log("No executions found. Start one with:");
        console.log("  scopeos-cli search --task-id <task-id>");
        return;
      }

      const rows = items.map((execution: Execution) => [
        execution.executionId,
        execution.taskId,
        statusBadge(execution.status),
        new Date(execution.createdAt).toLocaleString(),
        execution.completedAt ? new Date(execution.completedAt).toLocaleString() : "-",
      ]);

      console.log("");
      new Table()
        .header(["Execution ID", "Task ID", "Status", "Created", "Completed"])
        .body(rows)
        .columns([new Column().minWidth(10)])
        .border(false)
        .render();
      console.log("");

      if (nextCursor) {
        info(`More available. Use: --cursor ${nextCursor}`);
      }
    } catch (err) {
      error(`Failed to list executions: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });
