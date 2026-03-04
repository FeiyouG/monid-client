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
  name: string;
}

export interface KeyConfig {
  key_id: string;
  label: string;
  fingerprint: string;
  algorithm: string;
  status: string;
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

export interface ParsedArgs {
  _: (string | number)[];
  [key: string]: unknown;
  verbose?: boolean;
  label?: string;
  method?: string;
  data?: string;
  key?: string;
  header?: string[];
  output?: string;
}
