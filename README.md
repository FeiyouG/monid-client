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

### via npm (Recommended)

The easiest way to install ScopeOS CLI:

```bash
npm install -g @yourorg/scopeos-cli
```

For development builds:
```bash
npm install -g @yourorg-dev/scopeos-cli@dev
```

**Requirements**: Node.js 16.0.0 or higher

### Direct Binary Download

Download pre-compiled binaries for your platform:

**Linux x86_64:**
```bash
curl -LO https://gitlab.com/yourorg/scopeos-cli/-/releases/latest/downloads/scopeos-cli-linux-x64
chmod +x scopeos-cli-linux-x64
sudo mv scopeos-cli-linux-x64 /usr/local/bin/scopeos-cli
```

**macOS ARM64 (M1/M2/M3):**
```bash
curl -LO https://gitlab.com/yourorg/scopeos-cli/-/releases/latest/downloads/scopeos-cli-macos-arm64
chmod +x scopeos-cli-macos-arm64
sudo mv scopeos-cli-macos-arm64 /usr/local/bin/scopeos-cli
```

**Windows x86_64:**
Download from [GitLab Releases](https://gitlab.com/yourorg/scopeos-cli/-/releases/latest)

### Verify Installation

```bash
scopeos-cli --version
scopeos-cli --help
```

**For detailed installation instructions and troubleshooting, see [DISTRIBUTION.md](DISTRIBUTION.md).**

### For Developers: Build from Source

**Prerequisites**: [Deno](https://deno.land/) 2.x

```bash
# Clone the repository
git clone <repository-url>
cd agenticPayment-cli

# Run directly
deno task dev

# Or build binary
./build.sh
# Binary will be in ./dist/scopeos-cli
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

### Task Management

Tasks define reusable search templates with input/output schemas and capabilities.

#### Create a task
```bash
scopeos-cli tasks create \
  --title "Company Research" \
  --description "Research company information from web sources" \
  --input-schema '{"type":"object","properties":{"company":{"type":"string"}},"required":["company"]}' \
  --output-schema '{"type":"object","properties":{"results":{"type":"array"}}}' \
  --capabilities '[{"capabilityId":"apify.actor.website-scraper","prepareInput":{}}]'
```

Or use schema files:
```bash
scopeos-cli tasks create \
  --title "Company Research" \
  --description "Research companies" \
  --input-schema ./schemas/input.json \
  --output-schema ./schemas/output.json \
  --capabilities ./capabilities.json
```

#### List tasks
```bash
scopeos-cli tasks list
scopeos-cli tasks list --limit 20
scopeos-cli tasks list --cursor <cursor-from-previous-page>
```

#### Get task details
```bash
scopeos-cli tasks get 01JBXX...
```

#### Update a task
```bash
scopeos-cli tasks update 01JBXX... --title "Updated Title"
scopeos-cli tasks update 01JBXX... --description "New description" --input-schema input.json
```

#### Delete a task
```bash
scopeos-cli tasks delete 01JBXX...
scopeos-cli tasks delete 01JBXX... -y  # Skip confirmation
```

### Price Quotes

Get price quotes before executing searches.

#### Create a quote
```bash
scopeos-cli quotes create 01JBXX... --input '{"company":"Acme Corp"}'
scopeos-cli quotes create 01JBXX... --input input.json
```

The quote shows estimated pricing and expires after 1 hour (configurable).

### Searches & Executions

Execute searches using natural language queries or task-based workflows.

#### Quick search (creates task, quote, and executes)
```bash
# Execute and return immediately
scopeos-cli searches "Find information about Acme Corp"

# Wait for completion and save results
scopeos-cli searches "Research Tesla's latest products" --wait --output results.json

# Custom output schema
scopeos-cli searches "Company research" --output-schema schema.json --wait
```

#### Check execution status
```bash
scopeos-cli searches check 01JBXZ...
scopeos-cli execution get 01JBXZ...
scopeos-cli execution get 01JBXZ... --wait  # Poll until completion
```

#### Save results to file
```bash
scopeos-cli execution get 01JBXZ... --output results.json
```

### Making API Requests (Legacy Proxy)

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

#### Task Management
```
POST /v1/tasks
Headers: X-Workspace-ID, Signature headers
Body: TaskCreate
Response: Task

GET /v1/tasks?limit={n}&cursor={cursor}
Headers: X-Workspace-ID, Signature headers
Response: { items: Task[], cursor?: string }

GET /v1/tasks/:taskId
Headers: X-Workspace-ID, Signature headers
Response: Task

PATCH /v1/tasks/:taskId
Headers: X-Workspace-ID, Signature headers
Body: TaskUpdate (partial)
Response: Task

DELETE /v1/tasks/:taskId
Headers: X-Workspace-ID, Signature headers
Response: 204 No Content
```

#### Quotes
```
POST /v1/tasks/:taskId/quotes
Headers: X-Workspace-ID, Signature headers
Body: { input: Record<string, unknown> }
Response: Quote

GET /v1/tasks/:taskId/quotes/:quoteId
Headers: X-Workspace-ID, Signature headers
Response: Quote
```

#### Searches & Executions
```
POST /v1/searches
Headers: X-Workspace-ID, Signature headers
Body: { quoteId: string }
Response: 202 Accepted { executionId, status, message }

GET /v1/executions/:executionId
Headers: X-Workspace-ID, Signature headers
Response: Execution (with optional result envelope)
```

#### Proxy Endpoint (Legacy)
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
