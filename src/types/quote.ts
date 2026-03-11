/**
 * Quote types for ScopeOS API
 */

// Price structure
export interface Price {
  amount: number;
  currency: string;
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
  estimatedPrice: Price;
  capabilities: CapabilityQuote[];
  expiresAt: string;
  createdAt: string;
}

// Payload for creating a quote
export interface QuoteCreate {
  input: Record<string, unknown>;
}
