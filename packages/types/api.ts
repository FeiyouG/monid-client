/**
 * New Monid API types — discover, inspect, run
 */

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export interface Price {
  type: "PER_CALL";
  currency: "USD";
  value: number;
}

export type RunStatus = "READY" | "RUNNING" | "COMPLETED" | "FAILED";

export interface RunError {
  source: "platform" | "provider" | "endpoint";
  message: string;
  code?: string; // e.g. "RATE_LIMITED", "TIMEOUT"
}

export interface ApiErrorResponse {
  code: number;
  message: string;
}

// ---------------------------------------------------------------------------
// POST /v1/discover
// ---------------------------------------------------------------------------

export interface DiscoverRequest {
  query: string;
  limit?: number; // 1-20, default 5
}

export interface DiscoverResult {
  id: string;
  provider: string;
  endpoint: string;
  description: string;
  price: Price;
}

export interface DiscoverResponse {
  results: DiscoverResult[];
  query: string;
  count: number;
}

// ---------------------------------------------------------------------------
// POST /v1/inspect
// ---------------------------------------------------------------------------

export interface InspectRequest {
  provider: string;
  endpoint: string;
}

export interface InspectResponse {
  id: string;
  provider: string;
  endpoint: string;
  description: string;
  summary: string;
  inputSchema: Record<string, unknown>;
  price: Price;
  docUrl: string;
  usage: {
    api: string;
    x402: string;
  };
}

// ---------------------------------------------------------------------------
// POST /v1/run  &  GET /v1/runs/:runId
// ---------------------------------------------------------------------------

export interface RunRequest {
  provider: string;
  endpoint: string;
  input: Record<string, unknown>;
}

export interface RunResponse {
  runId: string;
  provider: string;
  endpoint: string;
  status: RunStatus;
  output?: unknown;
  error?: RunError;
  price: Price;
  message?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const currencyUnit = new Map([["USD", "$"]]);
const typeSuffix = new Map([["PER_CALL", "per call"]]);

export function formatPrice(price: Price): string {
  const unit = currencyUnit.get(price.currency) ?? price.currency;
  const suffix = typeSuffix.get(price.type) ?? price.type;
  return `${unit}${price.value} ${suffix}`;
}
