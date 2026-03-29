/**
 * New Monid API types — discover, inspect, run
 */

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

/** Price from discover/inspect: PER_CALL */
export interface PerCallPrice {
  type: "PER_CALL";
  amount: number;
  currency: string;
}

/** Price from discover/inspect: PER_RESULT */
export interface PerResultPrice {
  type: "PER_RESULT";
  amount: number;
  currency: string;
  flatFee?: number;
}

/** Price from run/runs: simple value + currency, no type */
export interface SimplePrice {
  value: number;
  currency: string;
  type?: undefined;
}

export type Price = PerCallPrice | PerResultPrice | SimplePrice;

export type RunStatus = "READY" | "RUNNING" | "COMPLETED" | "FAILED";

export interface RunError {
  source: "platform" | "provider" | "endpoint";
  message: string;
  code?: string; // e.g. "RATE_LIMITED", "TIMEOUT"
}

// ---------------------------------------------------------------------------
// POST /v1/discover
// ---------------------------------------------------------------------------

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

const currencySymbol: Record<string, string> = { USD: "$" };

export function formatPrice(price: Price): string {
  const sym = currencySymbol[price.currency] ?? price.currency;

  if (!price.type) {
    // Simple price from run/runs (value + currency only)
    return `${sym}${price.value}`;
  }

  if (price.type === "PER_CALL") {
    return `${sym}${price.amount}/call`;
  }

  // PER_RESULT
  const base = `${sym}${price.amount}/result`;
  if (price.flatFee) {
    return `${base} + ${sym}${price.flatFee}`;
  }
  return base;
}
