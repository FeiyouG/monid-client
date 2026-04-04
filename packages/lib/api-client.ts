/**
 * Centralized API client with Bearer token authentication
 */

import { CONFIG } from "@monid/core";
import { loadConfig } from "./config.ts";
import { getSecret } from "./secrets.ts";

interface ApiRequestOptions {
  headers?: Record<string, string>;
}

/**
 * Make an authenticated API request using Bearer token.
 */
export async function makeAuthenticatedRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  options: ApiRequestOptions = {},
): Promise<T> {
  const config = await loadConfig();

  if (!config || !config.activated_key) {
    throw new Error(
      "No API key configured. Add one with 'monid keys add --api-key <key> --label <name>'.",
    );
  }

  const activatedKey = config.keys.find(
    (k) => k.label === config.activated_key,
  );
  if (!activatedKey) {
    throw new Error(
      `Active key '${config.activated_key}' not found in config. Check with 'monid keys list'.`,
    );
  }

  const apiKey = getSecret(config.activated_key);
  if (!apiKey) {
    throw new Error(
      `API key "${config.activated_key}" not found in credentials. Re-add with:\n  monid keys add --api-key <key> --label ${config.activated_key}`,
    );
  }

  const url = `${CONFIG.api.endpoint}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    method: method.toUpperCase(),
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function handleApiError(response: Response): Promise<never> {
  let errorMessage: string;
  let errorCode: number = response.status;

  try {
    const errorData = await response.json();
    errorMessage =
      errorData.message || errorData.error || JSON.stringify(errorData);
    if (errorData.code) errorCode = errorData.code;
  } catch {
    errorMessage = response.statusText;
  }

  const fullMessage = `API Error (${errorCode}): ${errorMessage}`;

  if (response.status === 401) {
    throw new Error(
      `${fullMessage}\n\nYour API key may be invalid or expired. Check with 'monid keys list' or add a new key with 'monid keys add'.`,
    );
  }
  if (response.status === 403) {
    throw new Error(
      `${fullMessage}\n\nPermission denied. Check your workspace access.`,
    );
  }
  if (response.status === 404) {
    throw new Error(
      `${fullMessage}\n\nResource not found or not accessible in your workspace.`,
    );
  }
  if (response.status === 408) {
    throw new Error(
      `${fullMessage}\n\nRequest timeout. The operation took too long to complete.`,
    );
  }

  throw new Error(fullMessage);
}
