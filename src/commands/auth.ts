/**
 * Auth commands: login, logout, whoami
 */

import { BUILD_CONFIG } from "../config/build-config.ts";
import {
  createDefaultConfig,
  deleteConfig,
  loadConfig,
  saveConfig,
  getKeysDir,
  deleteCredentials,
} from "../lib/config.ts";
import {
  getAccessToken,
  loadCredentials,
  saveCredentials,
} from "../lib/credentials.ts";
import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  generateCodeVerifier,
  startCallbackServer,
} from "../lib/oauth.ts";
import { openBrowser } from "../utils/browser.ts";
import { box, error, info, success, confirm } from "../utils/display.ts";
import { ensureWorkspaceSelected } from "../lib/workspace.ts";
import type { ParsedArgs, UserInfo, WhoAmIResponse } from "../types/index.ts";
import { join } from "@std/path";

export async function authCommand(
  subcommand: string,
  args: ParsedArgs,
): Promise<void> {
  switch (subcommand) {
    case "login":
      await authLogin(args);
      break;
    case "logout":
      await authLogout(args);
      break;
    case "whoami":
      await authWhoami(args);
      break;
    default:
      console.error(`Unknown auth subcommand: ${subcommand}`);
      console.log("Available: login, logout, whoami");
      Deno.exit(1);
  }
}

async function authLogin(args: ParsedArgs): Promise<void> {
  try {
    info("Starting OAuth authentication...");

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const { url } = await buildAuthorizationUrl(codeVerifier);

    // Start local callback server
    const { promise: codePromise } = await startCallbackServer();

    // Open browser
    console.log("");
    box(
      `Please authenticate in your browser\n\nOpening: ${url}\n\nWaiting for authentication...`,
    );
    console.log("");

    await openBrowser(url);

    // Wait for callback
    const code = await codePromise;

    info("Received authorization code, exchanging for tokens...");

    // Exchange code for tokens
    const tokens = await exchangeCodeForToken(code, codeVerifier);

    // Save credentials
    await saveCredentials(tokens);

    // Ensure workspace is selected
    const workspaceId = await ensureWorkspaceSelected(tokens.access_token);

    // Fetch user info from OAuth userinfo endpoint
    info("Fetching user information...");
    const userInfo = await fetchUserInfo(tokens.access_token);

    // Load config (should exist now after ensureWorkspaceSelected)
    const config = await loadConfig() || createDefaultConfig();

    // Update auth info
    config.auth = {
      last_login: new Date().toISOString(),
      user_email: userInfo.email,
      user_id: userInfo.sub,
    };

    await saveConfig(config);

    console.log("");
    success(`Authenticated as ${userInfo.email}`);
    if (config.workspace) {
      success(`Workspace: ${config.workspace.slug} (${config.workspace.id})`);
    }
    console.log("");

    // Prompt to generate keys
    console.log(
      "Next step: Generate an API key with 'scopeos-cli keys generate --label <your-key-name>'",
    );
  } catch (err) {
    error(
      `Authentication failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    throw err;
  }
}

async function authLogout(args: ParsedArgs): Promise<void> {
  try {
    const config = await loadConfig();
    
    // If no config or no keys, just delete everything
    if (!config || config.keys.length === 0) {
      await deleteConfig();
      success("Logged out successfully");
      success("Local credentials cleared");
      return;
    }
    
    // List keys that will be revoked
    console.log("\nThe following keys will be revoked on the server:");
    for (const key of config.keys) {
      console.log(`  - ${key.label} (${key.key_id})`);
    }
    console.log("");
    
    // Ask for confirmation
    const confirmed = await confirm(
      "This will revoke all keys and clear local credentials. Continue?",
      args.yes as boolean || false
    );
    
    if (!confirmed) {
      info("Logout cancelled");
      return;
    }
    
    info("Revoking keys...");
    
    // Try to get access token
    const accessToken = await getAccessToken();
    const failedRevocations: string[] = [];
    
    if (accessToken && config.workspace) {
      // Attempt to revoke each key
      for (const key of config.keys) {
        const revoked = await revokeKey(accessToken, config.workspace.id, key.key_id);
        if (!revoked) {
          failedRevocations.push(`${key.label} (${key.key_id})`);
        }
      }
    } else {
      // No valid token - can't revoke
      info("No valid authentication token - skipping server-side revocation");
      failedRevocations.push(...config.keys.map(k => `${k.label} (${k.key_id})`));
    }
    
    // Delete all local key files
    if (config.workspace) {
      try {
        const keysDir = await getKeysDir(config.workspace.id);
        for (const key of config.keys) {
          try {
            const keyPath = join(keysDir, key.label);
            await Deno.remove(keyPath);
          } catch {
            // Ignore if file doesn't exist
          }
        }
      } catch {
        // Ignore if keys directory doesn't exist
      }
    }
    
    // Clear keys and auth from config, but keep workspace
    config.keys = [];
    delete config.activated_key;
    delete config.auth;
    await saveConfig(config);
    
    // Delete credentials
    await deleteCredentials();
    
    console.log("");
    success("Logged out successfully");
    success("Local credentials cleared");
    success("Local key files deleted");
    success("Config cleared (workspace info preserved)");
    
    // Warn about failed revocations
    if (failedRevocations.length > 0) {
      console.log("");
      error(`Warning: Failed to revoke ${failedRevocations.length} key(s) on the server:`);
      for (const failed of failedRevocations) {
        console.log(`  - ${failed}`);
      }
      console.log("");
      info(`Please manually revoke them at: ${BUILD_CONFIG.api.dashboardUrl}/dashboard/verification-keys`);
    }
    
    console.log("");
  } catch (err) {
    error(`Logout failed: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

async function authWhoami(args: ParsedArgs): Promise<void> {
  try {
    const config = await loadConfig();

    if (!config || !config.workspace) {
      error("Not authenticated. Run 'scopeos-cli auth login' first.");
      Deno.exit(1);
    }

    const workspaceLabel = config.workspace.slug || config.workspace.name || "unknown";
    box(
      [
        `User Email:      ${config.auth?.user_email || "unknown"}`,
        `User ID:         ${config.auth?.user_id || "unknown"}`,
        `Workspace Name:  ${workspaceLabel}`,
        `Workspace ID:    ${config.workspace.id}`,
        `Last login:      ${config.auth?.last_login || "unknown"}`,
        `Active Key:      ${config.activated_key || "none (run 'keys generate' to create one)"}`
      ].join("\n"),
    );

    // Check if credentials are still valid
    const creds = await loadCredentials();
    if (creds) {
      console.log(
        `Token status: valid (expires in ${
          Math.floor(creds.expires_in / 60)
        } minutes)`,
      );
    } else {
      console.log(
        "Token status: expired (re-login may be required for key registration)",
      );
    }

    console.log("");
  } catch (err) {
    error(
      `Failed to get user info: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    throw err;
  }
}

async function fetchUserInfo(accessToken: string): Promise<UserInfo> {
  const url = `https://${BUILD_CONFIG.oauth.domain}/oauth/userinfo`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch user info: ${response.status} ${errorText}`,
    );
  }

  const data: UserInfo = await response.json();
  return data;
}

async function revokeKey(accessToken: string, workspaceId: string, keyId: string): Promise<boolean> {
  const url = `${BUILD_CONFIG.api.endpoint}/v1/verification-keys/${keyId}/revoke`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "x-workspace-id": workspaceId,
      },
    });
    
    return response.ok;
  } catch (_error) {
    return false;
  }
}
