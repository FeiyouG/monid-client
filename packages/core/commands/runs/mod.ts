import type { RunRequest, RunResponse } from "../../../types/index.ts";
import type { CoreTransport } from "../../http/transport.ts";

/** Default wait window per long-poll request (seconds). */
const POLL_WAIT_SECONDS = 30;

/** Default total timeout when waiting for a run to complete (seconds). */
const DEFAULT_TOTAL_TIMEOUT_SECONDS = 300; // 5 minutes

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
   * Long-poll loop: repeatedly calls GET /v1/runs/:runId?wait=30
   * until the run reaches a terminal status (COMPLETED | FAILED)
   * or the total timeout is exceeded.
   */
  async waitForCompletion(
    runId: string,
    totalTimeoutSec?: number,
  ): Promise<RunResponse> {
    const timeout = totalTimeoutSec ?? DEFAULT_TOTAL_TIMEOUT_SECONDS;
    const start = Date.now();

    while (true) {
      const run = await this.transport.request<RunResponse>(
        "GET",
        `/v1/runs/${runId}?wait=${POLL_WAIT_SECONDS}`,
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
    }
  }
}
