---
name: monid
description: Monid is the data layer for AI agents — discover, inspect, and run data endpoints across the web. Use this skill to help users set up Monid and collect structured data from web platforms.
---

# Monid CLI

Monid is the data layer for AI agents — a CLI that lets you discover data endpoints across the web, inspect their schemas, execute them with structured input, and retrieve results.

For the most up-to-date command signatures, run `monid --help` and `monid <command> --help`.

---

## Setup

Check if Monid is installed and up to date:

```bash
monid --version
```

The current version is **v0.0.3**. If `monid` is not found or the version is below 0.0.3, install or reinstall:

```bash
curl -fsSL https://monid.ai/install.sh | bash
```

This downloads the latest CLI to `~/.local/bin/monid`. Restart your terminal or run `source ~/.bashrc` (or `~/.zshrc`) if the command isn't found after installation.

---

## Commands

### 1. Discover — find what endpoints are available for a data need

```
monid discover -q <query> [-l <limit>]
```

Searches available data endpoints using natural language. Returns a table of matching endpoints with provider, endpoint path, description, and price.

Keep queries **short, concise, and right to the point** — the more specific and focused the query, the more accurate the results. Avoid long sentences; prefer noun phrases that describe the data source directly.

For complex user requests, analyze what data is needed to achieve the end result, **break it down into smaller unit pieces**, and call discover separately for each to find the best endpoint per piece.

```bash
monid discover -q "twitter posts"
monid discover -q "instagram hashtag scraper" -l 3
monid discover -q "amazon product prices"
monid discover -q "linkedin job listings"
```

### 2. Inspect — get full details for a specific endpoint

```
monid inspect -p <provider> -e <endpoint>
```

Returns the endpoint's description, summary, **inputSchema** (JSON schema of accepted parameters), price, documentation URL, and usage instructions for both standard and x402 modes.

**Always inspect before running.** The inputSchema tells you exactly what parameters the endpoint accepts. Never guess input parameters.

```bash
monid inspect -p apify -e /apidojo/tweet-scraper
monid inspect -p apify -e /apify/instagram-hashtag-scraper
monid inspect -p apify -e /damilo/google-maps-scraper
```

### 3. Run — execute a data endpoint

```
monid run -p <provider> -e <endpoint> -i <json|@file> [-w [timeout]] [-o <file>]
```

Starts an async execution. The server returns a `runId` immediately.

| Flag | Description |
|------|-------------|
| `-p, --provider` | Provider name (required) |
| `-e, --endpoint` | Endpoint path (required) |
| `-i, --input` | Input as inline JSON string or `@path/to/file.json` (required) |
| `-w, --wait` | Optional. Long-polls until terminal status. **Prefer manual polling instead.** |
| `-o, --output` | Save results to file when complete |

```bash
# Inline JSON input
monid run -p apify -e /apidojo/tweet-scraper -i '{"searchTerms":["AI"],"maxItems":50}'

# Input from file
monid run -p apify -e /damilo/google-maps-scraper -i @params.json
```

### 4. Runs Get — check run status and retrieve results

```
monid runs get -r <runId> [-w [timeout]] [-o <file>]
```

Returns the current status of a run. Without `--wait`, returns immediately. With `--wait`, long-polls until a terminal status.

**Preferred approach:** call without `--wait` periodically to check progress, then add `-o` to save results once the status is COMPLETED.

```bash
# Check current status
monid runs get -r 01HXYZ...

# Retrieve and save completed results
monid runs get -r 01HXYZ... -o results.json
```

### 5. x402 Run — execute via anonymous wallet payment

```
monid x402 run -p <provider> -e <endpoint> -i <json|@file>
```

Same as `monid run` but pays via x402 protocol using an EVM wallet. No API key or Monid account needed. **Always returns 202** — there is no `--wait` support on this command. Requires an activated wallet.

```bash
monid x402 run -p apify -e /apidojo/tweet-scraper -i '{"searchTerms":["Bitcoin"],"maxItems":50}'
```

### 6. x402 Runs Get — poll x402 run status

```
monid x402 runs get -r <runId> [-w [timeout]] [-o <file>]
```

Same as `monid runs get` but authenticated via SIWX (Sign-In with X). The **same wallet that made the purchase** must be the active wallet when polling — the wallet signs each request to prove ownership. No additional payment is needed for polling.

```bash
monid x402 runs get -r 01HABC...
monid x402 runs get -r 01HABC... -o results.json
```

---

## Run Statuses

| Status | Meaning |
|--------|---------|
| `READY` | Queued, waiting to start |
| `RUNNING` | Actively executing |
| `COMPLETED` | Finished successfully, results available |
| `FAILED` | Execution failed |

When a run fails, the response includes an error with `source` (platform, provider, or endpoint), `message`, and an optional `code` (e.g. `RATE_LIMITED`, `TIMEOUT`).

---

## Polling Best Practices

- **Prefer manual polling over `--wait`**: call `runs get` (or `x402 runs get`) without `--wait`, check the status field, and poll again after some time.
- Runs typically take **1 to 120 seconds** depending on the endpoint and data volume.
- For agents: poll roughly every 15-30 seconds. Do not block the user conversation.
- `--wait` exists for simple interactive use, but agents should avoid it to stay non-blocking.
- Always use `--output` to persist results once the run is COMPLETED.
- The output labels `Run ID:` and `Status:` are stable and safe to parse with grep/awk.

---

## Agent Polling Pattern (Cron)

For AI agent runtimes that cannot block, use the fire-and-poll pattern with
cron or scheduler-based polling. **Never use `--wait` or `sleep` in agent code.**

### Standard mode

```bash
# 1. Fire — capture the run ID
OUTPUT=$(monid run -p <provider> -e <endpoint> -i @params.json 2>&1)
RUN_ID=$(echo "$OUTPUT" | grep "Run ID:" | awk '{print $NF}')

# 2. Poll on a schedule (every 20s via cron or agent scheduler)
monid runs get --run-id "$RUN_ID"
#    → parse the "Status:" line
#    → when COMPLETED: save output, remove the polling job

# 3. Save results once complete
monid runs get --run-id "$RUN_ID" -o results.json
```

### x402 mode

```bash
# 1. Fire (always returns 202)
OUTPUT=$(monid x402 run -p <provider> -e <endpoint> -i @params.json 2>&1)
RUN_ID=$(echo "$OUTPUT" | grep "Run ID:" | awk '{print $NF}')

# 2. Poll (same wallet must be active)
monid x402 runs get --run-id "$RUN_ID"

# 3. Save when complete
monid x402 runs get --run-id "$RUN_ID" -o results.json
```

### Key points

- Poll every 15-30 seconds. Most runs complete within 120 seconds.
- Parse the `Status:` line for `COMPLETED` or `FAILED`.
- Always use `--output` to persist results to a file once complete.
- The output labels `Run ID:` and `Status:` are stable and safe to parse.
- Set `NO_COLOR=1` or pipe output to ensure clean text without ANSI escape codes.

---

## Standard Mode Workflow

Prerequisites (one-time):

1. Install CLI (see Setup above)
2. Create account at https://app.monid.ai
3. Generate API key at https://app.monid.ai/access/api-keys
4. Add key to CLI: `monid keys add --label main --api-key <key>`
5. Verify: `monid keys list`

Execution:

```bash
# 1. Discover
monid discover -q "twitter posts"

# 2. Inspect — read the inputSchema
monid inspect -p apify -e /apidojo/tweet-scraper

# 3. Run
monid run -p apify -e /apidojo/tweet-scraper \
  -i '{"searchTerms":["AI"],"maxItems":50}'
# -> Run started: 01HXYZ...

# 4. Poll periodically
monid runs get -r 01HXYZ...
# -> status: RUNNING

# ... wait ~15s ...

monid runs get -r 01HXYZ... -o tweets.json
# -> status: COMPLETED, saved to tweets.json
```

---

## x402 Anonymous Mode Workflow

Prerequisites (one-time):

1. Install CLI (see Setup above)
2. Add wallet: `monid wallet add --label main --private-key <0x...>`
3. Fund wallet with USDC (payment) and ETH (gas) on Base Sepolia:
   - USDC faucet: https://faucet.circle.com/ (select Base Sepolia)
   - ETH faucet: https://www.alchemy.com/faucets/base-sepolia

Execution:

```bash
# 1. Discover + Inspect (same as standard)
monid discover -q "twitter posts"
monid inspect -p apify -e /apidojo/tweet-scraper

# 2. Run via x402 (always returns 202)
monid x402 run -p apify -e /apidojo/tweet-scraper \
  -i '{"searchTerms":["Bitcoin"],"maxItems":50}'
# -> Run started: 01HABC...

# 3. Poll with the same wallet that made the purchase
monid x402 runs get -r 01HABC...
# -> status: RUNNING

# ... wait ~15s ...

monid x402 runs get -r 01HABC... -o bitcoin.json
# -> status: COMPLETED
```

---

## Example Flows

### Flow 1: Collect tweets about a topic

```bash
monid discover -q "twitter posts"
monid inspect -p apify -e /apidojo/tweet-scraper
monid run -p apify -e /apidojo/tweet-scraper \
  -i '{"searchTerms":["AI agents"],"maxItems":50}'
# -> runId: 01HXYZ...

monid runs get -r 01HXYZ...
# status: RUNNING

# ~15s later
monid runs get -r 01HXYZ... -o tweets.json
# status: COMPLETED
```

### Flow 2: x402 anonymous — Instagram hashtag posts

```bash
monid wallet list   # verify wallet is active
monid discover -q "instagram hashtag scraper"
monid inspect -p apify -e /apify/instagram-hashtag-scraper

monid x402 run -p apify -e /apify/instagram-hashtag-scraper \
  -i '{"hashtags":["travel"],"resultsLimit":30}'
# -> runId: 01HABC...

monid x402 runs get -r 01HABC...
# status: RUNNING

# ~15s later
monid x402 runs get -r 01HABC... -o instagram.json
# status: COMPLETED
```

### Flow 3: Breaking down a complex request

User asks: "Compare AI discussion on Twitter vs LinkedIn"

The agent should decompose this into unit data pieces:

1. Discover separately:
   ```bash
   monid discover -q "twitter posts"
   monid discover -q "linkedin posts"
   ```
2. Inspect each endpoint to learn their input schemas.
3. Run both:
   ```bash
   monid run -p apify -e /apidojo/tweet-scraper \
     -i '{"searchTerms":["AI"],"maxItems":50}'
   # -> runId: 01H_TW...

   monid run -p apify -e /harvestapi/linkedin-post-search \
     -i '{"keywords":"AI","maxResults":50}'
   # -> runId: 01H_LI...
   ```
4. Poll each independently:
   ```bash
   monid runs get -r 01H_TW... -o twitter_ai.json
   monid runs get -r 01H_LI... -o linkedin_ai.json
   ```
5. Combine and analyze the results.

### Flow 4: Using @file for complex input

When input JSON is large or reusable, write it to a file first:

```bash
# Assume params.json exists with the endpoint's input parameters
monid run -p apify -e /damilo/google-maps-scraper -i @params.json
# -> runId: 01HGEO...

monid runs get -r 01HGEO... -o results.json
```

---

## Key Management

| Command | Description |
|---------|-------------|
| `monid keys add --label <name> --api-key <key>` | Add and encrypt an API key |
| `monid keys list` | Show configured keys |
| `monid keys activate <label>` | Switch the active key |
| `monid keys remove <label>` | Remove key locally (does not revoke on server) |
| `monid keys rename <old> <new>` | Rename a key label |

API key format: `monid_<stage>_<key>` (e.g. `monid_live_abc123...`).

Generate keys at https://app.monid.ai/access/api-keys.

---

## Wallet Management

| Command | Description |
|---------|-------------|
| `monid wallet add --label <name> --private-key <0x...>` | Add and encrypt an EVM wallet |
| `monid wallet list` | Show configured wallets |
| `monid wallet activate --label <name>` | Switch the active wallet |
| `monid wallet remove --label <name>` | Remove wallet and delete encrypted key file |

Testnet faucets (Base Sepolia):
- USDC: https://faucet.circle.com/
- ETH: https://www.alchemy.com/faucets/base-sepolia

---

## Troubleshooting

**"Invalid API key" / "Unauthorized"**
Check that the key is still active at https://app.monid.ai/access/api-keys. If revoked or expired, generate a new one and add it with `monid keys add`.

**"No wallets configured" / "No wallet activated"**
Add and activate a wallet: `monid wallet add --label main --private-key <0x...>`. The first wallet added is auto-activated.

**"Payment is still required after retry"**
Insufficient USDC balance in the wallet. Check balance on a block explorer and fund from the faucets listed above.

**Run status FAILED**
Check the error details with `monid runs get -r <id>`. Common causes: invalid input parameters (re-inspect the endpoint), platform rate limits (retry later), or request scope too large (reduce item count).

**Run taking a long time**
Normal — runs take 1 to 120 seconds depending on complexity and data volume. Keep polling periodically.

---

## Rules for Agents

1. **Always inspect before running** — never guess input parameters. The inputSchema from `monid inspect` is the source of truth.
2. **Keep discover queries short and focused** — noun phrases work best. Break complex requests into smaller unit pieces.
3. **Don't block on `--wait`** — poll manually with `runs get` every 15-30 seconds instead.
4. **Don't mix run and x402 polling** — use `monid runs get` for standard runs, `monid x402 runs get` for x402 runs (requires SIWX with the purchasing wallet).
5. **Always use `--output`** to save results to a file.
6. **Run multiple endpoints in parallel** when a request spans multiple data sources — discover and run each independently, then combine results.
7. **Use cron/scheduler for polling** — fire `monid run`, capture the Run ID from stdout, then poll `monid runs get` on a timer. Never use `--wait`, `sleep`, or any blocking pattern in agent code.
