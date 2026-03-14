/**
 * Quote types for ScopeOS API
 */

import { JSONSchema, TaskCreate } from "./task.ts";

// Price structure
export interface Price {
  value: number;
  currency: string;
  type: string;
}

// Per-capability quote breakdown
export interface CapabilityQuote {
  capabilityId: string;
  preparedInput: Record<string, unknown>;
  estimatedPrice: Price;
}

// Full quote object
export interface Quote {
  quoteId: string;
  taskId: string;
  workspaceId: string;
  price: Price;
  expiresAt: string;
  createdAt: string;
  metadata: JSONSchema,
}

// Payload for creating a quote
export type QuoteCreate = {
  taskId: string
} | TaskCreate


const currencyUnit = new Map([
  ["USD", "$"]
])

const typeSuffix = new Map([
  ["PER_CALL", "per call"]
])

export const formatPrice = (price: Price) => {
  const unit = currencyUnit.get(price.currency) ?? price.currency;
  const suffix = typeSuffix.get(price.type) ?? price.type;

  return `${unit}${price.value} ${suffix}`
}
