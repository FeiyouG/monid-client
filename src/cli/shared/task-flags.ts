/**
 * Shared utilities for task creation flags
 * Used across tasks, quotes, and search commands
 */

import type { JSONSchema } from "../../types/index.ts";
import { exists } from "@std/fs";

/**
 * Parse schema from file path or JSON string
 *
 * @param input - File path or JSON string
 * @returns Parsed JSON schema
 * @throws Error if parsing fails
 */
export async function parseSchema(input: string): Promise<JSONSchema> {
  try {
    // Check if input is a file path
    if (await exists(input)) {
      const content = await Deno.readTextFile(input);
      return JSON.parse(content) as JSONSchema;
    }

    // Otherwise, parse as JSON string
    return JSON.parse(input) as JSONSchema;
  } catch (err) {
    throw new Error(
      `Invalid schema: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
