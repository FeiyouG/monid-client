/**
 * Get execution status and results
 * Includes optional polling and result saving
 */

import { Command } from "@cliffy/command";
import { Table } from "@cliffy/table";
import type { Execution } from "../../../../types/index.ts";
import { apiGet } from "../../../../lib/api-client.ts";
import { pollExecution } from "../../../../lib/polling.ts";
import { success, error, info, prettyJson, statusBadge, formatTimeRemaining } from "../../../../utils/display.ts";

export const getCommand = new Command()
  .name("get")
  .description("Get execution status and results")
  .option("-e, --execution-id <id:string>", "Execution ID", { required: true })
  .option("-w, --wait", "Wait for completion")
  .option("-o, --output <file:string>", "Save results to file")
  .action(async (options: { executionId: string; wait?: boolean; output?: string }) => {
    try {
      info("Fetching execution...");
      
      let execution = await apiGet<Execution>(`/v1/executions/${options.executionId}`);
      
      if (options.wait && !["COMPLETED", "FAILED"].includes(execution.status)) {
        console.log("");
        info("Waiting for completion...");
        console.log("");
        execution = await pollExecution(options.executionId);
      }
      
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
    .border(true)
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
