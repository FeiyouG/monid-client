/**
 * Config module entry point
 * This re-exports from either dev.ts (for local development) or generated.ts (for compiled binaries)
 * 
 * During development: imports from dev.ts (env-based config)
 * During compile: imports from generated.ts (hardcoded config)
 */

// Export types
export type { AppConfig } from "./types.ts";

// For development, export from dev.ts
// For compiled binaries, the generator script will create generated.ts
// and build tools will use main.compile.ts which imports from generated.ts
export { CONFIG } from "./dev.ts";
