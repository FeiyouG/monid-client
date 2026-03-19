/**
 * x402 search command
 * Executes an async search using the x402 protocol for automatic crypto payments.
 * The initial POST is paid via x402; subsequent status polling uses SIWX auth.
 * No API key required - uses an EVM wallet instead.
 */

import { Command } from "@cliffy/command";
import { CONFIG } from "@monid/core";
import { parseSchema } from "../../../shared/task-flags.ts";
import {
  createX402Fetch,
  getActiveWalletAddress,
  pollX402Execution,
  type X402Execution,
} from "../../../../lib/x402-client.ts";
import {
  error,
  info,
  success,
  prettyJson,
  progressSpinner,
  statusBadge,
} from "../../../../utils/display.ts";
import { displayX402ExecutionResult } from "../execution/get/mod.ts";

export const x402Command = new Command()
  .name("x402")
  .description(
    "Execute a search using x402 protocol (crypto payment)\n\n" +
    "Sends a search request to the x402 endpoint. The server responds with\n" +
    "an execution ID. Use --wait to poll until results are ready.\n\n" +
    "Requires an activated wallet: monid wallet add --private-key <0x...> --label <name>",
  )
  .option("-n, --name <name:string>", "Search name", { required: true })
  .option("-q, --query <query:string>", "Search query", { required: true })
  .option("-s, --output-schema <schema:string>", "Output schema (JSON string or file path)", { required: true })
  .option("-d, --description <desc:string>", "Search description")
  .option("-w, --wait [timeout:number]", "Wait for completion (optional timeout in seconds)")
  .option("-o, --output <file:string>", "Save results to file")
  .action(async (options) => {
    try {
      // Validate wallet is configured
      let walletAddress: string;
      try {
        walletAddress = await getActiveWalletAddress();
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        Deno.exit(1);
      }

      // Parse output schema
      const outputSchema = await parseSchema(options.outputSchema);

      // Build request body
      const body: Record<string, unknown> = {
        name: options.name,
        query: options.query,
        outputSchema,
      };
      if (options.description) {
        body.description = options.description;
      }

      const url = `${CONFIG.api.endpoint}/x402/v1/searches`;

      console.log("=== x402 Search ===\n");
      info(`Wallet:  ${walletAddress}`);
      info(`Target:  POST ${url}`);
      console.log("");

      // Create x402-wrapped fetch
      const spinner = progressSpinner("Setting up x402 payment client...");
      let fetchWithPayment: typeof fetch;
      try {
        fetchWithPayment = await createX402Fetch();
        spinner.stop();
      } catch (err) {
        spinner.stop();
        error(`Failed to initialize x402 client: ${err instanceof Error ? err.message : String(err)}`);
        Deno.exit(1);
      }

      const reqSpinner = progressSpinner("Sending request (x402 handles payment automatically)...");

      try {
        const response = await fetchWithPayment(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        reqSpinner.stop();

        const responseText = await response.text();

        if (!response.ok) {
          if (response.status === 402) {
            console.log("");
            error("Payment is still required after retry.");
            info("This usually means insufficient USDC balance or facilitator rejection.");
            info(`Wallet: ${walletAddress}`);
            console.log("");
            info("Get testnet USDC: https://faucet.circle.com/ (select Base Sepolia)");
            info("Get testnet ETH:  https://www.alchemy.com/faucets/base-sepolia");
          } else {
            console.log("");
            error(`Request failed with status ${response.status}: ${response.statusText}`);
            if (responseText) {
              console.log("");
              console.log("Response:");
              console.log(formatBody(responseText));
            }
          }
          Deno.exit(1);
        }

        // Parse the async response
        let result: X402Execution;
        try {
          result = JSON.parse(responseText) as X402Execution;
        } catch {
          error("Unexpected response format from server.");
          console.log(responseText);
          Deno.exit(1);
        }

        // Check for payment settlement info
        const paymentResponse = response.headers.get("payment-response");
        if (paymentResponse) {
          info("Payment: settled via x402");
        }

        const executionId = result.executionId;
        if (!executionId) {
          // Fallback: server returned results directly (sync response)
          console.log("");
          success("Search completed successfully!");
          console.log("");
          console.log("Results:");
          console.log(prettyJson(result));
          console.log("");
          saveToFile(result, options.output);
          return;
        }

        console.log("");
        success(`Execution started: ${executionId}`);
        console.log(`Status: ${statusBadge(result.status)}`);
        console.log("");

        // If --wait is specified, poll for completion
        if (options.wait !== undefined) {
          info("Waiting for completion...");
          console.log("");

          const timeoutMs = parseWaitTimeout(options.wait);
          try {
            const finalExecution = await pollX402Execution(
              executionId,
              timeoutMs ? { timeoutSeconds: timeoutMs / 1000 } : {},
            );
            displayX402ExecutionResult(finalExecution, options.output);
          } catch (err) {
            if (err instanceof Error && err.message.includes("Polling timeout")) {
              error(err.message);
              info(`Check later: monid x402 execution get --execution-id ${executionId}`);
            } else {
              throw err;
            }
          }
        } else {
          info(`Check status: monid x402 execution get --execution-id ${executionId}`);
          info(`Wait for results: monid x402 execution get --execution-id ${executionId} --wait`);
        }
      } catch (err) {
        reqSpinner.stop();

        const message = err instanceof Error ? err.message : String(err);

        if (message.includes("No scheme registered")) {
          error("Network not supported — the server requested a network this client doesn't support.");
        } else if (message.includes("Payment already attempted")) {
          error("Payment failed on retry — the server rejected the payment.");
        } else {
          error(`Request failed: ${message}`);
        }
        Deno.exit(1);
      }
    } catch (err) {
      error(`x402 search failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });

/**
 * Pretty-print a JSON string, or return as-is if not valid JSON.
 */
function formatBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

/**
 * Parse the --wait flag value into milliseconds.
 */
function parseWaitTimeout(wait: boolean | number | undefined): number | undefined {
  if (wait === undefined || wait === true) {
    return undefined; // No timeout (unlimited)
  }
  if (typeof wait === "number" && Number.isFinite(wait) && wait > 0) {
    return wait * 1000;
  }
  return undefined;
}

/**
 * Save response data to file if output path is specified.
 */
function saveToFile(data: unknown, outputPath?: string): void {
  if (!outputPath) return;
  try {
    const content = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    Deno.writeTextFileSync(outputPath, content);
    success(`Results saved to: ${outputPath}`);
  } catch (err) {
    error(`Failed to save results: ${err instanceof Error ? err.message : String(err)}`);
  }
}
