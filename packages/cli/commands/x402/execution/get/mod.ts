/**
 * x402 execution get command
 * Fetches execution status using SIWX authentication (wallet ownership proof).
 * With --wait, polls until the execution reaches a terminal state.
 */

import { Command } from "@cliffy/command";
import {
  fetchX402Execution,
  getActiveWalletAddress,
  pollX402Execution,
  type X402Execution,
} from "../../../../../lib/x402-client.ts";
import {
  error,
  info,
  success,
  prettyJson,
  statusBadge,
} from "../../../../../utils/display.ts";

export const getCommand = new Command()
  .name("get")
  .description("Get x402 execution status and results (SIWX authenticated)")
  .option("-e, --execution-id <id:string>", "Execution ID", { required: true })
  .option("-w, --wait [timeout:number]", "Wait for completion (optional timeout in seconds)")
  .option("-o, --output <file:string>", "Save results to file")
  .action(async (options: { executionId: string; wait?: boolean | number; output?: string }) => {
    try {
      // Validate wallet is configured (needed for SIWX signing)
      try {
        await getActiveWalletAddress();
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        Deno.exit(1);
      }

      info("Fetching execution (SIWX authenticated)...");

      let execution: X402Execution;
      try {
        execution = await fetchX402Execution(options.executionId);
      } catch (err) {
        error(`Failed to fetch execution: ${err instanceof Error ? err.message : String(err)}`);
        Deno.exit(1);
      }

      // If --wait and not yet terminal, poll
      if (
        options.wait !== undefined &&
        execution.status !== "COMPLETED" &&
        execution.status !== "FAILED"
      ) {
        console.log("");
        info("Waiting for completion...");
        console.log("");

        const timeoutMs = parseWaitTimeout(options.wait);
        try {
          execution = await pollX402Execution(
            options.executionId,
            timeoutMs ? { timeoutSeconds: timeoutMs / 1000 } : {},
          );
        } catch (err) {
          if (err instanceof Error && err.message.includes("Polling timeout")) {
            error(err.message);
            info(`Try again: monid x402 execution get --execution-id ${options.executionId} --wait`);
            Deno.exit(1);
          }
          throw err;
        }
      }

      console.log("");
      displayX402ExecutionResult(execution, options.output);
    } catch (err) {
      error(`Failed to get execution: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });

/**
 * Parse the --wait flag value into milliseconds.
 */
function parseWaitTimeout(wait: boolean | number | undefined): number | undefined {
  if (wait === undefined || wait === true) {
    return undefined;
  }
  if (typeof wait === "number" && Number.isFinite(wait) && wait > 0) {
    return wait * 1000;
  }
  return undefined;
}

/**
 * Display x402 execution result with status and output.
 * Exported for use by the x402 search command as well.
 */
export function displayX402ExecutionResult(execution: X402Execution, outputFile?: string): void {
  console.log(`Execution ID: ${execution.executionId}`);
  console.log(`Status:       ${statusBadge(execution.status)}`);
  console.log("");

  if (execution.status === "FAILED") {
    error(`Execution failed: ${execution.error || "Unknown error"}`);
    return;
  }

  if (execution.status === "COMPLETED") {
    if (execution.output === undefined || execution.output === null) {
      info("No output available.");
      return;
    }

    success("Execution completed successfully!");
    console.log("");
    console.log("Output:");
    console.log(prettyJson(execution.output));
    console.log("");

    if (outputFile) {
      try {
        const content = typeof execution.output === "string"
          ? execution.output
          : JSON.stringify(execution.output, null, 2);
        Deno.writeTextFileSync(outputFile, content);
        success(`Output saved to: ${outputFile}`);
      } catch (err) {
        error(`Failed to save output: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return;
  }

  // Still running
  info(`Execution is ${execution.status.toLowerCase()}`);
  info(`Check: monid x402 execution get --execution-id ${execution.executionId}`);
  info(`Wait:  monid x402 execution get --execution-id ${execution.executionId} --wait`);
}
