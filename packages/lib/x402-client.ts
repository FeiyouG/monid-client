/**
 * x402 client setup
 * Provides a fetch wrapper that automatically handles 402 Payment Required
 * responses by signing USDC payment authorizations via an EVM wallet.
 * Also provides SIWX (Sign-In with X) authenticated requests for polling
 * execution status without additional x402 payment.
 */

import { join } from "@std/path";
import { CONFIG } from "@monid/core";
import { loadConfig, getWalletsDir } from "./config.ts";
import { decryptData, generateSystemPassword } from "./crypto.ts";
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";
import {
  createSIWxPayload,
  encodeSIWxHeader,
} from "@x402/extensions/sign-in-with-x";
import { baseSepolia } from "viem/chains";
import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Load and decrypt a wallet's private key from disk.
 */
async function loadWalletPrivateKey(label: string): Promise<`0x${string}`> {
  const walletsDir = await getWalletsDir();
  const keyPath = join(walletsDir, label);

  let encryptedKey: string;
  try {
    encryptedKey = await Deno.readTextFile(keyPath);
  } catch {
    throw new Error(`Wallet key file not found for "${label}". Was it deleted outside the CLI?`);
  }

  const password = await generateSystemPassword();
  const privateKey = await decryptData(encryptedKey.trim(), password);

  return privateKey as `0x${string}`;
}

/**
 * Get the active wallet label from config.
 * Throws if no wallet is configured or activated.
 */
export async function getActiveWalletLabel(): Promise<string> {
  const config = await loadConfig();

  if (!config || !config.wallets || config.wallets.length === 0) {
    throw new Error(
      "No wallets configured. Add one with: monid wallet add --label <name> --private-key <0x...>"
    );
  }

  if (!config.activated_wallet) {
    throw new Error(
      "No wallet activated. Activate one with: monid wallet activate --label <name>"
    );
  }

  const wallet = config.wallets.find(w => w.label === config.activated_wallet);
  if (!wallet) {
    throw new Error(
      `Activated wallet "${config.activated_wallet}" not found in config. Run: monid wallet list`
    );
  }

  return wallet.label;
}

/**
 * Get the active wallet's public address from config (no decryption needed).
 */
export async function getActiveWalletAddress(): Promise<string> {
  const config = await loadConfig();
  if (!config?.activated_wallet || !config.wallets) {
    throw new Error("No active wallet configured.");
  }

  const wallet = config.wallets.find(w => w.label === config.activated_wallet);
  if (!wallet) {
    throw new Error(`Activated wallet "${config.activated_wallet}" not found.`);
  }

  return wallet.address;
}

/**
 * Create an x402-wrapped fetch function using the active wallet.
 * The returned fetch handles 402 Payment Required responses automatically.
 */
export async function createX402Fetch(): Promise<typeof fetch> {
  const walletLabel = await getActiveWalletLabel();
  const privateKey = await loadWalletPrivateKey(walletLabel);

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  const signer = toClientEvmSigner(account, publicClient);
  const client = new x402Client();
  client.register("eip155:*", new ExactEvmScheme(signer));

  return wrapFetchWithPayment(fetch, client);
}

// ---------------------------------------------------------------------------
// SIWX (Sign-In with X) authenticated requests for execution polling
// ---------------------------------------------------------------------------

/**
 * Extract the hostname from the API endpoint URL for use as the SIWX domain.
 */
function getApiDomain(): string {
  try {
    return new URL(CONFIG.api.endpoint).hostname;
  } catch {
    return CONFIG.api.endpoint;
  }
}

/**
 * Build the execution URL for a given execution ID.
 */
function getExecutionUrl(executionId: string): string {
  return `${CONFIG.api.endpoint}/x402/v1/executions/${executionId}`;
}

/**
 * Create SIWX-authenticated headers for a given execution ID.
 * Signs a SIWX message proving wallet ownership without requiring x402 payment.
 */
export async function createSIWxHeaders(executionId: string): Promise<Record<string, string>> {
  const walletLabel = await getActiveWalletLabel();
  const privateKey = await loadWalletPrivateKey(walletLabel);
  const signer = privateKeyToAccount(privateKey);

  const uri = getExecutionUrl(executionId);
  const domain = getApiDomain();

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const issuedAt = new Date().toISOString();

  const siwxPayload = await createSIWxPayload(
    {
      domain,
      uri,
      statement: "Sign in to access your execution results",
      version: "1",
      chainId: "eip155:84532", // Base Sepolia
      type: "eip191" as const,
      nonce,
      issuedAt,
    },
    signer,
  );

  const siwxHeader = encodeSIWxHeader(siwxPayload);

  return { "sign-in-with-x": siwxHeader };
}

/**
 * Response shape from the x402 execution endpoint.
 */
export interface X402Execution {
  executionId: string;
  status: string;
  output?: unknown;
  error?: string;
  siwx?: {
    domain: string;
    uri: string;
    statement?: string;
    version?: string;
  };
  [key: string]: unknown;
}

/**
 * Make a single SIWX-authenticated GET request to fetch execution status.
 * No x402 payment is needed — SIWX proves wallet ownership.
 */
export async function fetchX402Execution(executionId: string): Promise<X402Execution> {
  const headers = await createSIWxHeaders(executionId);
  const url = getExecutionUrl(executionId);

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok && response.status !== 408) {
    let errorMessage: string;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
    } catch {
      errorMessage = response.statusText;
    }
    throw new Error(`Failed to fetch execution (${response.status}): ${errorMessage}`);
  }

  return await response.json() as X402Execution;
}

/**
 * Poll an x402 execution until it reaches a terminal state (COMPLETED or FAILED).
 * Uses exponential backoff consistent with the standard polling infrastructure.
 */
export async function pollX402Execution(
  executionId: string,
  options: { timeoutSeconds?: number; initialDelayMs?: number; maxDelayMs?: number } = {},
): Promise<X402Execution> {
  const initialDelayMs = options.initialDelayMs ?? 2000;
  const maxDelayMs = options.maxDelayMs ?? 30000;
  const timeoutMs = options.timeoutSeconds !== undefined
    ? options.timeoutSeconds * 1000
    : 300000; // 5 minutes default

  const startTime = Date.now();
  let delay = initialDelayMs;

  while (true) {
    const execution = await fetchX402Execution(executionId);

    if (execution.status === "COMPLETED" || execution.status === "FAILED") {
      return execution;
    }

    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Polling timeout after ${Math.floor(timeoutMs / 1000)} seconds`);
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 2, maxDelayMs);
  }
}
