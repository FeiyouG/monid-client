/**
 * List executions command - List executions with optional pagination
 */

import { Command } from "@cliffy/command";
import { Column, Table } from "@cliffy/table";
import type { Execution, ExecutionsListResponse } from "../../../../types/index.ts";
import { apiGet } from "../../../../lib/api-client.ts";
import { error, info, statusBadge } from "../../../../utils/display.ts";

export const listCommand = new Command()
  .name("list")
  .description("List all executions with pagination")
  .option("-t, --task-id <id:string>", "Existing task ID", { required: true })
  .option("-l, --limit <n:number>", "Items per page", { default: 10 })
  .option("-c, --cursor <cursor:string>", "Pagination cursor")
  .action(async (options) => {
    try {
      info("Fetching executions...");

      let path = `/v1/tasks/${options.taskId}/executions?limit=${options.limit}`;
      if (options.cursor) {
        path += `&cursor=${encodeURIComponent(options.cursor)}`;
      }

      const response = await apiGet<Execution[] | ExecutionsListResponse>(path);
      const items = Array.isArray(response) ? response : response.items;
      const nextCursor = Array.isArray(response) ? null : response.cursor;

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
