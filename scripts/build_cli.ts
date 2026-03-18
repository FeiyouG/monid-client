#!/usr/bin/env -S deno run --allow-env --allow-read --allow-run

/**
 * CLI Build Script
 * 
 * Compiles the CLI binary with specified target and output.
 * Reads DENO_TARGET and DENO_OUTPUT from environment variables.
 * 
 * Usage:
 *   DENO_TARGET=x86_64-unknown-linux-gnu DENO_OUTPUT=dist/monid deno run scripts/build_cli.ts
 */

const target = Deno.env.get("DENO_TARGET");
const output = Deno.env.get("DENO_OUTPUT");

if (!target) {
  console.error("Error: DENO_TARGET environment variable is required");
  console.error("Example: DENO_TARGET=x86_64-unknown-linux-gnu");
  Deno.exit(1);
}

if (!output) {
  console.error("Error: DENO_OUTPUT environment variable is required");
  console.error("Example: DENO_OUTPUT=dist/monid");
  Deno.exit(1);
}

console.log(`Building CLI for target: ${target}`);
console.log(`Output: ${output}`);

const args = [
  "compile",
  "--no-check",
  "--allow-net",
  "--allow-read",
  "--allow-write",
  "--allow-env",
  "--allow-sys",
  "--allow-run",
  "--target",
  target,
  "--output",
  output,
  "packages/cli/main.compile.ts",
];

const command = new Deno.Command("deno", {
  args,
  stdout: "inherit",
  stderr: "inherit",
});

const { code } = await command.output();

if (code !== 0) {
  console.error(`Build failed with exit code ${code}`);
  Deno.exit(code);
}

console.log(`✓ Successfully built ${output}`);
