/**
 * Get execution status and results
 * Includes optional polling and result saving
 */

import { Command } from "@cliffy/command";
import { Table, Column } from "@cliffy/table";
import type { Execution } from "../../../../types/index.ts";
import { success, error, info, prettyJson, statusBadge, formatTimeRemaining } from "../../../../utils/display.ts";
import { getCliCoreClient } from "../../../core-client.ts";

export const getCommand = new Command()
  .name("get")
  .description("Get execution status and results")
  .option("-e, --execution-id <id:string>", "Execution ID", { required: true })
  .option("-w, --wait [timeout:number]", "Wait for completion (optional timeout in seconds)")
  .option("-o, --output <file:string>", "Save results to file")
  .action(async (options: { executionId: string; wait?: boolean | number; output?: string }) => {
    try {
      info("Fetching execution...");

      if (options.wait !== undefined) {
        console.log("");
        info("Waiting for completion...");
        console.log("");
      }

      const execution = await getCliCoreClient().executions.getWithWait(
        options.executionId,
        options.wait,
      );
      
      console.log("");
      displayExecutionResult(execution, options.output);
    } catch (err) {
      error(`Failed to get execution: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });

/**
 * Display execution result with table and optional results output
 * Exported for use by search command as well
 */
export function displayExecutionResult(execution: Execution, outputFile?: string): void {
  const rows: [string, string][] = [
    ["Execution ID", execution.executionId],
    ["Task ID", execution.taskId],
    ["Quote ID", execution.quoteId],
    ["Status", statusBadge(execution.status)],
    ["Created", new Date(execution.createdAt).toLocaleString()],
  ];
  
  if (execution.startedAt) {
    rows.push(["Started", new Date(execution.startedAt).toLocaleString()]);
  }
  
  if (execution.completedAt) {
    rows.push(["Completed", new Date(execution.completedAt).toLocaleString()]);
  }
  
  if (execution.actualPrice) {
    rows.push(["Actual Price", `${execution.actualPrice.value} ${execution.actualPrice.currency}`]);
  }
  
  new Table()
    .header(["Property", "Value"])
    .body(rows)
    .columns([new Column().minWidth(10)])
    .border(false)
    .render();
  console.log("");
  
  if (execution.status === "FAILED") {
    error(`Execution failed: ${execution.error || "Unknown error"}`);
    return;
  }
  
  if (execution.status === "RUNNING" || execution.status === "READY") {
    info(`Execution is still ${execution.status.toLowerCase()}`);
    info(`Check: scopeos-cli executions get --execution-id ${execution.executionId}`);
    info(`Or wait: scopeos-cli executions get --execution-id ${execution.executionId} --wait`);
    return;
  }
  
  if (execution.status === "COMPLETED") {
    if (!execution.result) {
      info("Results expired (TTL: 24 hours). Re-run if needed.");
      return;
    }
    
    success("Execution completed successfully!");
    console.log("");
    console.log("Results:");
    console.log(prettyJson(execution.result.data));
    console.log("");
    
    if (execution.result.expiresAt) {
      info(`Results expire: ${formatTimeRemaining(execution.result.expiresAt)}`);
    }
    
    if (outputFile) {
      try {
        Deno.writeTextFileSync(outputFile, JSON.stringify(execution.result.data, null, 2));
        success(`Results saved to: ${outputFile}`);
      } catch (err) {
        error(`Failed to save results: ${err}`);
      }
    }
  }
}
