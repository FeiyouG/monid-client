import type { CoreTransport } from "./http/transport.ts";
import { ExecutionsCore } from "./commands/executions/mod.ts";
import { QuotesCore } from "./commands/quotes/mod.ts";
import { SearchCore } from "./commands/search/mod.ts";
import { TasksCore } from "./commands/tasks/mod.ts";

export class CoreClient {
  readonly tasks: TasksCore;
  readonly quotes: QuotesCore;
  readonly executions: ExecutionsCore;
  readonly search: SearchCore;

  constructor(private readonly transport: CoreTransport) {
    this.tasks = new TasksCore(transport);
    this.quotes = new QuotesCore(transport);
    this.executions = new ExecutionsCore(transport);
    this.search = new SearchCore(transport);
  }

  getTransport(): CoreTransport {
    return this.transport;
  }
}
