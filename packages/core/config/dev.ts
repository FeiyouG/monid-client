import type { AppConfig } from "./types.ts";

/**
 * Development configuration
 * Reads from environment variables for local development flexibility
 * Used only when running via `deno run` (not in compiled binaries)
 */
export const CONFIG: AppConfig = {
  oauth: {
    domain: Deno.env.get("OAUTH_DOMAIN") || "funky-pegasus-93.clerk.accounts.dev",
    clientId: Deno.env.get("OAUTH_CLIENT_ID") || "9AwGVidNiAijmSF2",
    type: "clerk",
    redirectUri: Deno.env.get("OAUTH_REDIRECT_URI") || "http://localhost:8918/callback",
    scopes: (Deno.env.get("OAUTH_SCOPES") || "profile email openid").split(" "),
  },
  api: {
    endpoint: Deno.env.get("API_ENDPOINT") || "http://localhost:8080",
    dashboardUrl: Deno.env.get("DASHBOARD_URL") || "http://localhost:3000",
  },
};
