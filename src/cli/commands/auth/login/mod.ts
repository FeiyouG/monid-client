/**
 * Login command - Authenticate with OAuth provider
 * Handles PKCE flow, workspace selection, and credential storage
 */

import { Command } from "@cliffy/command";
import { Table } from "@cliffy/table";
import { BUILD_CONFIG } from "../../../../config/build-config.ts";
import {
  createDefaultConfig,
  loadConfig,
  saveConfig,
} from "../../../../lib/config.ts";
import {
  saveCredentials,
  clearCredentials,
} from "../../../../lib/credentials.ts";
import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  generateCodeVerifier,
  startCallbackServer,
} from "../../../../lib/oauth.ts";
import { openBrowser } from "../../../../utils/browser.ts";
import { error, info, success } from "../../../../utils/display.ts";
import { ensureWorkspaceSelected } from "../../../../lib/workspace.ts";
import { fetchUserInfo } from "../helpers.ts";

export const loginCommand = new Command()
  .name("login")
  .description("Authenticate with OAuth provider")
  .option("-w, --workspace-id <id:string>", "Workspace ID to use (skips interactive selection)")
  .action(async (options: { workspaceId?: string }) => {
    try {
      info("Starting OAuth authentication...");

      // Generate PKCE parameters
      const codeVerifier = generateCodeVerifier();
      const { url } = await buildAuthorizationUrl(codeVerifier);

      // Start local callback server
      const { promise: codePromise } = await startCallbackServer();

      // Display auth message using Cliffy Table
      console.log("");
      new Table()
        .body([
          ["Please authenticate in your browser"],
          [""],
          ["Opening:", url],
          [""],
          ["Waiting for authentication..."],
        ])
        .border(true)
        .render();
      console.log("");

      await openBrowser(url);

      // Wait for callback
      const code = await codePromise;

      info("Received authorization code, exchanging for tokens...");

      // Exchange code for tokens
      const tokens = await exchangeCodeForToken(code, codeVerifier);

      // Save credentials (temporary - will be cleared on failure)
      await saveCredentials(tokens);

      // Ensure workspace is selected with revised logic
      try {
        await ensureWorkspaceSelected(
          tokens.access_token,
          options.workspaceId,  // Pass --workspace-id flag
          true  // isLogin = true (always fetch workspaces)
        );

        // Fetch user info
        info("Fetching user information...");
        const userInfo = await fetchUserInfo(tokens.access_token);

        // Update config with auth info
        const config = await loadConfig() || createDefaultConfig();
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
        console.log(
          "Next step: Generate an API key with 'scopeos-cli keys generate --label <your-key-name>'"
        );
      } catch (workspaceError) {
        // Workspace selection failed - clear credentials
        await clearCredentials();
        throw workspaceError;
      }
    } catch (err) {
      // Clear credentials on any login failure
      await clearCredentials();
      error(
        `Authentication failed: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      Deno.exit(1);
    }
  });
