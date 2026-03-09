#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Build Checksums Script
 * 
 * Generates SHA256 checksums for all platform binaries.
 * Users can verify their downloads using these checksums.
 * 
 * Usage:
 *   deno run --allow-read --allow-write scripts/build-checksums.ts
 * 
 * Output:
 *   checksums.txt - Contains SHA256 hashes for all binaries
 */

import { join } from "@std/path";

const BINARIES_DIR = "dist/binaries";
const OUTPUT_FILE = "checksums.txt";

interface Checksum {
  filename: string;
  hash: string;
}

/**
 * Calculate SHA256 hash of a file
 */
async function calculateSHA256(filePath: string): Promise<string> {
  const file = await Deno.readFile(filePath);
  const hashBuffer = await crypto.subtle.digest("SHA-256", file);
  const hashArray = new Uint8Array(hashBuffer);
  // Convert to hex string
  return Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate checksums for all binaries
 */
async function generateChecksums(): Promise<Checksum[]> {
  const binaries = [
    "scopeos-cli-linux-x64",
    "scopeos-cli-linux-arm64",
    "scopeos-cli-macos-x64",
    "scopeos-cli-macos-arm64",
    "scopeos-cli-windows-x64.exe"
  ];
  
  const checksums: Checksum[] = [];
  
  console.log("Generating SHA256 checksums...\n");
  
  for (const binary of binaries) {
    const filePath = join(BINARIES_DIR, binary);
    
    try {
      const hash = await calculateSHA256(filePath);
      checksums.push({ filename: binary, hash });
      console.log(`✓ ${binary}`);
      console.log(`  ${hash}\n`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`❌ Failed to calculate checksum for ${binary}: ${errorMsg}`);
      Deno.exit(1);
    }
  }
  
  return checksums;
}

/**
 * Format checksums for output
 */
function formatChecksums(checksums: Checksum[]): string {
  let output = "SHA256 Checksums\n";
  output += "================\n\n";
  
  for (const { filename, hash } of checksums) {
    output += `${hash}  ${filename}\n`;
  }
  
  output += "\n";
  output += "Verification Instructions\n";
  output += "========================\n\n";
  output += "Linux/macOS:\n";
  output += "  sha256sum <filename>\n";
  output += "  # Compare output with hash above\n\n";
  output += "macOS (alternative):\n";
  output += "  shasum -a 256 <filename>\n\n";
  output += "Windows (PowerShell):\n";
  output += "  Get-FileHash <filename> -Algorithm SHA256\n\n";
  output += "Example:\n";
  output += "  $ sha256sum scopeos-cli-linux-x64\n";
  output += "  <hash>  scopeos-cli-linux-x64\n";
  
  return output;
}

/**
 * Main function
 */
async function main() {
  console.log("Building checksums for ScopeOS CLI binaries...\n");
  
  // Check if binaries directory exists
  try {
    await Deno.stat(BINARIES_DIR);
  } catch {
    console.error(`❌ Error: Binaries directory not found: ${BINARIES_DIR}`);
    console.error("Please build the binaries first.");
    Deno.exit(1);
  }
  
  // Generate checksums
  const checksums = await generateChecksums();
  
  // Format and write to file
  const output = formatChecksums(checksums);
  await Deno.writeTextFile(OUTPUT_FILE, output);
  
  console.log(`\n✅ Checksums written to: ${OUTPUT_FILE}`);
  console.log(`\nTotal binaries: ${checksums.length}`);
}

// Run main function
if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Failed to generate checksums: ${errorMsg}`);
    if (Deno.env.get("VERBOSE")) {
      console.error(error);
    }
    Deno.exit(1);
  }
}
