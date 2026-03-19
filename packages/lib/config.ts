/**
 * Configuration file management
 * Handles reading and writing YAML config files
 */

import { parse, stringify } from "@std/yaml";
import { join } from "@std/path";
import { ensureDir, exists } from "@std/fs";
import type { Config } from "../types/index.ts";
import { getShortFingerprint } from "../utils/fingerprint.ts";

const HOME_DIR = Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || "";
const CONFIG_DIR = join(HOME_DIR, ".monid");
const CONFIG_FILE = join(CONFIG_DIR, "config.yaml");
const CREDENTIALS_FILE = join(CONFIG_DIR, "credentials");
const KEYS_DIR = join(CONFIG_DIR, "keys");
const WALLETS_DIR = join(CONFIG_DIR, "wallets");

export async function ensureConfigDir(): Promise<void> {
  await ensureDir(CONFIG_DIR);
  await ensureDir(KEYS_DIR);
  await ensureDir(WALLETS_DIR);
}

export async function loadConfig(): Promise<Config | null> {
  await ensureConfigDir();
  
  if (!await exists(CONFIG_FILE)) {
    return null;
  }

  try {
    const content = await Deno.readTextFile(CONFIG_FILE);
    const config = parse(content) as Config;
    
    // Add fingerprint_short to existing keys if missing
    if (config?.keys) {
      let needsSave = false;
      for (const key of config.keys) {
        if ('fingerprint' in key && !key.fingerprint_short) {
          key.fingerprint_short = getShortFingerprint(key.fingerprint);
          needsSave = true;
        }
      }
      
      if (needsSave) {
        await saveConfig(config);
      }
    }
    
    return config;
  } catch (error) {
    throw new Error(`Failed to load config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await ensureConfigDir();
  
  try {
    const content = stringify(config);
    await Deno.writeTextFile(CONFIG_FILE, content);
    
    // Set file permissions to 0600 (owner read/write only)
    if (Deno.build.os !== "windows") {
      await Deno.chmod(CONFIG_FILE, 0o600);
    }
  } catch (error) {
    throw new Error(`Failed to save config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getConfigPath(): Promise<string> {
  return CONFIG_FILE;
}

export async function getCredentialsPath(): Promise<string> {
  await ensureConfigDir();
  return CREDENTIALS_FILE;
}

export async function getKeysDir(workspaceId?: string): Promise<string> {
  await ensureConfigDir();
  if (workspaceId) {
    const dir = join(KEYS_DIR, workspaceId);
    await ensureDir(dir);
    return dir;
  }
  return KEYS_DIR;
}

export async function getWalletsDir(): Promise<string> {
  await ensureConfigDir();
  return WALLETS_DIR;
}

export async function deleteConfig(): Promise<void> {
  try {
    if (await exists(CONFIG_FILE)) {
      await Deno.remove(CONFIG_FILE);
    }
    if (await exists(CREDENTIALS_FILE)) {
      await Deno.remove(CREDENTIALS_FILE);
    }
  } catch (error) {
    throw new Error(`Failed to delete config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function deleteCredentials(): Promise<void> {
  try {
    if (await exists(CREDENTIALS_FILE)) {
      await Deno.remove(CREDENTIALS_FILE);
    }
  } catch (error) {
    throw new Error(`Failed to delete credentials: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function createDefaultConfig(): Config {
  return {
    version: "1.0",
    keys: [],
  };
}
