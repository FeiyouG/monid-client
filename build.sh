#!/bin/bash

# Build script for ScopeOS CLI
# Compiles Deno binary with embedded environment configuration

set -e

echo "Building ScopeOS CLI..."

# Load environment variables from .env if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo "✓ Loaded configuration from .env"
else
  echo "⚠ Warning: .env file not found, using defaults"
fi

# Create dist directory
mkdir -p dist

# Show configuration
echo ""
echo "Build Configuration:"
echo "  OAuth Domain: ${OAUTH_DOMAIN:-not set}"
echo "  OAuth Client ID: ${OAUTH_CLIENT_ID:-not set}"
echo "  API Endpoint: ${API_ENDPOINT:-not set}"
echo "  Proxy Endpoint: ${PROXY_ENDPOINT:-not set}"
echo ""

# Compile for current platform
echo "Compiling for current platform..."
deno compile \
  --allow-net \
  --allow-read \
  --allow-write \
  --allow-env \
  --allow-run \
  --output ./dist/scopeos-cli \
  main.ts

echo ""
echo "✓ Build complete: ./dist/scopeos-cli"
echo ""
echo "To build for all platforms, run:"
echo "  ./build-all.sh"
