/**
 * Exponential backoff polling utility for execution status
 */

import type { Execution } from "../types/index.ts";
import { apiGet } from "./api-client.ts";
import { progressSpinner, statusBadge } from "../utils/display.ts";

export interface PollingOptions {
  initialDelay?: number;    // Initial delay in ms (default: 2000)
  maxDelay?: number;         // Maximum delay in ms (default: 30000)
  timeout?: number;          // Total timeout in ms (default: 300000 = 5 minutes)
  onProgress?: (execution: Execution) => void;  // Callback for status updates
}

/**
 * Poll execution status with exponential backoff until completion
 */
export async function pollExecution(
  executionId: string,
  options: PollingOptions = {}
): Promise<Execution> {
  const {
    initialDelay = 2000,
    maxDelay = 30000,
    timeout = 300000,
    onProgress,
  } = options;

  const startTime = Date.now();
  let currentDelay = initialDelay;
  let lastStatus: string | null = null;

  // Create spinner
  const spinner = progressSpinner(`Checking execution status...`);

  try {
    while (true) {
      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > timeout) {
        spinner.stop();
        throw new Error(`Polling timeout after ${Math.floor(timeout / 1000)} seconds`);
      }

      // Fetch execution status
      const execution = await apiGet<Execution>(`/v1/executions/${executionId}`);

      // Update spinner if status changed
      if (execution.status !== lastStatus) {
        lastStatus = execution.status;
        spinner.update(`Status: ${statusBadge(execution.status)}...`);
      }

      // Call progress callback
      if (onProgress) {
        onProgress(execution);
      }

      // Check if completed or failed
      if (execution.status === "COMPLETED" || execution.status === "FAILED") {
        spinner.stop();
        return execution;
      }

      // Wait before next poll
      await sleep(currentDelay);

      // Exponential backoff
      currentDelay = Math.min(currentDelay * 2, maxDelay);
    }
  } catch (err) {
    spinner.stop();
    throw err;
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
