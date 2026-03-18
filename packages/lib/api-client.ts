/**
 * Centralized API client with signature-based authentication
 */

import { CONFIG } from "@monid/core";
import { loadConfig } from "./config.ts";
import { getAccessToken } from "./credentials.ts";
import { signRequest } from "./signing.ts";
import { decryptData, generateSystemPassword } from "./crypto.ts";

export interface ApiError {
  code: number;
  message: string;
}

export interface ApiRequestOptions {
  useOAuth?: boolean;  // Force OAuth instead of signature auth
  headers?: Record<string, string>;  // Additional headers
}

/**
 * Get decrypted API key by label
 */
async function getDecryptedApiKey(label: string): Promise<string> {
  const config = await loadConfig();
  const key = config?.keys.find(k => k.label === label);
  
  if (!key) {
    throw new Error(`Key not found: ${label}`);
  }
  
  if (key.type !== "api") {
    throw new Error(`Key '${label}' is not an API key`);
  }
  
  const password = await generateSystemPassword();
  const decryptedKey = await decryptData(key.key_encrypted, password);
  
  return decryptedKey;
}

/**
 * Make an authenticated API request
 * Tries signature-based auth first, falls back to OAuth if signature fails
 */
export async function makeAuthenticatedRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  options: ApiRequestOptions = {}
): Promise<T> {
  const config = await loadConfig();
  
  // Find the activated key to determine its type
  const activatedKey = config?.activated_key 
    ? config.keys.find(k => k.label === config.activated_key)
    : undefined;

  // API keys don't require workspace or auth
  // Only verification keys need these checks
  if (activatedKey?.type === "verification") {
    if (!config || !config.workspace) {
      throw new Error("Not authenticated. Run 'monid auth login' first.");
    }
  }

  const url = `${CONFIG.api.endpoint}${path}`;

  // Prepare headers
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Check activated key type
  if (activatedKey?.type === "api" && config.activated_key) {
    // Use API key authentication
    const apiKey = await getDecryptedApiKey(config.activated_key);
    headers["Authorization"] = `Bearer ${apiKey}`;
    
  } else if (activatedKey?.type === "verification" && config.activated_key && !options.useOAuth) {
    // Try signature-based auth
    try {
      const bodyString = body ? JSON.stringify(body) : undefined;
      const signatureHeaders = await signRequest(method, path, bodyString);
      
      // Add signature headers
      headers = {
        ...headers,
        ...signatureHeaders,
      };
    } catch (error) {
      // Signature auth failed, try OAuth fallback
      console.warn(`Signature auth failed: ${error instanceof Error ? error.message : String(error)}`);
      console.warn("Falling back to OAuth authentication...");
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication required.");
      }
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    
  } else {
    // No activated key - use OAuth only
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error("Authentication required. Run 'monid auth login' first.");
    }
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  // Make request
  const response = await fetch(url, {
    method: method.toUpperCase(),
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle errors
  if (!response.ok) {
    await handleApiError(response);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  // Parse and return response
  const data = await response.json();
  return data as T;
}

/**
 * Handle API error responses
 */
async function handleApiError(response: Response): Promise<never> {
  let errorMessage: string;
  let errorCode: number = response.status;

  try {
    const errorData = await response.json();
    if (errorData.message) {
      errorMessage = errorData.message;
    } else if (errorData.error) {
      errorMessage = errorData.error;
    } else {
      errorMessage = JSON.stringify(errorData);
    }
    if (errorData.code) {
      errorCode = errorData.code;
    }
  } catch {
    // Failed to parse JSON error
    errorMessage = response.statusText;
  }

  // Add status code to message
  const fullMessage = `API Error (${errorCode}): ${errorMessage}`;

  // Special handling for common errors
  if (response.status === 401) {
    throw new Error(`${fullMessage}\n\nAuthentication expired. Run 'monid auth login' to re-authenticate.`);
  }

  if (response.status === 403) {
    throw new Error(`${fullMessage}\n\nPermission denied. Check your workspace access.`);
  }

  if (response.status === 404) {
    throw new Error(`${fullMessage}\n\nResource not found or not accessible in your workspace.`);
  }

  if (response.status === 408) {
    throw new Error(`${fullMessage}\n\nRequest timeout. The operation took too long to complete.`);
  }

  throw new Error(fullMessage);
}

/**
 * Make a simple GET request
 */
export async function apiGet<T>(
  path: string,
  options?: ApiRequestOptions
): Promise<T> {
  return makeAuthenticatedRequest<T>("GET", path, undefined, options);
}

/**
 * Make a POST request
 */
export async function apiPost<T>(
  path: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  return makeAuthenticatedRequest<T>("POST", path, body, options);
}

/**
 * Make a PATCH request
 */
export async function apiPatch<T>(
  path: string,
  body: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  return makeAuthenticatedRequest<T>("PATCH", path, body, options);
}

/**
 * Make a DELETE request
 */
export async function apiDelete(
  path: string,
  options?: ApiRequestOptions
): Promise<void> {
  return makeAuthenticatedRequest<void>("DELETE", path, undefined, options);
}
