import type { RunRequest, RunResponse } from "../../../types/index.ts";
import type { CoreTransport } from "../../http/transport.ts";

/** Default total timeout when waiting for a run to complete (seconds). */
const DEFAULT_TOTAL_TIMEOUT_SECONDS = 300; // 5 minutes

/** Max backoff ceiling in milliseconds. */
const MAX_BACKOFF_MS = 3000;

/** Backoff ceiling increment per attempt in milliseconds. */
const BACKOFF_STEP_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number): number {
  const ceiling = Math.min(attempt * BACKOFF_STEP_MS, MAX_BACKOFF_MS);
  return Math.floor(Math.random() * ceiling);
}

export class RunsCore {
  constructor(private readonly transport: CoreTransport) {}

  /**
   * Start a new run.  POST /v1/run
   * Always returns immediately (no ?wait support on POST).
   */
  start(request: RunRequest): Promise<RunResponse> {
    return this.transport.request<RunResponse>("POST", "/v1/run", request);
  }

  /**
   * Get a run's current status.  GET /v1/runs/:runId
   */
  get(runId: string): Promise<RunResponse> {
    return this.transport.request<RunResponse>("GET", `/v1/runs/${runId}`);
  }

  /**
   * Poll with exponential backoff until the run reaches a terminal status
   * (COMPLETED | FAILED) or the total timeout is exceeded.
   */
  async waitForCompletion(
    runId: string,
    totalTimeoutSec?: number,
  ): Promise<RunResponse> {
    const timeout = totalTimeoutSec ?? DEFAULT_TOTAL_TIMEOUT_SECONDS;
    const start = Date.now();
    let attempt = 0;

    while (true) {
      const run = await this.transport.request<RunResponse>(
        "GET",
        `/v1/runs/${runId}`,
      );

      if (run.status === "COMPLETED" || run.status === "FAILED") {
        return run;
      }

      const elapsed = (Date.now() - start) / 1000;
      if (elapsed >= timeout) {
        throw new Error(
          `Timeout after ${timeout}s waiting for run ${runId} to complete`,
        );
      }

      attempt++;
      await sleep(backoffDelay(attempt));
    }
  }
}
