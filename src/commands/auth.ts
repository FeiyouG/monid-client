/**
 * Auth commands: login, logout, whoami
 */

import { BUILD_CONFIG } from "../config/build-config.ts";
import { loadConfig, saveConfig, createDefaultConfig, deleteConfig } from "../lib/config.ts";
import { saveCredentials, loadCredentials, getAccessToken } from "../lib/credentials.ts";
import {
  generateCodeVerifier,
  buildAuthorizationUrl,
  startCallbackServer,
  exchangeCodeForToken,
} from "../lib/oauth.ts";
import { openBrowser } from "../utils/browser.ts";
import { success, error, info, box } from "../utils/display.ts";
import { ensureWorkspaceSelected } from "../lib/workspace.ts";
import type { ParsedArgs, WhoAmIResponse, UserInfo } from "../types/index.ts";

export async function authCommand(subcommand: string, args: ParsedArgs): Promise<void> {
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
    box(`Please authenticate in your browser\n\nOpening: ${url}\n\nWaiting for authentication...`);
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
    console.log("Next step: Generate an API key with 'scopeos-cli keys generate --label <your-key-name>'");
    
  } catch (err) {
    error(`Authentication failed: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

async function authLogout(_args: ParsedArgs): Promise<void> {
  try {
    await deleteConfig();
    success("Logged out successfully");
    success("Local credentials cleared");
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
    
    console.log("");
    console.log(`Email: ${config.auth?.user_email || "unknown"}`);
    console.log(`User ID: ${config.auth?.user_id || "unknown"}`);
    const workspaceLabel = config.workspace.slug || config.workspace.name || "unknown";
    console.log(`Workspace: ${workspaceLabel} (${config.workspace.id})`);
    console.log(`Workspace ID: ${config.workspace.id}`);
    console.log(`Last login: ${config.auth?.last_login || "unknown"}`);
    
    if (config.activated_key) {
      console.log(`Active key: ${config.activated_key}`);
    } else {
      console.log("Active key: none (run 'keys generate' to create one)");
    }
    
    // Check if credentials are still valid
    const creds = await loadCredentials();
    if (creds) {
      console.log(`Token status: valid (expires in ${Math.floor(creds.expires_in / 60)} minutes)`);
    } else {
      console.log("Token status: expired (re-login may be required for key registration)");
    }
    
    console.log("");
  } catch (err) {
    error(`Failed to get user info: ${err instanceof Error ? err.message : String(err)}`);
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
    throw new Error(`Failed to fetch user info: ${response.status} ${errorText}`);
  }
  
  const data: UserInfo = await response.json();
  return data;
}
