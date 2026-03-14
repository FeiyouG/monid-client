/**
 * Credential storage
 * Simple encrypted storage for OAuth tokens
 */

import { getCredentialsPath } from "./config.ts";
import type { OAuthTokenResponse } from "../types/index.ts";

export async function saveCredentials(tokens: OAuthTokenResponse): Promise<void> {
  const credPath = await getCredentialsPath();
  
  const data = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    id_token: tokens.id_token,
    expires_at: Date.now() + (tokens.expires_in * 1000),
  };

  await Deno.writeTextFile(credPath, JSON.stringify(data, null, 2));
  
  // Set file permissions to 0600 (owner read/write only)
  if (Deno.build.os !== "windows") {
    await Deno.chmod(credPath, 0o600);
  }
}

export async function loadCredentials(): Promise<OAuthTokenResponse | null> {
  const credPath = await getCredentialsPath();
  
  try {
    const content = await Deno.readTextFile(credPath);
    const data = JSON.parse(content);
    
    // Check if expired
    if (data.expires_at && data.expires_at < Date.now()) {
      return null; // Expired
    }
    
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      id_token: data.id_token,
      token_type: "Bearer",
      expires_in: Math.floor((data.expires_at - Date.now()) / 1000),
    };
  } catch {
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  const creds = await loadCredentials();
  return creds?.access_token || null;
}

export async function clearCredentials(): Promise<void> {
  const credPath = await getCredentialsPath();
  try {
    await Deno.remove(credPath);
  } catch {
    // Ignore if file doesn't exist
  }
}
