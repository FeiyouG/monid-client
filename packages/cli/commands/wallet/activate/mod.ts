/**
 * Activate wallet command - Set the active wallet for x402 payments
 */

import { Command } from "@cliffy/command";
import { loadConfig, saveConfig } from "../../../../lib/config.ts";
import { success, error, info } from "../../../../utils/display.ts";

export const activateCommand = new Command()
  .name("activate")
  .description("Set the active wallet for x402 payments")
  .option("-l, --label <label:string>", "Wallet label", { required: true })
  .action(async (options: { label: string }) => {
    try {
      const { label } = options;

      const config = await loadConfig();
      if (!config) {
        error("No configuration found");
        Deno.exit(1);
      }

      if (!config.wallets || config.wallets.length === 0) {
        error("No wallets found");
        info("Add a wallet with: monid wallet add --private-key <0x...> --label <name>");
        Deno.exit(1);
      }

      const wallet = config.wallets.find(w => w.label === label);
      if (!wallet) {
        error(`Wallet '${label}' not found`);
        info("Run 'monid wallet list' to see available wallets");
        Deno.exit(1);
      }

      config.activated_wallet = label;
      await saveConfig(config);

      success(`Activated wallet: ${label}`);
      info(`Address: ${wallet.address}`);
    } catch (err) {
      error(`Failed to activate wallet: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });
