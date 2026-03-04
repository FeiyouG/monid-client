/**
 * Proxy command: make signed API requests
 */

import type { ParsedArgs } from "../types/index.ts";
import { BUILD_CONFIG } from "../config/build-config.ts";
import { getAccessToken } from "../lib/credentials.ts";
import { signRequest } from "../lib/signing.ts";
import { success, error, info } from "../utils/display.ts";

export async function proxyCommand(slug: string, target: string, args: ParsedArgs): Promise<void> {
  if (!slug || !target) {
    error("Usage: scopeos-cli proxy <slug> <target>");
    Deno.exit(1);
  }
  
  try {
    const method = (args.method as string || "GET").toUpperCase();
    const data = args.data as string | undefined;
    const customHeaders = (args.header as string[]) || [];
    const verbose = args.verbose as boolean || false;
    const outputFile = args.output as string | undefined;
    
    // Build full URL
    const url = `${BUILD_CONFIG.api.proxyEndpoint}/${slug}${target}`;
    
    if (verbose) {
      info(`Making ${method} request to: ${url}`);
    }
    
    // Get access token
    const accessToken = await getAccessToken();
    if (!accessToken) {
      error("Authentication expired. Please run 'scopeos-cli auth login' first.");
      Deno.exit(1);
    }
    
    // Sign request
    const path = `/${slug}${target}`;
    const signatureHeaders = await signRequest(method, path, data);
    
    if (verbose) {
      info("Request signature generated:");
      console.log(`  Workspace ID: ${signatureHeaders["X-Workspace-ID"]}`);
      console.log(`  Key Fingerprint: ${signatureHeaders["X-Key-Fingerprint"].substring(0, 30)}...`);
      console.log(`  Timestamp: ${signatureHeaders["X-Timestamp"]}`);
      console.log(`  Nonce: ${signatureHeaders["X-Nonce"]}`);
      console.log(`  Signature: ${signatureHeaders["X-Signature"].substring(0, 30)}...`);
    }
    
    // Build headers
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...signatureHeaders,
    };
    
    // Add custom headers
    for (const header of customHeaders) {
      const [key, value] = header.split(":");
      if (key && value) {
        headers[key.trim()] = value.trim();
      }
    }
    
    // Make request
    const requestOptions: RequestInit = {
      method,
      headers,
    };
    
    if (data && ["POST", "PUT", "PATCH"].includes(method)) {
      requestOptions.body = data;
    }
    
    const response = await fetch(url, requestOptions);
    
    // Handle response
    const responseText = await response.text();
    
    if (response.ok) {
      success(`Response ${response.status} ${response.statusText}`);
    } else {
      error(`Response ${response.status} ${response.statusText}`);
    }
    
    console.log("");
    
    // Try to parse as JSON for pretty printing
    try {
      const json = JSON.parse(responseText);
      console.log(JSON.stringify(json, null, 2));
    } catch {
      // Not JSON, print as-is
      console.log(responseText);
    }
    
    console.log("");
    
    // Save to file if requested
    if (outputFile) {
      await Deno.writeTextFile(outputFile, responseText);
      info(`Response saved to: ${outputFile}`);
    }
    
    if (!response.ok) {
      Deno.exit(1);
    }
    
  } catch (err) {
    error(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
    if (args.verbose) {
      console.error(err);
    }
    throw err;
  }
}
