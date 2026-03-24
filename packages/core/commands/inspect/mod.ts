import type { InspectResponse } from "../../../types/index.ts";
import type { CoreTransport } from "../../http/transport.ts";

export class InspectCore {
  constructor(private readonly transport: CoreTransport) {}

  inspect(provider: string, endpoint: string): Promise<InspectResponse> {
    return this.transport.request<InspectResponse>("POST", "/v1/inspect", {
      provider,
      endpoint,
    });
  }
}
