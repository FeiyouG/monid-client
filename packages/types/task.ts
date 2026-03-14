/**
 * Task types for ScopeOS API
 */

// JSON Schema type (simplified)
export interface JSONSchema {
  type?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  [key: string]: unknown;
}

// // Capability configuration for a task
// export interface TaskCapability {
//   capabilityId: string;
//   prepareInput: Record<string, unknown>;
// }

// Full task object returned by API
export interface Task {
  taskId: string;
  workspaceId: string;
  name: string;
  description: string;
  query: string;
  outputSchema: JSONSchema;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Payload for creating a new task
export interface TaskCreate {
  name: string;
  description: string | undefined;
  query: string;
  outputSchema: JSONSchema;
  metadata?: Record<string, unknown>;
}

// Payload for updating a task
export interface TaskUpdate {
  name?: string;
  description?: string;
}

// Paginated list response
export interface TasksListResponse {
  items: Task[];
  cursor?: string | null;
}
