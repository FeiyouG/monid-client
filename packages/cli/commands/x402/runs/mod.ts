/**
 * monid x402 runs get — Poll x402 run results
 *
 * Uses SIWX wallet signature for auth.
 * Supports server-side long-polling via ?wait=N.
 */

import { Command } from "@cliffy/command";
import {
  fetchX402Run,
  getActiveWalletAddress,
  waitForX402Run,
} from "../../../../lib/x402-client.ts";
import { displayRunResult } from "../../run/mod.ts";
import {
  error,
  info,
  progressSpinner,
} from "../../../../utils/display.ts";
import type { RunResponse } from "../../../../types/api.ts";

const getCommand = new Command()
  .name("get")
  .description("Get x402 run status and results (SIWX authenticated)")
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
        // Validate wallet is configured (needed for SIWX signing)
        try {
          await getActiveWalletAddress();
        } catch (err) {
          error(err instanceof Error ? err.message : String(err));
          Deno.exit(1);
        }

        let run: RunResponse;

        if (options.wait !== undefined) {
          const timeoutSec =
            typeof options.wait === "number" && options.wait > 0
              ? options.wait
              : undefined;

          if (!options.json) {
            info("Waiting for completion (SIWX authenticated)...");
            console.log("");
          }

          const spinner = options.json
            ? { stop: () => {}, update: () => {} }
            : progressSpinner("Polling...");
          try {
            run = await waitForX402Run(options.runId, timeoutSec);
            spinner.stop();
          } catch (err) {
            spinner.stop();
            if (
              err instanceof Error &&
              err.message.includes("Timeout")
            ) {
              error(err.message);
              info(
                `Try again: monid x402 runs get --run-id ${options.runId} --wait`,
              );
              return;
            }
            throw err;
          }
        } else {
          if (!options.json) {
            info("Fetching run (SIWX authenticated)...");
          }
          try {
            run = await fetchX402Run(options.runId);
          } catch (err) {
            error(
              `Failed to fetch run: ${err instanceof Error ? err.message : String(err)}`,
            );
            Deno.exit(1);
          }
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

export const x402RunsCommand = new Command()
  .name("runs")
  .description("x402 run status and result retrieval (SIWX authenticated)")
  .command("get", getCommand);
