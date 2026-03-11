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

// Capability configuration for a task
export interface TaskCapability {
  capabilityId: string;
  prepareInput: Record<string, unknown>;
}

// Full task object returned by API
export interface Task {
  taskId: string;
  workspaceId: string;
  title: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  capabilities: TaskCapability[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Payload for creating a new task
export interface TaskCreate {
  title: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  capabilities: TaskCapability[];
  metadata?: Record<string, unknown>;
}

// Payload for updating a task
export interface TaskUpdate {
  title?: string;
  description?: string;
  inputSchema?: JSONSchema;
  outputSchema?: JSONSchema;
  capabilities?: TaskCapability[];
  metadata?: Record<string, unknown>;
}

// Paginated list response
export interface TasksListResponse {
  items: Task[];
  cursor?: string | null;
}
