# Monid CLI

A secure command-line interface for Monid with API key authentication, Ed25519 request signing, and x402 crypto payment support.

## Features

- **API Key Authentication**: Securely store and use API keys for authentication
- **Ed25519 Request Signing**: Sign API requests with verification keys
- **x402 Crypto Payments**: Anonymous access via on-chain USDC payments (Base Sepolia)
- **Discover & Inspect**: Find and explore available data endpoints
- **Async Execution**: Fire-and-poll pattern for data retrieval
- **Secure Storage**: Keys encrypted and stored locally (never transmitted)

## Installation

### Production CLI (Stable)

**Quick Install (Recommended):**
```bash
curl -fsSL https://raw.githubusercontent.com/FeiyouG/monid-client/main/install.sh | bash
```

This installs the latest stable release with production endpoints.

**Manual Download:**
Download the binary for your platform:
- [Linux x64](https://github.com/FeiyouG/monid-client/releases/latest/download/monid-linux-x64)
- [macOS ARM64](https://github.com/FeiyouG/monid-client/releases/latest/download/monid-macos-arm64)  
- [Windows x64](https://github.com/FeiyouG/monid-client/releases/latest/download/monid-windows-x64.exe)

Then install manually:
```bash
# Linux/macOS
mkdir -p ~/.local/bin
mv monid-<platform> ~/.local/bin/monid
chmod +x ~/.local/bin/monid

# Add to PATH if needed
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Windows: Move to a directory in your PATH
# Or add to PATH: System Properties → Environment Variables
```

### Nightly CLI (Pre-release)

For early access to unreleased features:
```bash
curl -fsSL https://raw.githubusercontent.com/FeiyouG/monid-client/main/install-nightly.sh | bash
```

This installs `monid-nightly` (separate from production, can be installed side-by-side).

**What's Nightly?**
- Built automatically from every commit to `main`
- Uses production API endpoints (safe to test)
- Includes unreleased features and bug fixes
- May be less stable than tagged releases

**Manual Download:**
- [Linux x64 (Nightly)](https://github.com/FeiyouG/monid-client/releases/download/nightly/monid-nightly-linux-x64)
- [macOS ARM64 (Nightly)](https://github.com/FeiyouG/monid-client/releases/download/nightly/monid-nightly-macos-arm64)
- [Windows x64 (Nightly)](https://github.com/FeiyouG/monid-client/releases/download/nightly/monid-nightly-windows-x64.exe)

### Verify Installation
```bash
monid --version          # Production: v1.0.0
monid-nightly --version  # Nightly: v1.0.0+abc1234
```

**Requirements**: None! Binaries are self-contained and work standalone.

### Uninstall
```bash
# Remove binaries
rm ~/.local/bin/monid
rm ~/.local/bin/monid-nightly

# Remove config (optional)
rm -rf ~/.monid
```

### For Developers: Build from Source

**Prerequisites**: [Deno](https://deno.land/) 2.x

```bash
# Clone the repository
git clone https://github.com/FeiyouG/monid-client.git
cd monid-client

# Create .env file (see Configuration section below)
cp .env.template .env
# Edit .env with your values (including VERSION for local builds)

# Run CLI with convenient dev task (auto-generates config)
deno task dev --help

# Or build binary locally
deno task cli:build:local
# Binary will be in ./dist/monid-local
```

**Configuration System**:
- The CLI uses a **generated config** system (not runtime env vars)
- Run `deno task config:gen:local` whenever you change `.env`
- This generates `packages/core/config/generated.ts` with hardcoded values
- Both dev runs and compiled binaries use this generated config
- Ensures dev environment matches production behavior

## Configuration

Configure the following environment variables in `.env`:

```bash
# Backend API Configuration
API_ENDPOINT=https://api.monid.ai
```

## Usage

### Key Management

#### Add an API key
```bash
monid keys add --api-key <key> --label "my-production-key"
```

Encrypts and stores an API key locally. Generate API keys at https://app.monid.ai/access/api-keys.

#### List keys
```bash
monid keys list
```

Shows all keys for your current workspace. The activated key is marked with `*`.

#### Activate a key
```bash
monid keys activate my-production-key
```

Sets the specified key as the active key for signing requests.

#### Remove a key
```bash
monid keys remove my-old-key
```

Removes a key from local storage.

## How It Works

### Request Signing Flow (Verification Keys)

1. CLI loads activated verification key's private key
2. CLI decrypts private key
3. CLI generates signature components:
   - Workspace ID
   - Key fingerprint
   - Timestamp (Unix seconds)
   - Nonce (32-char hex)
   - Algorithm ("Ed25519")
   - HTTP method
   - Request path
   - Body hash (SHA-256)
5. Components joined with newlines and signed with Ed25519
6. Request sent with headers:
   ```
   X-Workspace-ID: {workspace_id}
   X-Key-Fingerprint: {fingerprint}
   X-Signature-Algorithm: Ed25519
   X-Timestamp: {timestamp}
   X-Nonce: {nonce}
   X-Signature: {base64_signature}
   ```

## Directory Structure

```
~/.monid/
├── config.yaml              # Workspace and key configuration
└── keys/
    └── workspace_abc123/
        ├── my-production-key    # Encrypted private key
        └── backup-key
```

### config.yaml Format

```yaml
version: "1.0"

workspace:
  id: workspace_abc123
  name: "My Workspace"
  
keys:
  - key_id: key_abc123
    label: my-production-key
    fingerprint: "SHA256:nThbg6kXUpJWGl7E1IGOCspRom..."
    algorithm: Ed25519
    status: ACTIVE
    created_at: "2026-03-04T10:30:00Z"
    expires_at: "2027-03-04T10:30:00Z"

activated_key: my-production-key

auth:
  last_login: "2026-03-04T10:30:00Z"
  user_email: "user@example.com"
  user_id: "user_xxx"
```

## Security Features

- **Private keys never leave your machine** - only signatures are transmitted
- **Ed25519 signatures** - Modern, 256-bit security, fast verification
- **SSH-style fingerprints** - Industry standard key identification
- **Encrypted local storage** - Keys encrypted with system-specific password
- **File permissions** - Key files set to 0600 (owner-only access)
- **Replay attack prevention** - Timestamp + nonce in every signature
- **Workspace binding** - Signatures tied to specific workspace
- **Algorithm specification** - Future-proof against algorithm confusion attacks

## Backend Integration

### Required Endpoints

Your backend must implement these endpoints:

```
POST /v1/discover      — Natural language endpoint search
POST /v1/inspect       — Get endpoint details, schema, pricing
POST /v1/run           — Start an async execution (returns 202)
GET  /v1/runs/:runId   — Get run status/results
POST /x402/v1/run      — Start execution via x402 payment
GET  /x402/v1/runs/:runId — Get x402 run status (SIWX authenticated)
```

## Development

### Run tests
```bash
deno task test
```

### Run in development mode
```bash
deno task dev
```

### Build for all platforms
```bash
# TODO: Create build-all.sh script
./build-all.sh
```

## Troubleshooting

### "No API key configured" error
Add an API key with `monid keys add --api-key <key> --label my-key`. Generate keys at https://app.monid.ai/access/api-keys.

### "Key not found" error
Check your keys with `monid keys list` and activate one with `monid keys activate <label>`.

### Signature verification fails
- Ensure your system clock is synchronized
- Check that the key hasn't been revoked in the dashboard

## Contributing

Contributions are welcome! Please ensure all tests pass before submitting a PR.

## License

[Your License Here]

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Documentation: https://monid.ai/docs
- Dashboard: https://monid.ai/dashboard/verification-keys
