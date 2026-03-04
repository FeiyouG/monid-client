# Quick Start Guide

Get started with ScopeOS CLI in 5 minutes!

## 1. Configure Environment

Create a `.env` file with your settings:

```bash
cp .env.example .env
```

Edit `.env`:
```bash
OAUTH_DOMAIN=your-app.clerk.accounts.dev
OAUTH_CLIENT_ID=your_client_id
API_ENDPOINT=https://api.scopeos.xyz
PROXY_ENDPOINT=https://proxy.scopeos.xyz
DASHBOARD_URL=https://scopeos.xyz
```

## 2. Build the CLI

```bash
chmod +x build.sh
./build.sh
```

This creates `./dist/scopeos-cli`.

## 3. Authenticate

```bash
./dist/scopeos-cli auth login
```

- Opens browser
- Login with your account
- Returns to CLI with workspace info

## 4. Generate API Key

```bash
./dist/scopeos-cli keys generate --label "my-first-key"
```

This will:
- Generate Ed25519 key pair
- Save private key locally (encrypted)
- Register public key with backend
- Set as active key

## 5. Make Your First API Call

```bash
./dist/scopeos-cli proxy my-api-slug /users
```

The request is automatically signed with your key!

## 6. Check Status

```bash
./dist/scopeos-cli auth whoami
```

Shows your authentication and key status.

## Common Commands

### List all keys
```bash
./dist/scopeos-cli keys list
```

### Switch active key
```bash
./dist/scopeos-cli keys activate another-key
```

### POST request
```bash
./dist/scopeos-cli proxy my-api-slug /users \
  --method POST \
  --data '{"name":"Alice","email":"alice@example.com"}'
```

### Verbose mode (see signature)
```bash
./dist/scopeos-cli proxy my-api-slug /users --verbose
```

## Installation (Optional)

Move to your PATH for easy access:

```bash
sudo mv ./dist/scopeos-cli /usr/local/bin/
```

Now you can use it from anywhere:
```bash
scopeos-cli auth whoami
```

## Troubleshooting

### Can't authenticate?
- Check your OAuth settings in `.env`
- Make sure callback URL is `http://localhost:8918/callback`
- Verify Clerk application has PKCE enabled

### "No active key" error?
Generate a key first:
```bash
scopeos-cli keys generate --label my-key
```

### Signature verification fails?
- Ensure system clock is synchronized
- Check key status: `scopeos-cli keys list`
- Try generating a new key

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- View your keys at https://scopeos.xyz/dashboard/verification-keys
- Configure multiple keys for different environments

## Architecture Overview

```
┌─────────────┐
│   Browser   │ ◄─── OAuth Login
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│  ScopeOS    │ ◄───►│   Backend    │
│     CLI     │      │     API      │
└──────┬──────┘      └──────────────┘
       │
       ▼
┌─────────────┐
│ Private Key │
│  (Encrypted)│
│   ~/.scopeos-cli/
└─────────────┘
```

**Key Points:**
- OAuth is used ONCE for workspace discovery
- Keys are used for ALL API calls
- Private keys NEVER leave your machine
- All requests automatically signed with Ed25519
