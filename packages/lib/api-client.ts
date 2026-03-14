/**
 * Centralized API client with signature-based authentication
 */

import { CONFIG } from "@scopeos/core";
import { loadConfig } from "./config.ts";
import { getAccessToken } from "./credentials.ts";
import { signRequest } from "./signing.ts";

export interface ApiError {
  code: number;
  message: string;
}

export interface ApiRequestOptions {
  useOAuth?: boolean;  // Force OAuth instead of signature auth
  headers?: Record<string, string>;  // Additional headers
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
  if (!config || !config.workspace) {
    throw new Error("Not authenticated. Run 'scopeos-cli auth login' first.");
  }

  const url = `${CONFIG.api.endpoint}${path}`;

  // Prepare headers
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Try signature-based auth unless OAuth is forced
  let useSignature = !options.useOAuth && config.activated_key;

  if (useSignature) {
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
      useSignature = false;
    }
  }

  // Use OAuth if signature auth not available or failed
  if (!useSignature) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error("Authentication required. Run 'scopeos-cli auth login' first.");
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
    throw new Error(`${fullMessage}\n\nAuthentication expired. Run 'scopeos-cli auth login' to re-authenticate.`);
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
