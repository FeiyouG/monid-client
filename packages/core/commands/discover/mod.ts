import type { DiscoverResponse } from "../../../types/index.ts";
import type { CoreTransport } from "../../http/transport.ts";

export class DiscoverCore {
  constructor(private readonly transport: CoreTransport) {}

  discover(query: string, limit?: number): Promise<DiscoverResponse> {
    const body: Record<string, unknown> = { query };
    if (limit !== undefined) {
      body.limit = limit;
    }
    return this.transport.request<DiscoverResponse>("POST", "/v1/discover", body);
  }
}
