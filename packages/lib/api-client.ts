/**
 * Centralized API client with signature-based authentication
 */

import { CONFIG } from "@monid/core";
import { loadConfig } from "./config.ts";
import { signRequest } from "./signing.ts";
import { decryptData, generateSystemPassword } from "./crypto.ts";

interface ApiRequestOptions {
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
 * Uses API key (Bearer) or verification key (Ed25519 signature) authentication
 */
export async function makeAuthenticatedRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  options: ApiRequestOptions = {}
): Promise<T> {
  const config = await loadConfig();
  
  if (!config || !config.activated_key) {
    throw new Error("No API key configured. Add one with 'monid keys add --api-key <key> --label <name>'.");
  }

  // Find the activated key to determine its type
  const activatedKey = config.keys.find(k => k.label === config.activated_key);
  if (!activatedKey) {
    throw new Error(`Active key '${config.activated_key}' not found in config. Check with 'monid keys list'.`);
  }

  // Verification keys require a workspace
  if (activatedKey.type === "verification" && !config.workspace) {
    throw new Error("No workspace configured. Verification keys require a workspace.");
  }

  const url = `${CONFIG.api.endpoint}${path}`;

  // Prepare headers
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Check activated key type
  if (activatedKey.type === "api") {
    // Use API key authentication
    const apiKey = await getDecryptedApiKey(config.activated_key);
    headers["Authorization"] = `Bearer ${apiKey}`;
    
  } else if (activatedKey.type === "verification") {
    // Use signature-based auth
    const bodyString = body ? JSON.stringify(body) : undefined;
    const signatureHeaders = await signRequest(method, path, bodyString);
    
    // Add signature headers
    headers = {
      ...headers,
      ...signatureHeaders,
    };
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
    throw new Error(`${fullMessage}\n\nYour API key may be invalid or expired. Check with 'monid keys list' or add a new key with 'monid keys add'.`);
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


