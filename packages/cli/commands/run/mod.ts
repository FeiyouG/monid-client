/**
 * monid run — Start an async execution
 */

import { Command } from "@cliffy/command";
import { getCliCoreClient } from "../../core-client.ts";
import { parseInput } from "../../shared/input-parser.ts";
import type { RunResponse } from "../../../types/api.ts";
import {
  error,
  info,
  progressSpinner,
  renderObject,
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
  .option("-j, --json", "Output raw JSON (for agents and scripting)")
  .action(
    async (options: {
      provider: string;
      endpoint: string;
      input: string;
      wait?: boolean | number;
      output?: string;
      json?: boolean;
    }) => {
      try {
        const input = await parseInput(options.input);
        const client = getCliCoreClient();

        info(`Starting run: ${options.provider}${options.endpoint}`);

        const run = await client.runs.start({
          provider: options.provider,
          endpoint: options.endpoint,
          input,
        });

        if (options.json && !options.wait) {
          console.log(JSON.stringify(run, null, 2));
          return;
        }

        if (!options.json) {
          console.log("");
          success(`Run started: ${run.runId}`);
          console.log("");
          console.log(renderObject({ status: run.status, cost: run.cost ?? "pending" }).join("\n"));
          console.log("");
        }

        if (options.wait !== undefined) {
          const timeoutSec =
            typeof options.wait === "number" && options.wait > 0
              ? options.wait
              : undefined;

          const spinner = options.json
            ? { stop: () => {}, update: () => {} }
            : progressSpinner("Waiting for completion...");
          let finalRun: RunResponse;
          try {
            finalRun = await client.runs.waitForCompletion(
              run.runId,
              timeoutSec,
            );
            spinner.stop();
          } catch (err) {
            spinner.stop();
            if (err instanceof Error && err.message.includes("Timeout")) {
              error(err.message);
              info(`Check later: monid runs get --run-id ${run.runId}`);
              return;
            }
            throw err;
          }

          displayRunResult(finalRun, { outputFile: options.output, json: options.json });
        } else if (!options.json) {
          info(`Check status: monid runs get --run-id ${run.runId}`);
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
  opts: { outputFile?: string; json?: boolean } = {},
): void {
  // --json: raw machine-readable output
  if (opts.json) {
    console.log(JSON.stringify(run, null, 2));
    return;
  }

  // Human-readable hierarchical output
  console.log(renderObject(run).join("\n"));
  console.log("");

  if (run.status === "FAILED") {
    const errMsg = run.error
      ? `[${run.error.source}] ${run.error.message}${run.error.code ? ` (${run.error.code})` : ""}`
      : "Unknown error";
    error(`Run failed: ${errMsg}`);
    return;
  }

  if (run.status === "COMPLETED") {
    success("Run completed successfully!");

    if (opts.outputFile && run.output !== undefined && run.output !== null) {
      try {
        const content =
          typeof run.output === "string"
            ? run.output
            : JSON.stringify(run.output, null, 2);
        Deno.writeTextFileSync(opts.outputFile, content);
        success(`Output saved to: ${opts.outputFile}`);
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
