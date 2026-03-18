/**
 * Search/Execution types for Monid API
 */

import type { Price } from "./quote.ts";

// Execution status
export type ExecutionStatus = "READY" | "RUNNING" | "COMPLETED" | "FAILED";

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
  output?: unknown;  // Can be any JSON
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
