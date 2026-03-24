import { CONFIG } from "@monid/core";
import {
  CoreClient,
  type CoreRequestOptions,
  type CoreTransport,
} from "@monid/core";
import type {
  DiscoverResponse,
  InspectResponse,
  RunRequest,
  RunResponse,
} from "@monid/types";

export interface ClientOptions {
  apiKey?: string;
}

export interface ClientDiscoverApi {
  search(query: string, limit?: number): Promise<DiscoverResponse>;
}

export interface ClientInspectApi {
  get(provider: string, endpoint: string): Promise<InspectResponse>;
}

export interface ClientRunsApi {
  start(request: RunRequest): Promise<RunResponse>;
  get(runId: string): Promise<RunResponse>;
  waitForCompletion(runId: string, timeoutSec?: number): Promise<RunResponse>;
}

export interface ClientInterface {
  discover: ClientDiscoverApi;
  inspect: ClientInspectApi;
  runs: ClientRunsApi;
}

export class Client implements ClientInterface {
  private readonly core: CoreClient;

  constructor(options: ClientOptions = {}) {
    const apiKey = options.apiKey ?? Deno.env.get("MONID_API_KEY");
    if (!apiKey) {
      throw new Error(
        "Missing API key. Pass apiKey in Client constructor or set MONID_API_KEY environment variable.",
      );
    }

    const baseUrl = CONFIG.api.endpoint;
    const transport = createBearerTransport(baseUrl, apiKey);
    this.core = new CoreClient(transport);
  }

  readonly discover: ClientDiscoverApi = {
    search: (query: string, limit?: number): Promise<DiscoverResponse> =>
      this.core.discover.discover(query, limit),
  };

  readonly inspect: ClientInspectApi = {
    get: (provider: string, endpoint: string): Promise<InspectResponse> =>
      this.core.inspect.inspect(provider, endpoint),
  };

  readonly runs: ClientRunsApi = {
    start: (request: RunRequest): Promise<RunResponse> =>
      this.core.runs.start(request),
    get: (runId: string): Promise<RunResponse> =>
      this.core.runs.get(runId),
    waitForCompletion: (runId: string, timeoutSec?: number): Promise<RunResponse> =>
      this.core.runs.waitForCompletion(runId, timeoutSec),
  };
}

function createBearerTransport(baseUrl: string, apiKey: string): CoreTransport {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  return {
    async request<T>(
      method: string,
      path: string,
      body?: unknown,
      options?: CoreRequestOptions,
    ): Promise<T> {
      const url = `${normalizedBaseUrl}${path}`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(options?.headers ?? {}),
      };

      const response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      if (!response.ok) {
        throw await createApiError(response);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json() as T;
    },
  };
}

async function createApiError(response: Response): Promise<Error> {
  let details = response.statusText;
  try {
    const errorData = await response.json();
    if (errorData.message) {
      details = String(errorData.message);
    } else if (errorData.error) {
      details = String(errorData.error);
    } else {
      details = JSON.stringify(errorData);
    }
  } catch {
    // Keep default status text.
  }

  return new Error(`API Error (${response.status}): ${details}`);
}
