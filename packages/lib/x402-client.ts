/**
 * x402 client setup
 * Provides a fetch wrapper that automatically handles 402 Payment Required
 * responses by signing USDC payment authorizations via an EVM wallet.
 * Also provides SIWX (Sign-In with X) authenticated requests for polling
 * run status without additional x402 payment.
 */

import { CONFIG } from "@monid/core";
import { loadConfig } from "./config.ts";
import { getSecret } from "./secrets.ts";
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
import type { RunResponse } from "../types/api.ts";

/**
 * Load a wallet's private key from the credentials file.
 */
function loadWalletPrivateKey(label: string): `0x${string}` {
  const privateKey = getSecret(`wallet:${label}`);
  if (!privateKey) {
    throw new Error(
      `Wallet key not found for "${label}". Re-add with:\n  monid wallet add --private-key <key> --label ${label}`,
    );
  }
  return privateKey as `0x${string}`;
}

/**
 * Get the active wallet label from config.
 */
export async function getActiveWalletLabel(): Promise<string> {
  const config = await loadConfig();

  if (!config || !config.wallets || config.wallets.length === 0) {
    throw new Error(
      "No wallets configured. Add one with: monid wallet add --label <name> --private-key <0x...>",
    );
  }

  if (!config.activated_wallet) {
    throw new Error(
      "No wallet activated. Activate one with: monid wallet activate --label <name>",
    );
  }

  const wallet = config.wallets.find(
    (w) => w.label === config.activated_wallet,
  );
  if (!wallet) {
    throw new Error(
      `Activated wallet "${config.activated_wallet}" not found in config. Run: monid wallet list`,
    );
  }

  return wallet.label;
}

/**
 * Get the active wallet's public address from config (no secret access needed).
 */
export async function getActiveWalletAddress(): Promise<string> {
  const config = await loadConfig();
  if (!config?.activated_wallet || !config.wallets) {
    throw new Error("No active wallet configured.");
  }

  const wallet = config.wallets.find(
    (w) => w.label === config.activated_wallet,
  );
  if (!wallet) {
    throw new Error(
      `Activated wallet "${config.activated_wallet}" not found.`,
    );
  }

  return wallet.address;
}

/**
 * Create an x402-wrapped fetch function using the active wallet.
 */
export async function createX402Fetch(): Promise<typeof fetch> {
  const walletLabel = await getActiveWalletLabel();
  const privateKey = loadWalletPrivateKey(walletLabel);

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
// SIWX (Sign-In with X) authenticated requests for run polling
// ---------------------------------------------------------------------------

function getApiDomain(): string {
  try {
    return new URL(CONFIG.api.endpoint).hostname;
  } catch {
    return CONFIG.api.endpoint;
  }
}

function getRunUrl(runId: string): string {
  return `${CONFIG.api.endpoint}/x402/v1/runs/${runId}`;
}

export async function createSIWxHeaders(
  runId: string,
): Promise<Record<string, string>> {
  const walletLabel = await getActiveWalletLabel();
  const privateKey = loadWalletPrivateKey(walletLabel);
  const signer = privateKeyToAccount(privateKey);

  const uri = getRunUrl(runId);
  const domain = getApiDomain();

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const issuedAt = new Date().toISOString();

  const siwxPayload = await createSIWxPayload(
    {
      domain,
      uri,
      statement: "Sign in to access your run results",
      version: "1",
      chainId: "eip155:84532",
      type: "eip191" as const,
      nonce,
      issuedAt,
    },
    signer,
  );

  const siwxHeader = encodeSIWxHeader(siwxPayload);
  return { "sign-in-with-x": siwxHeader };
}

const MAX_BACKOFF_MS = 3000;
const BACKOFF_STEP_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number): number {
  const ceiling = Math.min(attempt * BACKOFF_STEP_MS, MAX_BACKOFF_MS);
  return Math.floor(Math.random() * ceiling);
}

export async function fetchX402Run(runId: string): Promise<RunResponse> {
  const headers = await createSIWxHeaders(runId);
  const url = getRunUrl(runId);

  const response = await fetch(url, { method: "GET", headers });

  if (!response.ok && response.status !== 408) {
    let errorMessage: string;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || JSON.stringify(errorData);
    } catch {
      errorMessage = response.statusText;
    }
    throw new Error(
      `Failed to fetch run (${response.status}): ${errorMessage}`,
    );
  }

  return (await response.json()) as RunResponse;
}

export async function waitForX402Run(
  runId: string,
  totalTimeoutSec?: number,
): Promise<RunResponse> {
  const timeout = totalTimeoutSec ?? 300;
  const start = Date.now();
  let attempt = 0;

  while (true) {
    const run = await fetchX402Run(runId);

    if (run.status === "COMPLETED" || run.status === "FAILED") {
      return run;
    }

    const elapsed = (Date.now() - start) / 1000;
    if (elapsed >= timeout) {
      throw new Error(`Timeout after ${timeout}s waiting for run ${runId}`);
    }

    attempt++;
    await sleep(backoffDelay(attempt));
  }
}
