import { CoreClient, type CoreTransport, type CoreRequestOptions } from "../core/mod.ts";
import { makeAuthenticatedRequest } from "../lib/api-client.ts";

const cliTransport: CoreTransport = {
  request<T>(method: string, path: string, body?: unknown, options?: CoreRequestOptions): Promise<T> {
    return makeAuthenticatedRequest<T>(method, path, body, { headers: options?.headers });
  },
};

const cliCoreClient = new CoreClient(cliTransport);

export function getCliCoreClient(): CoreClient {
  return cliCoreClient;
}
