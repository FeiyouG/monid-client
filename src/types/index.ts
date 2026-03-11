/**
 * Common types used throughout the CLI
 */

export interface Config {
  version: string;
  workspace?: WorkspaceConfig;
  keys: KeyConfig[];
  activated_key?: string;
  auth?: AuthInfo;
}

export interface WorkspaceConfig {
  id: string;
  slug: string;
  name?: string;
}

export interface KeyConfig {
  key_id: string;
  label: string;
  fingerprint: string;
  algorithm: string;
  created_at: string;
  expires_at?: string;
}

export interface AuthInfo {
  last_login: string;
  user_email?: string;
  user_id?: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
}

export interface WhoAmIResponse {
  user_id: string;
  workspace_id: string;
  workspace_name: string;
  email: string;
}

export interface WorkspaceSummary {
  workspaceId: string;
  slug: string;
}

export interface WorkspacesResponse {
  workspaces: WorkspaceSummary[];
}

export interface UserInfo {
  sub: string;  // User ID
  email: string;
  email_verified?: boolean;
  name?: string;
}

export interface ParsedArgs {
  _: (string | number)[];
  [key: string]: unknown;
  verbose?: boolean;
  yes?: boolean;
  label?: string;
  method?: string;
  data?: string;
  key?: string;
  header?: string[];
  output?: string;
  outputSchema?: string;
  inputSchema?: string;
  capabilities?: string;
  input?: string;
  wait?: boolean;
  limit?: number | string;
  cursor?: string;
  title?: string;
  description?: string;
}

// Re-export all types
export * from "./task.ts";
export * from "./quote.ts";
export * from "./search.ts";
export * from "./verification-key.ts";
