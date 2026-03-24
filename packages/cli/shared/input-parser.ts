/**
 * Parse --input flag value.
 *
 * Accepts either:
 *   - Inline JSON string:  '{"searchTerms":["AI"]}'
 *   - File reference:      @path/to/input.json
 */

import { exists } from "@std/fs";

export async function parseInput(
  value: string,
): Promise<Record<string, unknown>> {
  if (value.startsWith("@")) {
    const filePath = value.slice(1);
    if (!(await exists(filePath))) {
      throw new Error(`Input file not found: ${filePath}`);
    }
    const content = await Deno.readTextFile(filePath);
    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      throw new Error(`Invalid JSON in input file: ${filePath}`);
    }
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    throw new Error(
      `Invalid JSON input. Provide a JSON string or @path/to/file.json`,
    );
  }
}
