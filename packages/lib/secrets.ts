/**
 * Plaintext credential store.
 *
 * Stores API keys and wallet private keys in a JSON file with 0600 permissions.
 * Same security model as AWS CLI (~/.aws/credentials), GitHub CLI, Vercel, npm.
 * The OS user account is the trust boundary.
 */

import { ensureDirSync } from "@std/fs";
import { join, dirname } from "@std/path";
import { getConfigDir } from "./config.ts";

function getCredentialsPath(): string {
  return join(getConfigDir(), "credentials");
}

function loadStore(): Record<string, string> {
  try {
    return JSON.parse(Deno.readTextFileSync(getCredentialsPath()));
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, string>): void {
  const path = getCredentialsPath();
  ensureDirSync(dirname(path));
  Deno.writeTextFileSync(path, JSON.stringify(store, null, 2) + "\n");
  if (Deno.build.os !== "windows") {
    try { Deno.chmodSync(path, 0o600); } catch { /* ignore */ }
  }
}

export function getSecret(label: string): string | null {
  return loadStore()[label] ?? null;
}

export function setSecret(label: string, value: string): void {
  const store = loadStore();
  store[label] = value;
  saveStore(store);
}

export function deleteSecret(label: string): void {
  const store = loadStore();
  delete store[label];
  saveStore(store);
}
