/**
 * Shared utilities for auth commands
 */

import { CONFIG } from "@monid/core";
import type { UserInfo } from "@monid/types";

/**
 * Fetch user information from OAuth userinfo endpoint
 * Used by: login command
 */
export async function fetchUserInfo(accessToken: string): Promise<UserInfo> {
  const url = `https://${CONFIG.oauth.domain}/oauth/userinfo`;
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status} ${await response.text()}`);
  }

  return await response.json() as UserInfo;
}

/**
 * Revoke a key on the server
 * Used by: logout command
 */
export async function revokeKey(accessToken: string, workspaceId: string, keyId: string): Promise<boolean> {
  try {
    const url = `${CONFIG.api.endpoint}/v1/verification-keys/${keyId}/revoke`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "x-workspace-id": workspaceId,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
