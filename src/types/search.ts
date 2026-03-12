/**
 * Search/Execution types for ScopeOS API
 */

import type { Price } from "./quote.ts";

// Execution status
export type ExecutionStatus = "READY" | "RUNNING" | "COMPLETED" | "FAILED";

// Result envelope
export interface ExecutionResult {
  data: Record<string, unknown>;
  expiresAt: string;
}

// Full execution object
export interface Execution {
  executionId: string;
  taskId: string;
  quoteId: string;
  workspaceId: string;
  executedBy: string;
  actualPrice?: Price;
  status: ExecutionStatus;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
  result?: ExecutionResult;
}

// Paginated list response
export interface ExecutionsListResponse {
  items: Execution[];
  cursor?: string | null;
}

// Payload for creating an execution
export interface ExecutionCreate {
  quoteId: string;
}
