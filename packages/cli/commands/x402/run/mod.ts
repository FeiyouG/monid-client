/**
 * monid x402 run — Execute via x402 protocol (crypto payment)
 *
 * POST /x402/v1/run — always returns 202 (no ?wait support).
 * No user auth needed; payment is the authorization.
 */

import { Command } from "@cliffy/command";
import { CONFIG } from "@monid/core";
import { parseInput } from "../../../shared/input-parser.ts";
import { formatPrice } from "../../../../types/api.ts";
import type { RunResponse } from "../../../../types/api.ts";
import {
  createX402Fetch,
  getActiveWalletAddress,
} from "../../../../lib/x402-client.ts";
import {
  error,
  info,
  progressSpinner,
  statusBadge,
  success,
} from "../../../../utils/display.ts";

export const x402RunCommand = new Command()
  .name("run")
  .description(
    "Execute a data endpoint using x402 protocol (crypto payment)\n\n" +
      "Sends a run request to the x402 endpoint. The server responds with\n" +
      "a run ID. Use `monid x402 runs get` to poll for results.\n\n" +
      "Requires an activated wallet: monid wallet add --private-key <0x...> --label <name>",
  )
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

      // Parse input
      const input = await parseInput(options.input);

      // Build request body
      const body = {
        provider: options.provider,
        endpoint: options.endpoint,
        input,
      };

      const url = `${CONFIG.api.endpoint}/x402/v1/run`;

      console.log("=== x402 Run ===\n");
      info(`Wallet:   ${walletAddress}`);
      info(`Endpoint: ${options.provider}${options.endpoint}`);
      info(`Target:   POST ${url}`);
      console.log("");

      // Create x402-wrapped fetch
      const spinner = progressSpinner("Setting up x402 payment client...");
      let fetchWithPayment: typeof fetch;
      try {
        fetchWithPayment = await createX402Fetch();
        spinner.stop();
      } catch (err) {
        spinner.stop();
        error(
          `Failed to initialize x402 client: ${err instanceof Error ? err.message : String(err)}`,
        );
        Deno.exit(1);
      }

      const reqSpinner = progressSpinner(
        "Sending request (x402 handles payment automatically)...",
      );

      try {
        const response = await fetchWithPayment(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        reqSpinner.stop();

        const responseText = await response.text();

        if (!response.ok) {
          if (response.status === 402) {
            console.log("");
            error("Payment is still required after retry.");
            info(
              "This usually means insufficient USDC balance or facilitator rejection.",
            );
            info(`Wallet: ${walletAddress}`);
            console.log("");
            info(
              "Get testnet USDC: https://faucet.circle.com/ (select Base Sepolia)",
            );
            info(
              "Get testnet ETH:  https://www.alchemy.com/faucets/base-sepolia",
            );
          } else {
            console.log("");
            error(
              `Request failed with status ${response.status}: ${response.statusText}`,
            );
            if (responseText) {
              console.log("");
              console.log("Response:");
              console.log(formatBody(responseText));
            }
          }
          Deno.exit(1);
        }

        // Parse the async response (always 202)
        let result: RunResponse;
        try {
          result = JSON.parse(responseText) as RunResponse;
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

        console.log("");
        success(`Run started: ${result.runId}`);
        console.log(`  Status: ${statusBadge(result.status)}`);
        console.log(`  Price:  ${formatPrice(result.price)}`);
        if (result.message) {
          console.log(`  Info:   ${result.message}`);
        }
        console.log("");

        info(
          `Check status: monid x402 runs get --run-id ${result.runId}`,
        );
        info(
          `Wait for results: monid x402 runs get --run-id ${result.runId} --wait`,
        );
      } catch (err) {
        reqSpinner.stop();

        const message = err instanceof Error ? err.message : String(err);

        if (message.includes("No scheme registered")) {
          error(
            "Network not supported — the server requested a network this client doesn't support.",
          );
        } else if (message.includes("Payment already attempted")) {
          error(
            "Payment failed on retry — the server rejected the payment.",
          );
        } else {
          error(`Request failed: ${message}`);
        }
        Deno.exit(1);
      }
    } catch (err) {
      error(
        `x402 run failed: ${err instanceof Error ? err.message : String(err)}`,
      );
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
