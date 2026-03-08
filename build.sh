#!/bin/bash

# Build script for ScopeOS CLI
# Generates static configuration and compiles Deno binary with baked-in environment variables

set -e

echo "Building ScopeOS CLI..."

# Step 1: Load environment variables from .env if it exists (for local development)
# In CI/CD, environment variables will already be set by the CI/CD provider
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo "✓ Loaded configuration from .env"
fi

# Step 2: Generate static build configuration from environment variables
echo "Generating build configuration..."
deno run --allow-env --allow-read --allow-write scripts/generate-config.ts

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Failed to generate build configuration"
  echo "Please ensure all required environment variables are set."
  exit 1
fi

# Step 3: Create dist directory
echo ""
mkdir -p dist

# Step 4: Compile binary with baked-in configuration
echo "Compiling for current platform..."
deno compile \
  --no-check \
  --allow-net \
  --allow-read \
  --allow-write \
  --allow-env \
  --allow-run \
  --output ./dist/scopeos-cli \
  main.ts

echo ""
echo "✓ Build complete: ./dist/scopeos-cli"
echo "✓ Configuration baked into binary"
echo ""
echo "The binary now contains immutable configuration values."
echo "It can be distributed and run without the .env file."
