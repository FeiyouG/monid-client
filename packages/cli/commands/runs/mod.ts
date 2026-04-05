/**
 * monid runs — Run status subcommands
 */

import { Command } from "@cliffy/command";
import { getCliCoreClient } from "../../core-client.ts";
import type { RunResponse } from "../../../types/api.ts";
import { displayRunResult } from "../run/mod.ts";
import {
  error,
  info,
  progressSpinner,
} from "../../../utils/display.ts";

const getCommand = new Command()
  .name("get")
  .description("Get run status and results")
  .option("-r, --run-id <runId:string>", "Run ID", { required: true })
  .option(
    "-w, --wait [timeout:number]",
    "Wait for completion (optional timeout in seconds)",
  )
  .option("-o, --output <file:string>", "Save results to file")
  .option("-j, --json", "Output raw JSON (for agents and scripting)")
  .action(
    async (options: {
      runId: string;
      wait?: boolean | number;
      output?: string;
      json?: boolean;
    }) => {
      try {
        const client = getCliCoreClient();

        info(`Fetching run ${options.runId}...`);

        let run: RunResponse;

        if (options.wait !== undefined) {
          const timeoutSec =
            typeof options.wait === "number" && options.wait > 0
              ? options.wait
              : undefined;

          const spinner = options.json
            ? { stop: () => {}, update: () => {} }
            : progressSpinner("Waiting for completion...");
          try {
            run = await client.runs.waitForCompletion(
              options.runId,
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
                `Try again: monid runs get --run-id ${options.runId} --wait`,
              );
              return;
            }
            throw err;
          }
        } else {
          run = await client.runs.get(options.runId);
        }

        if (!options.json) console.log("");
        displayRunResult(run, { outputFile: options.output, json: options.json });
      } catch (err) {
        error(
          `Failed to get run: ${err instanceof Error ? err.message : String(err)}`,
        );
        throw err;
      }
    },
  );

export const runsCommand = new Command()
  .name("runs")
  .description("Run status and result retrieval")
  .command("get", getCommand);
