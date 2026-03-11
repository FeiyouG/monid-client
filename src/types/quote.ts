/**
 * Quote types for ScopeOS API
 */

import { JSONSchema } from "./task.ts";

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
export interface QuoteCreate {
  taskId: string
}
