export interface CoreRequestOptions {
  headers?: Record<string, string>;
}

export interface CoreTransport {
  request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: CoreRequestOptions,
  ): Promise<T>;
}
