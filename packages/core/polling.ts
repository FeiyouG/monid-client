import type { Execution } from "../types/index.ts";

export interface WaitOptions {
  timeoutSeconds?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

export function parseWaitTimeoutMs(wait?: boolean | number): number | undefined {
  if (wait === undefined || wait === true) {
    return undefined;
  }

  if (typeof wait !== "number" || !Number.isFinite(wait) || wait <= 0) {
    throw new Error("Invalid --wait timeout. Please provide a positive number of seconds.");
  }

  return wait * 1000;
}

export async function waitForTerminalExecution(
  getExecution: () => Promise<Execution>,
  options: WaitOptions = {},
): Promise<Execution> {
  const initialDelayMs = options.initialDelayMs ?? 2000;
  const maxDelayMs = options.maxDelayMs ?? 30000;
  const timeoutMs = options.timeoutSeconds === undefined
    ? 300000
    : options.timeoutSeconds * 1000;

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Invalid wait timeout. Please provide a positive number of seconds.");
  }

  const startTime = Date.now();
  let delay = initialDelayMs;

  while (true) {
    const execution = await getExecution();
    if (execution.status === "COMPLETED" || execution.status === "FAILED") {
      return execution;
    }

    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Polling timeout after ${Math.floor(timeoutMs / 1000)} seconds`);
    }

    await sleep(delay);
    delay = Math.min(delay * 2, maxDelayMs);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
