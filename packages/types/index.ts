/**
 * Common types used throughout the CLI
 */

export interface ApiKeyConfig {
  type: "api";
  label: string;
  prefix: string;
  /** @deprecated Legacy field from old encryption scheme. Removed during migration. */
  key_encrypted?: string;
}

export interface WalletConfig {
  type: "wallet";
  label: string;
  address: string;
}

export interface Config {
  version: string;
  keys: ApiKeyConfig[];
  activated_key?: string;
  wallets?: WalletConfig[];
  activated_wallet?: string;
}

// Re-export all types
export * from "./api.ts";
