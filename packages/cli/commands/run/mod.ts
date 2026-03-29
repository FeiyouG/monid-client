/**
 * monid run — Start an async execution
 */

import { Command } from "@cliffy/command";
import { getCliCoreClient } from "../../core-client.ts";
import { parseInput } from "../../shared/input-parser.ts";
import { formatCost } from "../../../types/api.ts";
import type { RunResponse } from "../../../types/api.ts";
import {
  error,
  info,
  LABELS,
  prettyJson,
  progressSpinner,
  statusBadge,
  success,
} from "../../../utils/display.ts";

export const runCommand = new Command()
  .name("run")
  .description("Start an async execution of a data endpoint")
  .option("-p, --provider <provider:string>", "Provider name", {
    required: true,
  })
  .option("-e, --endpoint <endpoint:string>", "Endpoint path", {
    required: true,
  })
  .option(
    "-i, --input <input:string>",
    "Input parameters (JSON string or @path/to/file.json)",
    { required: true },
  )
  .option(
    "-w, --wait [timeout:number]",
    "Wait for completion (optional timeout in seconds)",
  )
  .option("-o, --output <file:string>", "Save results to file")
  .action(
    async (options: {
      provider: string;
      endpoint: string;
      input: string;
      wait?: boolean | number;
      output?: string;
    }) => {
      try {
        // Parse input
        const input = await parseInput(options.input);

        const client = getCliCoreClient();

        info(
          `Starting run: ${options.provider}${options.endpoint}`,
        );

        // POST /v1/run — always returns immediately (202)
        const run = await client.runs.start({
          provider: options.provider,
          endpoint: options.endpoint,
          input,
        });

        console.log("");
        success(`Run started: ${run.runId}`);
        console.log(`  ${LABELS.STATUS}  ${statusBadge(run.status)}`);
        console.log(`  ${LABELS.COST}    ${run.cost ? formatCost(run.cost) : "pending"}`);
        console.log("");

        // If --wait, long-poll until terminal status
        if (options.wait !== undefined) {
          const timeoutSec =
            typeof options.wait === "number" && options.wait > 0
              ? options.wait
              : undefined;

          const spinner = progressSpinner("Waiting for completion...");
          let finalRun: RunResponse;
          try {
            finalRun = await client.runs.waitForCompletion(
              run.runId,
              timeoutSec,
            );
            spinner.stop();
          } catch (err) {
            spinner.stop();
            if (
              err instanceof Error &&
              err.message.includes("Timeout")
            ) {
              error(err.message);
              info(
                `Check later: monid runs get --run-id ${run.runId}`,
              );
              return;
            }
            throw err;
          }

          displayRunResult(finalRun, options.output);
        } else {
          info(
            `Check status: monid runs get --run-id ${run.runId}`,
          );
          info(
            `Wait for results: monid runs get --run-id ${run.runId} --wait`,
          );
        }
      } catch (err) {
        error(
          `Run failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        throw err;
      }
    },
  );

/**
 * Display a completed/failed run result.
 * Exported for reuse by `runs get` and x402 commands.
 */
export function displayRunResult(
  run: RunResponse,
  outputFile?: string,
): void {
  console.log(`  ${LABELS.RUN_ID}   ${run.runId}`);
  console.log(`  ${LABELS.STATUS}   ${statusBadge(run.status)}`);
  console.log(`  ${LABELS.COST}     ${run.cost ? formatCost(run.cost) : "pending"}`);
  if (run.createdAt) {
    console.log(`  ${LABELS.CREATED}  ${new Date(run.createdAt).toLocaleString()}`);
  }
  if (run.startedAt) {
    console.log(`  ${LABELS.STARTED}  ${new Date(run.startedAt).toLocaleString()}`);
  }
  if (run.completedAt) {
    console.log(
      `  ${LABELS.DONE}     ${new Date(run.completedAt).toLocaleString()}`,
    );
  }
  console.log("");

  if (run.status === "FAILED") {
    const errMsg = run.error
      ? `[${run.error.source}] ${run.error.message}${run.error.code ? ` (${run.error.code})` : ""}`
      : "Unknown error";
    error(`Run failed: ${errMsg}`);
    return;
  }

  if (run.status === "COMPLETED") {
    if (run.output === undefined || run.output === null) {
      info("No output available.");
      return;
    }

    success("Run completed successfully!");
    console.log("");
    console.log("Output:");
    console.log(prettyJson(run.output));
    console.log("");

    if (outputFile) {
      try {
        const content =
          typeof run.output === "string"
            ? run.output
            : JSON.stringify(run.output, null, 2);
        Deno.writeTextFileSync(outputFile, content);
        success(`Output saved to: ${outputFile}`);
      } catch (err) {
        error(
          `Failed to save output: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return;
  }

  // Still running
  info(`Run is ${run.status.toLowerCase()}`);
  info(`Check: monid runs get --run-id ${run.runId}`);
  info(`Wait:  monid runs get --run-id ${run.runId} --wait`);
}
