import type { CoreTransport } from "./http/transport.ts";
import { DiscoverCore } from "./commands/discover/mod.ts";
import { InspectCore } from "./commands/inspect/mod.ts";
import { RunsCore } from "./commands/runs/mod.ts";

export class CoreClient {
  readonly discover: DiscoverCore;
  readonly inspect: InspectCore;
  readonly runs: RunsCore;

  constructor(private readonly transport: CoreTransport) {
    this.discover = new DiscoverCore(transport);
    this.inspect = new InspectCore(transport);
    this.runs = new RunsCore(transport);
  }

  getTransport(): CoreTransport {
    return this.transport;
  }
}
