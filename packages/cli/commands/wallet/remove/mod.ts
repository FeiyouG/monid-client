/**
 * Remove wallet command
 */

import { Command } from "@cliffy/command";
import { join } from "@std/path";
import { exists } from "@std/fs";
import { loadConfig, saveConfig, getWalletsDir } from "../../../../lib/config.ts";
import { success, error } from "../../../../utils/display.ts";

export const removeCommand = new Command()
  .name("remove")
  .description("Remove a wallet")
  .option("-l, --label <label:string>", "Label of the wallet to remove", { required: true })
  .action(async (options: { label: string }) => {
    try {
      const { label } = options;

      const config = await loadConfig();
      if (!config || !config.wallets || config.wallets.length === 0) {
        error("No wallets found");
        Deno.exit(1);
      }

      const wallet = config.wallets.find(w => w.label === label);
      if (!wallet) {
        error(`Wallet not found: ${label}`);
        Deno.exit(1);
      }

      // Remove encrypted key file
      const walletsDir = await getWalletsDir();
      const keyPath = join(walletsDir, label);
      if (await exists(keyPath)) {
        await Deno.remove(keyPath);
      }

      // Remove from config
      const walletIndex = config.wallets.findIndex(w => w.label === label);
      config.wallets.splice(walletIndex, 1);

      // Clear activation if this was the active wallet
      if (config.activated_wallet === label) {
        delete config.activated_wallet;
      }

      await saveConfig(config);

      success("Wallet removed successfully");
      console.log(`  Label:   ${label}`);
      console.log(`  Address: ${wallet.address}`);
    } catch (err) {
      error(`Failed to remove wallet: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  });
