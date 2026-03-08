/**
 * Build-time configuration
 * This config is sourced from environment variables at build time
 * and baked into the binary.
 */

import { load } from "jsr:@std/dotenv";
await load({
  // optional: choose a specific path (defaults to ".env")
  envPath: ".env",
  // optional: also export to the process environment (so Deno.env can read it)
  export: true,
});

export const BUILD_CONFIG = {
  oauth: {
    domain: Deno.env.get("OAUTH_DOMAIN") || "your-app.clerk.accounts.dev",
    clientId: Deno.env.get("OAUTH_CLIENT_ID") || "",
    type: Deno.env.get("OAUTH_TYPE") || "clerk",
    redirectUri: Deno.env.get("OAUTH_REDIRECT_URI") || "http://localhost:8918/callback",
    scopes: (Deno.env.get("OAUTH_SCOPES") || "profile email openid").split(" "),
  },
  api: {
    endpoint: Deno.env.get("API_ENDPOINT") || "https://api.scopeos.xyz",
    dashboardUrl: Deno.env.get("DASHBOARD_URL") || "https://scopeos.xyz",
  },
} as const;
