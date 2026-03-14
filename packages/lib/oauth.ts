/**
 * OAuth PKCE flow implementation (provider-agnostic)
 */

import { encodeBase64Url } from "@std/encoding/base64url";
import { crypto } from "@std/crypto/crypto";
import { CONFIG } from "@scopeos/core";
import type { OAuthTokenResponse } from "@scopeos/types";

// Generate code verifier (random string for PKCE)
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return encodeBase64Url(array).replace(/=/g, "");
}

// Generate code challenge from verifier
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return encodeBase64Url(new Uint8Array(hashBuffer)).replace(/=/g, "");
}

// Build authorization URL
export async function buildAuthorizationUrl(codeVerifier: string): Promise<{ url: string, verifier: string }> {
  const challenge = await generateCodeChallenge(codeVerifier);
  const params = new URLSearchParams({
    client_id: CONFIG.oauth.clientId,
    redirect_uri: CONFIG.oauth.redirectUri,
    response_type: "code",
    scope: CONFIG.oauth.scopes.join(" "),
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  const url = `https://${CONFIG.oauth.domain}/oauth/authorize?${params.toString()}`;
  return { url, verifier: codeVerifier };
}

// Exchange authorization code for tokens
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<OAuthTokenResponse> {
  const tokenUrl = `https://${CONFIG.oauth.domain}/oauth/token`;
  
  const body = new URLSearchParams({
    client_id: CONFIG.oauth.clientId,
    code,
    redirect_uri: CONFIG.oauth.redirectUri,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  const tokens: OAuthTokenResponse = await response.json();
  return tokens;
}

// Decode JWT (simple, not verifying signature - we trust the OAuth provider)
export function decodeJWT(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  try {
    // Add padding if needed
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error(`Failed to decode JWT: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Start local callback server
export async function startCallbackServer(): Promise<{ port: number, promise: Promise<string> }> {
  const port = 8918; // Fixed port from config
  
  let resolveCode: (code: string) => void;
  let rejectCode: (error: Error) => void;
  
  const promise = new Promise<string>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const abortController = new AbortController();
  const shutdownServerSoon = () => {
    // Give the browser a brief moment to fully receive/render the response
    // before shutting down the local callback server.
    setTimeout(() => abortController.abort(), 250);
  };
  
  const handler = (req: Request): Response => {
    const url = new URL(req.url);
    
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      
      if (error) {
        rejectCode(new Error(`OAuth error: ${error}`));
        shutdownServerSoon();
        return new Response("Authentication failed. You can close this window.", {
          headers: { "Content-Type": "text/html" },
        });
      }
      
      if (code) {
        resolveCode(code);
        shutdownServerSoon();
        return new Response(`
          <!DOCTYPE html>
          <html>
            <title>Authentication Successful</title>
            <body>
              <h1>ScopeOS Authentication successful!</h1>
              <p>You can close this window and return to the CLI.</p>
            </body>
          </html>
        `, {
          headers: { "Content-Type": "text/html" },
        });
      }
    }
    
    return new Response("Not found", { status: 404 });
  };

  // Start server in background
  Deno.serve({ port, signal: abortController.signal }, handler);

  return { port, promise };
}
