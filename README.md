# ScopeOS CLI

A secure command-line interface for ScopeOS with OAuth authentication, Ed25519 key-based request signing, and API proxy capabilities.

## Features

- **Provider-Agnostic OAuth**: PKCE flow for secure authentication (currently configured for Clerk)
- **Ed25519 Key Pairs**: Generate and manage cryptographic keys for API authentication
- **SSH-Style Fingerprints**: Industry-standard `SHA256:{base64}` key fingerprints
- **Automatic Key Registration**: Seamlessly register keys with the backend
- **Request Signing**: Sign all API requests with Ed25519 signatures
- **Proxy Command**: Route requests through `proxy.scopeos.xyz` with automatic signing
- **Secure Storage**: Private keys encrypted and stored locally (never transmitted)

## Installation

### Prerequisites

- [Deno](https://deno.land/) installed on your system

### Option 1: Run from source

```bash
# Clone the repository
git clone <repository-url>
cd agenticPayment-cli

# Run directly
deno run --allow-net --allow-read --allow-write --allow-env --allow-run main.ts --help
```

### Option 2: Build and install binary

```bash
# Create .env file with your configuration
cp .env.example .env
# Edit .env with your OAuth and API settings

# Build
./build.sh

# The binary will be in ./dist/scopeos-cli
# Move it to your PATH
sudo mv ./dist/scopeos-cli /usr/local/bin/

# Or create an alias
alias scopeos-cli="./dist/scopeos-cli"
```

## Configuration

Before building, configure the following environment variables in `.env`:

```bash
# OAuth Provider Configuration
OAUTH_DOMAIN=your-app.clerk.accounts.dev
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_TYPE=clerk

# Backend API Configuration
API_ENDPOINT=https://api.scopeos.xyz
PROXY_ENDPOINT=https://proxy.scopeos.xyz
DASHBOARD_URL=https://scopeos.xyz

# OAuth Flow Configuration
OAUTH_REDIRECT_URI=http://localhost:8918/callback
OAUTH_SCOPES=profile email openid
```

## Usage

### Authentication

#### Login
```bash
scopeos-cli auth login
```

Opens your browser for OAuth authentication. After successful login, your workspace information is saved locally.

#### Check status
```bash
scopeos-cli auth whoami
```

Displays your current authentication status, workspace, and active key.

#### Logout
```bash
scopeos-cli auth logout
```

Clears all local credentials and configuration.

### Key Management

#### Generate a new key
```bash
scopeos-cli keys generate --label "my-production-key"
```

Generates an Ed25519 key pair, encrypts the private key locally, and automatically registers the public key with the backend.

#### List keys
```bash
scopeos-cli keys list
```

Shows all keys for your current workspace. The activated key is marked with `*`.

#### Activate a key
```bash
scopeos-cli keys activate my-production-key
```

Sets the specified key as the active key for signing requests.

#### Delete a key
```bash
scopeos-cli keys delete my-old-key
```

Deletes a key from local storage. Note: This doesn't revoke the key on the backend - use the dashboard for that.

### Making API Requests

#### Basic GET request
```bash
scopeos-cli proxy my-api-slug /users
```

#### POST request with data
```bash
scopeos-cli proxy my-api-slug /users --method POST --data '{"name":"Alice","email":"alice@example.com"}'
```

#### PUT request
```bash
scopeos-cli proxy my-api-slug /users/123 --method PUT --data '{"name":"Alice Updated"}'
```

#### DELETE request
```bash
scopeos-cli proxy my-api-slug /users/123 --method DELETE
```

#### With custom headers
```bash
scopeos-cli proxy my-api-slug /users --header "X-Custom-Header: value" --header "X-Another: value"
```

#### Verbose mode (show signature details)
```bash
scopeos-cli proxy my-api-slug /users --verbose
```

#### Save response to file
```bash
scopeos-cli proxy my-api-slug /users --output response.json
```

## How It Works

### Authentication Flow

1. User runs `auth login`
2. CLI starts a local callback server on port 8918
3. Browser opens with OAuth authorization URL
4. User authenticates with OAuth provider (Clerk)
5. Provider redirects to `http://localhost:8918/callback?code=xxx`
6. CLI exchanges code for access token
7. CLI fetches workspace info from `/v1/auth/whoami`
8. Workspace and user info saved to `~/.scopeos-cli/config.yaml`

### Key Generation Flow

1. User runs `keys generate --label "my-key"`
2. CLI generates Ed25519 key pair using Web Crypto API
3. CLI computes SSH-style fingerprint: `SHA256:{base64(sha256(public_key))}`
4. Private key is encrypted with AES-GCM (password derived from system)
5. Encrypted private key saved to `~/.scopeos-cli/keys/{workspace_id}/{label}`
6. Public key automatically registered with backend (`POST /v1/verification-keys`)
7. Key info added to config and set as activated key

### Request Signing Flow

1. User runs `proxy <slug> <target>`
2. CLI loads activated key's private key
3. CLI decrypts private key
4. CLI generates signature components:
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
   Authorization: Bearer {oauth_access_token}
   X-Workspace-ID: {workspace_id}
   X-Key-Fingerprint: {fingerprint}
   X-Signature-Algorithm: Ed25519
   X-Timestamp: {timestamp}
   X-Nonce: {nonce}
   X-Signature: {base64_signature}
   ```

## Directory Structure

```
~/.scopeos-cli/
├── config.yaml              # Workspace configuration
├── credentials              # Encrypted OAuth tokens (temporary)
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
- **PKCE OAuth flow** - No client secrets stored in binary
- **Encrypted local storage** - Private keys encrypted with system-specific password
- **File permissions** - Key files set to 0600 (owner-only access)
- **Replay attack prevention** - Timestamp + nonce in every signature
- **Workspace binding** - Signatures tied to specific workspace
- **Algorithm specification** - Future-proof against algorithm confusion attacks

## Backend Integration

### Required Endpoints

Your backend must implement these endpoints:

#### Authentication
```
GET /v1/auth/whoami
Headers: Authorization: Bearer {access_token}
Response: { user_id, workspace_id, workspace_name, email }
```

#### Key Management
```
POST /v1/verification-keys
Headers: Authorization: Bearer {access_token}
Body: VerificationKeyCreate
Response: VerificationKey

GET /v1/verification-keys
Headers: Authorization: Bearer {access_token}
Response: VerificationKey[]

PATCH /v1/verification-keys/:keyId
Headers: Authorization: Bearer {access_token}
Body: { label }
Response: VerificationKey

DELETE /v1/verification-keys/:keyId
Headers: Authorization: Bearer {access_token}
Response: 204 No Content
```

#### Proxy Endpoint
```
ANY /v1/*
Headers:
  Authorization: Bearer {access_token}
  X-Workspace-ID: {workspace_id}
  X-Key-Fingerprint: {fingerprint}
  X-Signature-Algorithm: Ed25519
  X-Timestamp: {timestamp}
  X-Nonce: {nonce}
  X-Signature: {base64_signature}
```

### Signature Verification (Backend)

```typescript
// Pseudo-code for backend verification
async function verifySignature(request) {
  const { headers, method, path, body } = request;
  
  // 1. Validate timestamp (<5 minutes old)
  const timestamp = parseInt(headers["x-timestamp"]);
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) {
    throw new Error("Signature expired");
  }
  
  // 2. Check nonce not used (query cache/database)
  const nonce = headers["x-nonce"];
  if (await isNonceUsed(nonce)) {
    throw new Error("Nonce already used (replay attack)");
  }
  
  // 3. Look up public key
  const workspaceId = headers["x-workspace-id"];
  const fingerprint = headers["x-key-fingerprint"];
  const key = await db.query(
    "SELECT public_key FROM verification_keys WHERE workspace_id = ? AND fingerprint = ? AND status = 'ACTIVE'",
    [workspaceId, fingerprint]
  );
  
  // 4. Reconstruct message
  const bodyHash = sha256Hex(body || "");
  const message = [
    workspaceId,
    fingerprint,
    timestamp.toString(),
    nonce,
    headers["x-signature-algorithm"],
    method.toUpperCase(),
    path,
    bodyHash,
  ].join("\n");
  
  // 5. Verify signature
  const signature = base64Decode(headers["x-signature"]);
  const valid = await Ed25519.verify(key.public_key, message, signature);
  
  if (!valid) {
    throw new Error("Invalid signature");
  }
  
  // 6. Store nonce with 5-minute TTL
  await storeNonce(nonce, Date.now() + 300000);
  
  // 7. Update last_used_at
  await db.query("UPDATE verification_keys SET last_used_at = NOW() WHERE fingerprint = ?", [fingerprint]);
}
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

### "Authentication expired" error
Run `scopeos-cli auth login` to refresh your OAuth tokens.

### "No active key" error
Generate a key with `scopeos-cli keys generate --label my-key`.

### "Key not found" error
Check your keys with `scopeos-cli keys list` and activate one with `scopeos-cli keys activate <label>`.

### Browser doesn't open during login
The authorization URL is displayed in the terminal. Copy and paste it into your browser manually.

### Signature verification fails
- Ensure your system clock is synchronized
- Check that the key hasn't been revoked in the dashboard
- Try generating a new key

## Contributing

Contributions are welcome! Please ensure all tests pass before submitting a PR.

## License

[Your License Here]

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Documentation: https://scopeos.xyz/docs
- Dashboard: https://scopeos.xyz/dashboard/verification-keys
