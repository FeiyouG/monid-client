import type {
  Execution,
  ExecutionsListResponse,
} from "../../../types/index.ts";
import type { CoreTransport } from "../../http/transport.ts";
import {
  parseWaitTimeoutMs,
  waitForTerminalExecution,
} from "../../polling.ts";

export interface ExecutionListOptions {
  taskId?: string;
  limit?: number;
  cursor?: string;
}

export class ExecutionsCore {
  constructor(private readonly transport: CoreTransport) {}

  get(executionId: string): Promise<Execution> {
    return this.transport.request<Execution>("GET", `/v1/executions/${executionId}`);
  }

  async getWithWait(
    executionId: string,
    wait?: boolean | number,
  ): Promise<Execution> {
    let execution = await this.get(executionId);
    if (wait === undefined || execution.status === "COMPLETED" || execution.status === "FAILED") {
      return execution;
    }

    const timeoutMs = parseWaitTimeoutMs(wait);
    try {
      execution = await waitForTerminalExecution(
        () => this.get(executionId),
        timeoutMs ? { timeoutSeconds: timeoutMs / 1000 } : {},
      );
    } catch (err) {
      if (timeoutMs && err instanceof Error && err.message.includes("Polling timeout")) {
        throw new Error(
          `Execution did not reach terminal status within ${Math.floor(timeoutMs / 1000)} seconds`,
        );
      }
      throw err;
    }

    return execution;
  }

  async list(options: ExecutionListOptions = {}): Promise<ExecutionsListResponse> {
    const limit = options.limit ?? 10;
    const basePath = options.taskId
      ? `/v1/tasks/${options.taskId}/executions`
      : "/v1/executions";

    let path = `${basePath}?limit=${limit}`;
    if (options.cursor) {
      path += `&cursor=${encodeURIComponent(options.cursor)}`;
    }

    const response = await this.transport.request<Execution[] | ExecutionsListResponse>(
      "GET",
      path,
    );

    if (Array.isArray(response)) {
      return { items: response, cursor: null };
    }

    return response;
  }
}
