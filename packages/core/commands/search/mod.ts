import type {
  Execution,
  ExecutionCreate,
  Quote,
} from "../../../types/index.ts";
import type { TaskCreate } from "../../../types/task.ts";
import type { CoreTransport } from "../../http/transport.ts";
import { parseWaitTimeoutMs, waitForTerminalExecution } from "../../polling.ts";
import { QuotesCore } from "../quotes/mod.ts";

export interface SearchInput {
  taskId?: string;
  quoteId?: string;
  taskCreate?: TaskCreate;
  wait?: boolean | number;
}

export interface SearchResult {
  quote: Quote;
  execution: Execution;
}

export class SearchCore {
  private readonly quotes: QuotesCore;

  constructor(private readonly transport: CoreTransport) {
    this.quotes = new QuotesCore(transport);
  }

  async run(input: SearchInput): Promise<SearchResult> {
    const quote = await this.resolveQuote(input);
    const executionCreate: ExecutionCreate = { quoteId: quote.quoteId };

    let execution = await this.transport.request<Execution>(
      "POST",
      "/v1/searches",
      executionCreate,
    );

    if (input.wait !== undefined) {
      const timeoutMs = parseWaitTimeoutMs(input.wait);
      try {
        execution = await waitForTerminalExecution(
          () => this.transport.request<Execution>("GET", `/v1/executions/${execution.executionId}`),
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
    }

    return { quote, execution };
  }

  private async resolveQuote(input: SearchInput): Promise<Quote> {
    if (input.quoteId) {
      return this.quotes.getById(input.quoteId);
    }

    if (input.taskId) {
      return this.quotes.get({ taskId: input.taskId });
    }

    if (input.taskCreate) {
      return this.quotes.get({ taskCreate: input.taskCreate });
    }

    throw new Error("Provide quoteId, taskId, or taskCreate for search.");
  }
}
