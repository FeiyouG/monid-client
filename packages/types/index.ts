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

export interface AuthInfo {
  last_login: string;
  user_email?: string;
  user_id?: string;
}

// Re-export all types
export * from "./api.ts";
export * from "./verification-key.ts";
