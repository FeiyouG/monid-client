/**
 * Common types used throughout the CLI
 */

// Union type for all keys
export type UnifiedKeyConfig = VerificationKeyConfig | ApiKeyConfig;

export interface WalletConfig {
  type: "wallet";
  label: string;
  address: string;  // Derived 0x public address for display
}

export interface Config {
  version: string;
  workspace?: WorkspaceConfig;
  keys: UnifiedKeyConfig[];
  activated_key?: string;
  wallets?: WalletConfig[];
  activated_wallet?: string;
  auth?: AuthInfo;
}

export interface ApiKeyConfig {
  type: "api";
  label: string;
  key_encrypted: string;
  prefix: string;
}

export interface WorkspaceConfig {
  id: string;
  slug: string;
  name?: string;
}

export interface VerificationKeyConfig {
  type: "verification";
  key_id: string;
  label: string;
  fingerprint: string;
  fingerprint_short?: string;  // 7-char hex short fingerprint for display
  algorithm: string;
  status: string;  // "ACTIVE" or "REVOKED"
  created_at: string;
  expires_at?: string;
}

// Legacy export for backward compatibility
export type KeyConfig = VerificationKeyConfig;

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
  wait?: boolean | number;
  limit?: number | string;
  cursor?: string;
  title?: string;
  description?: string;
  expiresAt?: string;
}

// Re-export all types
export * from "./task.ts";
export * from "./quote.ts";
export * from "./search.ts";
export * from "./verification-key.ts";
