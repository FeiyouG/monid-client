import type { Quote } from "../../../types/index.ts";
import type { TaskCreate } from "../../../types/task.ts";
import type { CoreTransport } from "../../http/transport.ts";
import { TasksCore } from "../tasks/mod.ts";

export interface GetQuoteOptions {
  taskId?: string;
  taskCreate?: TaskCreate;
}

export class QuotesCore {
  private readonly tasks: TasksCore;

  constructor(private readonly transport: CoreTransport) {
    this.tasks = new TasksCore(transport);
  }

  async get(options: GetQuoteOptions): Promise<Quote> {
    let taskId = options.taskId;
    if (!taskId && options.taskCreate) {
      const task = await this.tasks.create(options.taskCreate);
      taskId = task.taskId;
    }

    if (!taskId) {
      throw new Error("Provide taskId or taskCreate to get a quote.");
    }

    return this.transport.request<Quote>(
      "POST",
      `/v1/tasks/${taskId}/quotes`,
      { taskId },
    );
  }

  getById(quoteId: string): Promise<Quote> {
    return this.transport.request<Quote>("GET", `/v1/quotes/${quoteId}`);
  }
}
