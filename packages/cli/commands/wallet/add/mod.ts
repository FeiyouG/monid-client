/**
 * Add wallet command
 * Stores an EVM private key securely for x402 payments
 */

import { Command } from "@cliffy/command";
import { join } from "@std/path";
import { loadConfig, saveConfig, createDefaultConfig, getWalletsDir } from "../../../../lib/config.ts";
import { encryptData, generateSystemPassword } from "../../../../lib/crypto.ts";
import { success, error } from "../../../../utils/display.ts";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Validate that a string is a valid EVM private key (0x-prefixed, 64 hex chars).
 */
function validatePrivateKey(key: string): void {
  if (!key.startsWith("0x")) {
    throw new Error("Private key must start with 0x");
  }
  if (key.length !== 66) {
    throw new Error("Private key must be 66 characters (0x + 64 hex chars)");
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("Private key must contain only hex characters after 0x");
  }
}

export const addCommand = new Command()
  .name("add")
  .description("Add an EVM wallet for x402 payments")
  .option("-k, --private-key <key:string>", "EVM private key (0x...)", { required: true })
  .option("-l, --label <label:string>", "Label for the wallet", { required: true })
  .action(async (options: { privateKey: string; label: string }) => {
    try {
      const { privateKey, label } = options;

      // Validate private key format
      try {
        validatePrivateKey(privateKey);
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        Deno.exit(1);
      }

      // Derive public address from private key
      let address: string;
      try {
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        address = account.address;
      } catch (err) {
        error(`Invalid private key: ${err instanceof Error ? err.message : String(err)}`);
        Deno.exit(1);
      }

      // Load config
      let config = await loadConfig();
      if (!config) {
        config = createDefaultConfig();
      }

      // Initialize wallets array if needed
      if (!config.wallets) {
        config.wallets = [];
      }

      // Check for duplicate labels
      if (config.wallets.some(w => w.label === label)) {
        error(`A wallet with label "${label}" already exists`);
        Deno.exit(1);
      }

      // Check label doesn't conflict with key labels
      if (config.keys.some(k => k.label === label)) {
        error(`Label "${label}" is already used by a key. Choose a different label.`);
        Deno.exit(1);
      }

      // Encrypt private key
      const password = await generateSystemPassword();
      const encryptedKey = await encryptData(privateKey, password);

      // Write encrypted key to wallets directory
      const walletsDir = await getWalletsDir();
      const keyPath = join(walletsDir, label);
      await Deno.writeTextFile(keyPath, encryptedKey);
      if (Deno.build.os !== "windows") {
        await Deno.chmod(keyPath, 0o600);
      }

      // Add wallet config entry
      config.wallets.push({
        type: "wallet",
        label,
        address,
      });

      // Auto-activate if first wallet
      if (config.wallets.length === 1) {
        config.activated_wallet = label;
      }

      await saveConfig(config);

      success("Wallet added successfully");
      console.log(`  Label:   ${label}`);
      console.log(`  Address: ${address}`);

      if (config.activated_wallet === label) {
        console.log(`  Status:  Activated`);
      }
    } catch (err) {
      error(`Failed to add wallet: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });
