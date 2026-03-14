import { CoreClient, type CoreTransport } from "../core/mod.ts";
import { makeAuthenticatedRequest } from "../lib/api-client.ts";

const cliTransport: CoreTransport = {
  request<T>(method: string, path: string, body?: unknown): Promise<T> {
    return makeAuthenticatedRequest<T>(method, path, body);
  },
};

const cliCoreClient = new CoreClient(cliTransport);

export function getCliCoreClient(): CoreClient {
  return cliCoreClient;
}
