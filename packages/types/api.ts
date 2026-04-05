/**
 * New Monid API types — discover, inspect, run
 */

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

/** Price: PER_CALL — flat cost per invocation (amount in dollars) */
export interface PerCallPrice {
  type: "PER_CALL";
  amount: number;
  currency: string;
  notes?: string[];
}

/** Price: PER_RESULT — cost per result item (amount in dollars) */
export interface PerResultPrice {
  type: "PER_RESULT";
  amount: number;
  currency: string;
  flatFee?: number;
  notes?: string[];
}

export type Price = PerCallPrice | PerResultPrice;

/** Actual cost of a run (from billing). Value is in dollars. */
export interface Cost {
  value: number;
  currency: string;
}

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
  provider: string;
  providerName?: string;
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
  providerName: string;
  endpoint: string;
  description: string;
  summary?: string;
  inputSchema?: Record<string, unknown>;
  price: Price;
  docUrl?: string;
  notes?: string[];
  usage: {
    api: string;
    apiX402: string;
    cli: string;
    cliX402: string;
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
  caller?: string;
  provider: string;
  providerName?: string;
  endpoint: string;
  status: RunStatus;
  input?: Record<string, unknown>;
  output?: unknown;
  error?: RunError;
  price: Price;
  cost?: Cost;
  message?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const currencySymbols: Record<string, string> = { USD: "$" };

/**
 * Format a dollar amount for display.
 * Preserves up to 5 decimal places of precision, trims trailing zeros,
 * but always shows at least 2 decimal places.
 *
 *   formatAmount(0.0005, "$")  → "$0.0005"
 *   formatAmount(0.00001, "$") → "$0.00001"
 *   formatAmount(1.5, "$")     → "$1.50"
 *   formatAmount(10, "$")      → "$10.00"
 */
function formatAmount(dollars: number, sym: string): string {
  const full = dollars.toFixed(5);
  const trimmed = full.replace(/0+$/, "");
  const dotIndex = trimmed.indexOf(".");
  const decimals = dotIndex === -1 ? 0 : trimmed.length - dotIndex - 1;
  const formatted = decimals < 2 ? dollars.toFixed(2) : trimmed;
  return `${sym}${formatted}`;
}

/** Format a Cost (value in dollars) for display. */
export function formatCost(cost: Cost): string {
  const sym = currencySymbols[cost.currency] ?? `${cost.currency} `;
  return formatAmount(cost.value, sym);
}

export function formatPrice(price: Price): string {
  const sym = currencySymbols[price.currency] ?? `${price.currency} `;

  let base: string;

  if (price.type === "PER_CALL") {
    base = `${formatAmount(price.amount, sym)}/call`;
  } else {
    // PER_RESULT
    base = `${formatAmount(price.amount, sym)}/result`;
    if (price.flatFee) {
      base = `${base} + ${formatAmount(price.flatFee, sym)}`;
    }
  }

  if (price.notes && price.notes.length > 0) {
    return `${base} (${price.notes.join("; ")})`;
  }
  return base;
}
