/**
 * Configuration file management
 *
 * Config directory resolution:
 *   1. $XDG_CONFIG_HOME/monid/  (if XDG_CONFIG_HOME is set)
 *   2. ~/.config/monid/         (XDG default)
 *   3. ~/.monid/                (if config.yaml already exists there)
 *
 * New installs create at the XDG path. Existing ~/.monid/ installs stay there.
 */

import { parse, stringify } from "@std/yaml";
import { join } from "@std/path";
import { ensureDir, exists } from "@std/fs";
import type { Config } from "../types/index.ts";

const HOME_DIR = Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || "";

function resolveConfigDir(): string {
  const xdgConfig = Deno.env.get("XDG_CONFIG_HOME") || join(HOME_DIR, ".config");
  const xdgMonid = join(xdgConfig, "monid");
  const legacyMonid = join(HOME_DIR, ".monid");

  // If legacy ~/.monid/config.yaml exists, keep using that directory
  try {
    if (Deno.statSync(join(legacyMonid, "config.yaml")).isFile) {
      return legacyMonid;
    }
  } catch { /* doesn't exist */ }

  // If XDG location already has config, use it
  try {
    if (Deno.statSync(join(xdgMonid, "config.yaml")).isFile) {
      return xdgMonid;
    }
  } catch { /* doesn't exist */ }

  // New install -> create at XDG
  return xdgMonid;
}

const CONFIG_DIR = resolveConfigDir();
const CONFIG_FILE = join(CONFIG_DIR, "config.yaml");
const WALLETS_DIR = join(CONFIG_DIR, "wallets");

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export async function ensureConfigDir(): Promise<void> {
  await ensureDir(CONFIG_DIR);
  await ensureDir(WALLETS_DIR);
}

export async function loadConfig(): Promise<Config | null> {
  await ensureConfigDir();

  if (!await exists(CONFIG_FILE)) {
    return null;
  }

  try {
    const content = await Deno.readTextFile(CONFIG_FILE);
    return parse(content) as Config;
  } catch (error) {
    throw new Error(`Failed to load config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await ensureConfigDir();

  try {
    const content = stringify(config as unknown as Record<string, unknown>);
    await Deno.writeTextFile(CONFIG_FILE, content);
    if (Deno.build.os !== "windows") {
      await Deno.chmod(CONFIG_FILE, 0o600);
    }
  } catch (error) {
    throw new Error(`Failed to save config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getWalletsDir(): Promise<string> {
  await ensureConfigDir();
  return WALLETS_DIR;
}

export function createDefaultConfig(): Config {
  return {
    version: "1.0",
    keys: [],
  };
}
