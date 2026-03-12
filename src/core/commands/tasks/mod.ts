import type {
  JSONSchema,
  Task,
  TaskCreate,
  TasksListResponse,
} from "../../../types/index.ts";
import type { CoreTransport } from "../../http/transport.ts";

export interface TaskUpdateInput {
  name?: string;
  description?: string;
  query?: string;
  outputSchema?: JSONSchema;
}

export interface TaskListOptions {
  limit?: number;
  cursor?: string;
}

export class TasksCore {
  constructor(private readonly transport: CoreTransport) {}

  create(input: TaskCreate): Promise<Task> {
    return this.transport.request<Task>("POST", "/v1/tasks", input);
  }

  get(taskId: string): Promise<Task> {
    return this.transport.request<Task>("GET", `/v1/tasks/${taskId}`);
  }

  update(taskId: string, input: TaskUpdateInput): Promise<Task> {
    return this.transport.request<Task>("PATCH", `/v1/tasks/${taskId}`, input);
  }

  async list(options: TaskListOptions = {}): Promise<TasksListResponse> {
    const limit = options.limit ?? 10;
    let path = `/v1/tasks?limit=${limit}`;
    if (options.cursor) {
      path += `&cursor=${encodeURIComponent(options.cursor)}`;
    }

    return this.transport.request<TasksListResponse>("GET", path);
  }

  async delete(taskId: string): Promise<void> {
    await this.transport.request<void>("DELETE", `/v1/tasks/${taskId}`);
  }
}
