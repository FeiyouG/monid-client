/**
 * x402 client setup
 * Provides a fetch wrapper that automatically handles 402 Payment Required
 * responses by signing USDC payment authorizations via an EVM wallet.
 */

import { join } from "@std/path";
import { loadConfig, getWalletsDir } from "./config.ts";
import { decryptData, generateSystemPassword } from "./crypto.ts";
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";
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
