/**
 * Add wallet command
 */

import { Command } from "@cliffy/command";
import { loadConfig, saveConfig, createDefaultConfig } from "../../../../lib/config.ts";
import { setSecret } from "../../../../lib/secrets.ts";
import { success, error } from "../../../../utils/display.ts";
import { privateKeyToAccount } from "viem/accounts";

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

      try {
        validatePrivateKey(privateKey);
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        Deno.exit(1);
      }

      let address: string;
      try {
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        address = account.address;
      } catch (err) {
        error(`Invalid private key: ${err instanceof Error ? err.message : String(err)}`);
        Deno.exit(1);
      }

      let config = await loadConfig();
      if (!config) {
        config = createDefaultConfig();
      }

      if (!config.wallets) {
        config.wallets = [];
      }

      if (config.wallets.some((w) => w.label === label)) {
        error(`A wallet with label "${label}" already exists`);
        Deno.exit(1);
      }

      if (config.keys.some((k) => k.label === label)) {
        error(`Label "${label}" is already used by a key. Choose a different label.`);
        Deno.exit(1);
      }

      setSecret(`wallet:${label}`, privateKey);

      config.wallets.push({ type: "wallet", label, address });

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
