#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run

/**
 * Build npm Package Script
 * 
 * This script creates an npm package structure with platform-specific binaries.
 * It generates package.json, copies binaries, and creates platform detection logic.
 * 
 * Usage:
 *   deno run --allow-read --allow-write --allow-env --allow-run scripts/build-npm-package.ts
 * 
 * Environment Variables:
 *   - NPM_SCOPE: npm scope/organization (e.g., @yourorg or @yourorg-dev)
 *   - CI_COMMIT_TAG: Git tag for version (optional, uses git describe if not set)
 *   - CI_COMMIT_SHORT_SHA: Short commit SHA for dev versions
 */

import { ensureDir } from "@std/fs";
import { join } from "@std/path";

const BINARIES_DIR = "dist/binaries";
const NPM_DIR = "npm";
const NPM_BIN_DIR = join(NPM_DIR, "bin");

interface PackageConfig {
  name: string;
  version: string;
  scope: string;
}

/**
 * Get version from git tag or generate dev version
 */
async function getVersion(): Promise<string> {
  // Check CI environment variables first
  const ciTag = Deno.env.get("CI_COMMIT_TAG");
  if (ciTag) {
    // Remove 'v' prefix if present (v1.0.0 -> 1.0.0)
    return ciTag.replace(/^v/, "");
  }

  const ciSha = Deno.env.get("CI_COMMIT_SHORT_SHA");
  if (ciSha) {
    return `0.0.0-dev.${ciSha}`;
  }

  // Try to get version from git tag locally
  try {
    const process = new Deno.Command("git", {
      args: ["describe", "--tags", "--abbrev=0"],
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout } = await process.output();
    
    if (code === 0) {
      const tag = new TextDecoder().decode(stdout).trim();
      return tag.replace(/^v/, "");
    }
  } catch {
    // Git command failed, continue to fallback
  }

  // Fallback: use git commit SHA
  try {
    const process = new Deno.Command("git", {
      args: ["rev-parse", "--short", "HEAD"],
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout } = await process.output();
    
    if (code === 0) {
      const sha = new TextDecoder().decode(stdout).trim();
      return `0.0.0-dev.${sha}`;
    }
  } catch {
    // Git not available
  }

  // Ultimate fallback
  return "0.0.0-dev";
}

/**
 * Get npm scope from environment
 */
function getScope(): string {
  const scope = Deno.env.get("NPM_SCOPE");
  if (!scope) {
    console.error("❌ Error: NPM_SCOPE environment variable not set");
    console.error("Set it to your npm organization scope, e.g., @yourorg or @yourorg-dev");
    Deno.exit(1);
  }
  return scope;
}

/**
 * Generate package.json
 */
function generatePackageJson(config: PackageConfig): object {
  const packageName = `${config.scope}/scopeos-cli`;
  
  return {
    name: packageName,
    version: config.version,
    description: "ScopeOS Command Line Interface - Secure OAuth authentication and API interaction",
    author: "ScopeOS Team",
    license: "MIT",
    keywords: [
      "scopeos",
      "cli",
      "oauth",
      "authentication",
      "api",
      "command-line"
    ],
    repository: {
      type: "git",
      url: "https://gitlab.com/yourorg/scopeos-cli.git"
    },
    bugs: {
      url: "https://gitlab.com/yourorg/scopeos-cli/-/issues"
    },
    homepage: "https://scopeos.xyz",
    bin: {
      "scopeos-cli": "./bin/scopeos-cli.js"
    },
    scripts: {
      "postinstall": "node install.js"
    },
    files: [
      "bin/",
      "install.js",
      "README.md"
    ],
    os: [
      "darwin",
      "linux",
      "win32"
    ],
    cpu: [
      "x64",
      "arm64"
    ],
    engines: {
      "node": ">=16.0.0"
    }
  };
}

/**
 * Generate install.js - platform detection and binary selection
 */
function generateInstallScript(): string {
  return `#!/usr/bin/env node

/**
 * Post-install script for scopeos-cli
 * Detects platform and creates symlink to correct binary
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

const platform = os.platform();
const arch = os.arch();

// Map Node.js platform/arch to our binary names
const binaryMap = {
  'darwin-x64': 'scopeos-cli-macos-x64',
  'darwin-arm64': 'scopeos-cli-macos-arm64',
  'linux-x64': 'scopeos-cli-linux-x64',
  'linux-arm64': 'scopeos-cli-linux-arm64',
  'win32-x64': 'scopeos-cli-windows-x64.exe'
};

const platformKey = \`\${platform}-\${arch}\`;
const binaryName = binaryMap[platformKey];

if (!binaryName) {
  console.error(\`❌ Unsupported platform: \${platform}-\${arch}\`);
  console.error('Supported platforms:');
  Object.keys(binaryMap).forEach(key => {
    console.error(\`  - \${key}\`);
  });
  process.exit(1);
}

const binDir = path.join(__dirname, 'bin');
const sourceBinary = path.join(binDir, binaryName);
const targetBinary = path.join(binDir, 'scopeos-cli' + (platform === 'win32' ? '.exe' : ''));

// Check if source binary exists
if (!fs.existsSync(sourceBinary)) {
  console.error(\`❌ Binary not found: \${binaryName}\`);
  console.error('This is likely a packaging issue. Please report this bug.');
  process.exit(1);
}

// Create wrapper script (not symlink, for better cross-platform support)
const wrapperScript = platform === 'win32'
  ? \`@echo off
"%~dp0\${binaryName}" %*
\`
  : \`#!/bin/sh
DIR="$(dirname "$(readlink -f "$0" || echo "$0")")"
exec "$DIR/\${binaryName}" "$@"
\`;

// Write wrapper
fs.writeFileSync(targetBinary, wrapperScript, { mode: 0o755 });

// Also ensure the actual binary is executable (Unix-like systems)
if (platform !== 'win32') {
  try {
    fs.chmodSync(sourceBinary, 0o755);
  } catch (err) {
    console.warn('Warning: Could not set executable permission on binary');
  }
}

console.log(\`✓ Installed scopeos-cli for \${platform}-\${arch}\`);
console.log(\`  Binary: \${binaryName}\`);
console.log('');
console.log('Run "scopeos-cli --help" to get started!');
`;
}

/**
 * Generate README for npm package
 */
function generateReadme(config: PackageConfig): string {
  const packageName = `${config.scope}/scopeos-cli`;
  
  return `# ScopeOS CLI

A secure command-line interface for ScopeOS with OAuth authentication, Ed25519 key-based request signing, and API proxy capabilities.

## Installation

\`\`\`bash
npm install -g ${packageName}
\`\`\`

## Quick Start

\`\`\`bash
# Authenticate with OAuth
scopeos-cli auth login

# Check authentication status
scopeos-cli auth whoami

# Generate a signing key
scopeos-cli keys generate my-key

# List your keys
scopeos-cli keys list

# Activate a key for signing
scopeos-cli keys activate my-key
\`\`\`

## Features

- **Provider-Agnostic OAuth**: PKCE flow for secure authentication
- **Ed25519 Key Pairs**: Generate and manage cryptographic keys
- **SSH-Style Fingerprints**: Industry-standard key fingerprints
- **Request Signing**: Automatic Ed25519 signature for all API requests
- **Secure Storage**: Private keys encrypted and stored locally

## Commands

### Authentication

- \`scopeos-cli auth login\` - Authenticate with OAuth provider
- \`scopeos-cli auth logout\` - Clear local credentials
- \`scopeos-cli auth whoami\` - Show current user and workspace info

### Key Management

- \`scopeos-cli keys generate <label>\` - Generate a new key pair
- \`scopeos-cli keys list\` - List all keys for current workspace
- \`scopeos-cli keys activate <label>\` - Set the active key for signing
- \`scopeos-cli keys delete <label>\` - Delete a local key
- \`scopeos-cli keys rename <old> <new>\` - Rename a key
- \`scopeos-cli keys revoke <label>\` - Revoke a key on the server

## Configuration

The CLI is pre-configured with environment-specific settings baked in at build time. No additional configuration is required.

## Platform Support

- **macOS**: Intel (x64) and Apple Silicon (ARM64)
- **Linux**: x86_64 and ARM64
- **Windows**: x86_64

## Documentation

For full documentation, visit: [https://scopeos.xyz/docs](https://scopeos.xyz/docs)

## Support

- **Issues**: [GitLab Issues](https://gitlab.com/yourorg/scopeos-cli/-/issues)
- **Email**: support@scopeos.xyz

## License

MIT License - see LICENSE file for details

## Version

${config.version}
`;
}

/**
 * Copy binaries to npm/bin directory
 */
async function copyBinaries() {
  console.log("Copying binaries to npm package...");
  
  await ensureDir(NPM_BIN_DIR);
  
  const binaries = [
    "scopeos-cli-linux-x64",
    "scopeos-cli-linux-arm64",
    "scopeos-cli-macos-x64",
    "scopeos-cli-macos-arm64",
    "scopeos-cli-windows-x64.exe"
  ];
  
  for (const binary of binaries) {
    const sourcePath = join(BINARIES_DIR, binary);
    const destPath = join(NPM_BIN_DIR, binary);
    
    try {
      await Deno.stat(sourcePath);
      await Deno.copyFile(sourcePath, destPath);
      
      // Set executable permissions (Unix-like systems)
      if (!binary.endsWith(".exe")) {
        await Deno.chmod(destPath, 0o755);
      }
      
      console.log(`  ✓ Copied ${binary}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ Failed to copy ${binary}: ${errorMsg}`);
      Deno.exit(1);
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log("Building npm package for ScopeOS CLI...\n");
  
  // Get configuration
  const version = await getVersion();
  const scope = getScope();
  
  const config: PackageConfig = {
    name: "scopeos-cli",
    version,
    scope
  };
  
  console.log("Configuration:");
  console.log(`  Package: ${scope}/scopeos-cli`);
  console.log(`  Version: ${version}`);
  console.log(`  Scope: ${scope}\n`);
  
  // Create npm directory structure
  await ensureDir(NPM_DIR);
  
  // Copy binaries
  await copyBinaries();
  
  // Generate package.json
  console.log("\nGenerating package.json...");
  const packageJson = generatePackageJson(config);
  await Deno.writeTextFile(
    join(NPM_DIR, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );
  console.log("  ✓ package.json created");
  
  // Generate install.js
  console.log("Generating install.js...");
  await Deno.writeTextFile(
    join(NPM_DIR, "install.js"),
    generateInstallScript()
  );
  await Deno.chmod(join(NPM_DIR, "install.js"), 0o755);
  console.log("  ✓ install.js created");
  
  // Generate README.md
  console.log("Generating README.md...");
  await Deno.writeTextFile(
    join(NPM_DIR, "README.md"),
    generateReadme(config)
  );
  console.log("  ✓ README.md created");
  
  // Create wrapper script for bin
  console.log("Creating bin wrapper...");
  const wrapperContent = `#!/usr/bin/env node
// This file is replaced by install.js post-install
console.error('Please run: npm install to complete installation');
process.exit(1);
`;
  await Deno.writeTextFile(
    join(NPM_BIN_DIR, "scopeos-cli.js"),
    wrapperContent
  );
  await Deno.chmod(join(NPM_BIN_DIR, "scopeos-cli.js"), 0o755);
  console.log("  ✓ bin/scopeos-cli.js created");
  
  console.log("\n✅ npm package built successfully!");
  console.log(`\nPackage location: ${NPM_DIR}/`);
  console.log(`\nTo publish manually:`);
  console.log(`  cd ${NPM_DIR}`);
  console.log(`  npm publish --access public`);
}

// Run main function
if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Build failed: ${errorMsg}`);
    if (Deno.env.get("VERBOSE")) {
      console.error(error);
    }
    Deno.exit(1);
  }
}
