/**
 * Config module entry point
 * Always exports from generated.ts (created by scripts/gen_config.ts)
 * 
 * Run `deno task config:gen:local` to generate from .env
 * Run `deno task config:gen` to generate from environment
 */

export type { AppConfig } from "./types.ts";
export { CONFIG, VERSION } from "./generated.ts";
