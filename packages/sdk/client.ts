import { CONFIG } from "@scopeos/core";
import {
  CoreClient,
  type CoreRequestOptions,
  type CoreTransport,
  type SearchInput,
  type TaskUpdateInput,
} from "@scopeos/core";
import type {
  Execution,
  ExecutionsListResponse,
  Quote,
  Task,
  TaskCreate,
  TasksListResponse,
} from "@scopeos/types";

export interface ClientOptions {
  apiKey?: string;
}

export interface ClientTasksApi {
  create(input: TaskCreate): Promise<Task>;
  list(options?: { limit?: number; cursor?: string }): Promise<TasksListResponse>;
  get(taskId: string): Promise<Task>;
  update(taskId: string, input: TaskUpdateInput): Promise<Task>;
  delete(taskId: string): Promise<void>;
}

export interface ClientQuotesApi {
  get(options: { taskId?: string; taskCreate?: TaskCreate }): Promise<Quote>;
  getById(quoteId: string): Promise<Quote>;
}

export interface ClientExecutionsApi {
  list(options?: {
    taskId?: string;
    limit?: number;
    cursor?: string;
  }): Promise<ExecutionsListResponse>;
  get(executionId: string, wait?: boolean | number): Promise<Execution>;
}

export interface ClientInterface {
  tasks: ClientTasksApi;
  quotes: ClientQuotesApi;
  executions: ClientExecutionsApi;
  search(input: SearchInput): Promise<{ quote: Quote; execution: Execution }>;
}

export class Client implements ClientInterface {
  private readonly core: CoreClient;

  constructor(options: ClientOptions = {}) {
    const apiKey = options.apiKey ?? Deno.env.get("SCOPE_OS_API_KEY");
    if (!apiKey) {
      throw new Error(
        "Missing API key. Pass apiKey in Client constructor or set SCOPE_OS_API_KEY environment variable.",
      );
    }

    const baseUrl = CONFIG.api.endpoint;
    const transport = createBearerTransport(baseUrl, apiKey);
    this.core = new CoreClient(transport);
  }

  readonly tasks: ClientTasksApi = {
    create: (input: TaskCreate): Promise<Task> => this.core.tasks.create(input),
    list: (options?: { limit?: number; cursor?: string }): Promise<TasksListResponse> =>
      this.core.tasks.list(options),
    get: (taskId: string): Promise<Task> => this.core.tasks.get(taskId),
    update: (taskId: string, input: TaskUpdateInput): Promise<Task> =>
      this.core.tasks.update(taskId, input),
    delete: (taskId: string): Promise<void> => this.core.tasks.delete(taskId),
  };

  readonly quotes: ClientQuotesApi = {
    get: (options: { taskId?: string; taskCreate?: TaskCreate }): Promise<Quote> =>
      this.core.quotes.get(options),
    getById: (quoteId: string): Promise<Quote> => this.core.quotes.getById(quoteId),
  };

  readonly executions: ClientExecutionsApi = {
    list: (options?: {
      taskId?: string;
      limit?: number;
      cursor?: string;
    }): Promise<ExecutionsListResponse> => this.core.executions.list(options),
    get: (executionId: string, wait?: boolean | number): Promise<Execution> =>
      this.core.executions.getWithWait(executionId, wait),
  };

  search(input: SearchInput): Promise<{ quote: Quote; execution: Execution }> {
    return this.core.search.run(input);
  }
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
