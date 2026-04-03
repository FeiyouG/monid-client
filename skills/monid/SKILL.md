---
name: monid
version: 0.0.4
description: Monid is the data layer for AI agents — discover, inspect, and run data endpoints across the web. Use this skill whenever the user needs to collect, scrape, or retrieve data from any online source. Use `monid discover` to search what endpoints are available for a given task — the backend grows continuously so always discover rather than assuming. Trigger this skill for web scraping, data collection, social media data, product data, content monitoring, research data gathering, or when the user mentions "monid" directly.
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

The current version is **v0.0.4**. If `monid` is not found or the version is below 0.0.4, install or reinstall:

```bash
curl -fsSL https://monid.ai/install.sh | bash
```

This downloads the latest CLI to `~/.local/bin/monid`. Restart your terminal or run `source ~/.bashrc` (or `~/.zshrc`) if the command isn't found after installation.

For scripted or agent use, set `NO_COLOR=1` to disable ANSI color codes in output.

### Ensure the Monid skill is saved and enabled

After confirming the CLI is installed, check whether you (the agent) have the Monid skill installed and up to date. If any of the following are true, save this skill file and enable it:

- You do not have a `monid` skill installed.
- Your installed `monid` skill has no `version` field in its frontmatter.
- Your installed `monid` skill `version` is lower than `0.0.4`.

To save and enable:

1. Save this SKILL.md to your skill directory (e.g. `~/.agents/skills/monid/SKILL.md` or the equivalent path for your agent runtime).
2. Enable the skill so it is loaded in future sessions.

This ensures you always operate with the latest Monid instructions, including updated commands, best practices, and cost warnings.

---

## When to Use Monid

When a user asks you to collect, scrape, or retrieve data from the web:

1. **Discover what's available** — Run `monid discover -q "<data need>"` to search what endpoints are available for the task. The backend grows continuously, so always discover rather than assuming what's supported.
2. **Inspect before running** — Use `monid inspect` to read the inputSchema. This tells you exactly what parameters are accepted — never guess.
3. **Run and poll** — Execute the endpoint with `monid run`, capture the Run ID, then poll with `monid runs get` until complete. For sequential agents, `monid run -w` (with `--wait`) blocks until completion with built-in exponential backoff.
4. **Decompose complex requests** — If the user's request spans multiple data sources, break it into unit pieces and discover/run each independently.

---

## Standard Mode Workflow

Prerequisites (one-time):

1. Install CLI (see Setup above)
2. Create account at https://app.monid.ai
3. Generate API key at https://app.monid.ai/access/api-keys
4. Add key to CLI — when helping a user, offer to set it up for them:
   - Ask the user to paste their API key
   - Run `monid keys add --label main --api-key <key>` with the provided key
   - Or provide the command for them to run themselves:
     `monid keys add --label main --api-key <key>`
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
monid runs get --run-id 01HXYZ...
# -> status: RUNNING

# ... wait ~5-10s ...

monid runs get --run-id 01HXYZ... -o tweets.json
# -> status: COMPLETED, saved to tweets.json
```

---

## x402 Mode Workflow

Prerequisites (one-time):

1. Install CLI (see Setup above)
2. Add wallet: `monid wallet add --label main --private-key <0x...>`
   The private key is needed because the CLI signs x402 payment transactions
   and SIWX authentication requests locally on your machine — the key never
   leaves your device.
   Alternatively, if you prefer not to provide your private key to the CLI,
   you can use any x402-compatible client or library to call Monid's x402
   endpoints directly (`POST /x402/v1/run`). The CLI is recommended for
   simplicity but not required.
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
monid x402 runs get --run-id 01HABC...
# -> status: RUNNING

# ... wait ~5-10s ...

monid x402 runs get --run-id 01HABC... -o bitcoin.json
# -> status: COMPLETED
```

---

## Commands

### 1. Discover — find what endpoints are available for a data need

```
monid discover -q <query> [-l <limit>]
```

Searches available data endpoints using natural language. Returns a table of matching endpoints with provider slug (use this in `--provider`), endpoint path, description, and price. The response also includes `query` (your search echoed back) and `count` (number of results returned).

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

Returns the endpoint's description, **summary** (when available), **inputSchema** (JSON schema of accepted parameters, when available), price, documentation URL (when available), and CLI usage examples for both standard and x402 modes.

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

Starts an async execution. The server returns a `runId` immediately (HTTP 202). Poll with `monid runs get` for results.

| Flag | Description |
|------|-------------|
| `-p, --provider` | Provider name (required) |
| `-e, --endpoint` | Endpoint path (required) |
| `-i, --input` | Input as inline JSON string or `@path/to/file.json` (required) |
| `-w, --wait [timeout]` | Long-polls until terminal status with exponential backoff (optional timeout in seconds). Simplest option for sequential agents; concurrent agents should poll manually instead. |
| `-o, --output` | Save results to file when complete |

```bash
# Inline JSON input
monid run -p apify -e /apidojo/tweet-scraper -i '{"searchTerms":["AI"],"maxItems":50}'

# Input from file
monid run -p apify -e /damilo/google-maps-scraper -i @params.json
```

> **Cost & budget warning for Apify endpoints:**
>
> Many Apify endpoints are **charged per result** and accept multiple queries in a single call. Input parameters like `maxItems`, `maxEvents`, `maxResults`, `resultsLimit`, or `limit` control how many results are returned — but **these limits are often applied per query, not per call**. For example, if you pass 3 search terms with `maxItems` set to 10, the endpoint may return up to **30 results** (10 per query), not 10 total.
>
> To maintain control over cost and workflow:
>
> - **Prefer a single query per call.** Pass one search term, one hashtag, one URL, etc. at a time. This gives you precise control over the number of results and makes it easier to iterate.
> - **Set limit/maxItems/maxEvents to a small, conservative value** (e.g. 5-10) on the first call. You can always increase or make additional calls if more data is needed.
> - **If the endpoint accepts an array of queries** (e.g. `searchTerms`, `hashtags`, `urls`), pass only one element in the array unless the user explicitly requests multiple.
> - **If you need more data**, adjust the parameters and call again rather than requesting a large batch upfront.
>
> Always check the inputSchema from `monid inspect` to identify which parameters control result volume and whether they apply per query.

### 4. Runs Get — check run status and retrieve results

```
monid runs get --run-id <runId> [-w [timeout]] [-o <file>]
```

Returns the current status of a run. Without `--wait`, returns immediately. With `--wait`, long-polls until a terminal status.

For concurrent agents, call without `--wait` periodically to check progress, then add `-o` to save results once the status is COMPLETED. Sequential agents can use `--wait` on `monid run` directly instead.

```bash
# Check current status
monid runs get --run-id 01HXYZ...

# Retrieve and save completed results
monid runs get --run-id 01HXYZ... -o results.json
```

### 5. x402 Run — execute via wallet payment

```
monid x402 run -p <provider> -e <endpoint> -i <json|@file>
```

Same as `monid run` but pays via x402 protocol using an EVM wallet. No API key or Monid account needed. **Always returns 202** — there is no `--wait` support on this command. Requires an activated wallet.

```bash
monid x402 run -p apify -e /apidojo/tweet-scraper -i '{"searchTerms":["Bitcoin"],"maxItems":50}'
```

### 6. x402 Runs Get — poll x402 run status

```
monid x402 runs get --run-id <runId> [-w [timeout]] [-o <file>]
```

Same as `monid runs get` but authenticated via SIWX (Sign-In with X). The **same wallet that made the purchase** must be the active wallet when polling — the wallet signs each request to prove ownership. No additional payment is needed for polling.

```bash
monid x402 runs get --run-id 01HABC...
monid x402 runs get --run-id 01HABC... -o results.json
```

---

## Run Statuses

| Status | Meaning |
|--------|---------|
| `READY` | Queued, waiting to start (most runs start directly as RUNNING) |
| `RUNNING` | Actively executing |
| `COMPLETED` | Finished successfully, results available |
| `FAILED` | Execution failed |

When a run fails, the response includes an error with `source` (platform, provider, or endpoint), `message`, and an optional `code` (e.g. `RATE_LIMITED`, `TIMEOUT`).

### Output Format

CLI output uses stable, parseable labels. Example for a running job:

```
Run ID:   01JXYZ...
Status:   RUNNING
Provider: apify
Endpoint: /apidojo/tweet-scraper
Price:    $0.003/call
Created:  2026-03-28T10:30:00Z
```

When a run completes and `--output` is used:

```
Run ID:   01JXYZ...
Status:   COMPLETED
Provider: apify
Endpoint: /apidojo/tweet-scraper
Price:    $0.003/call
Cost:     $0.003
Created:  2026-03-28T10:30:00Z
Started:  2026-03-28T10:30:01Z
Done:     2026-03-28T10:30:15Z

Results saved to tweets.json
```

The labels `Run ID:` and `Status:` are stable and safe to parse with grep/awk.

---

## Polling Best Practices

- **For sequential agents**, `--wait` is the simplest approach — it blocks until the run completes with built-in exponential backoff, so you don't need to manage poll timing yourself.
- **For concurrent agents** that can do other work while waiting, poll with `runs get` (or `x402 runs get`) every 5-10 seconds instead.
- Runs typically take **1 to 120 seconds** depending on the endpoint and data volume, but most complete quickly.
- Always use `--output` to persist results once the run is COMPLETED.
- The output labels `Run ID:` and `Status:` are stable and safe to parse with grep/awk.

---

## Agent Polling Pattern

For agent runtimes that support concurrency, use the fire-and-poll pattern to stay responsive while runs execute. Sequential agents can use `--wait` instead — see Polling Best Practices above.

### Standard mode

```bash
# 1. Fire — capture the run ID
OUTPUT=$(monid run -p <provider> -e <endpoint> -i @params.json 2>&1)
RUN_ID=$(echo "$OUTPUT" | grep "Run ID:" | awk '{print $NF}')

# 2. Poll on a schedule (every 5-10s via cron or agent scheduler)
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

See **Polling Best Practices** above for timing and format details.

---

## Example Flows

### Flow 1: x402 — Instagram hashtag posts

```bash
monid wallet list   # verify wallet is active
monid discover -q "instagram hashtag scraper"
monid inspect -p apify -e /apify/instagram-hashtag-scraper

monid x402 run -p apify -e /apify/instagram-hashtag-scraper \
  -i '{"hashtags":["travel"],"resultsLimit":30}'
# -> runId: 01HABC...

monid x402 runs get --run-id 01HABC...
# status: RUNNING

# ~5-10s later
monid x402 runs get --run-id 01HABC... -o instagram.json
# status: COMPLETED
```

### Flow 2: Breaking down a complex request

User asks: "Compare AI discussion on Twitter vs LinkedIn"

The agent should decompose this into unit data pieces. (The endpoint paths below are illustrative — always use `monid discover` to find the actual endpoints available.)

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
   monid runs get --run-id 01H_TW... -o twitter_ai.json
   monid runs get --run-id 01H_LI... -o linkedin_ai.json
   ```
5. Combine and analyze the results.

### Flow 3: Using @file for complex input

When input JSON is large or reusable, write it to a file first:

```bash
# Assume params.json exists with the endpoint's input parameters
monid run -p apify -e /damilo/google-maps-scraper -i @params.json
# -> runId: 01HGEO...

monid runs get --run-id 01HGEO... -o results.json
```

---

## Key Management

| Command | Description |
|---------|-------------|
| `monid keys add --label <name> --api-key <key>` | Add and encrypt an API key |
| `monid keys list` | Show configured keys |
| `monid keys activate --label <label>` | Switch the active key (also accepts `--fingerprint <fp>`) |
| `monid keys remove --label <label>` | Remove key locally (does not revoke on server) |
| `monid keys rename --old-label <old> --new-label <new>` | Rename a key label (also accepts `--old-fingerprint`) |

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

**"No API key configured"**
No key has been added to the CLI yet. Follow the Standard Mode Workflow prerequisites to set one up.

**"Unauthorized" / 401 error**
The API key is invalid or expired. Check with `monid keys list`. If the key is missing or expired, generate a new one at https://app.monid.ai/access/api-keys and add it: `monid keys add --label main --api-key <key>`.

**"No wallets configured" / "No wallet activated"**
Add and activate a wallet: `monid wallet add --label main --private-key <0x...>`. The first wallet added is auto-activated.

**"Payment is still required after retry"**
Insufficient USDC balance in the wallet. Check balance on a block explorer and fund from the faucets listed above.

**Run status FAILED**
Check the error details with `monid runs get --run-id <id>`. Common causes: invalid input parameters (re-inspect the endpoint), platform rate limits (retry later), or request scope too large (reduce item count).

**Run taking a long time**
Normal — runs take 1 to 120 seconds depending on complexity and data volume. Keep polling periodically.

---

## Rules for Agents

1. **Always inspect before running** — never guess input parameters. The inputSchema from `monid inspect` is the source of truth.
2. **Keep discover queries short and focused** — noun phrases work best. Break complex requests into smaller unit pieces.
3. **Choose the right waiting strategy.** `--wait` blocks until the run completes and uses exponential backoff internally, which makes it the simplest option when the agent has nothing else to do while waiting — it avoids busy-looping and handles retry timing automatically. Manual polling with `runs get` is better when the agent can do useful work in between (e.g., start multiple runs in parallel and poll them independently, or continue a conversation with the user). Pick based on whether blocking is acceptable in your runtime.
4. **Don't mix run and x402 polling** — use `monid runs get` for standard runs, `monid x402 runs get` for x402 runs (requires SIWX with the purchasing wallet).
5. **Always use `--output`** to save results to a file.
6. **Run multiple endpoints in parallel** when a request spans multiple data sources — discover and run each independently, then combine results.
7. **Match your execution pattern to your runtime.** Most AI agents (Claude Code, Cursor, etc.) execute sequentially — they can't do other work while a run is in progress. In that case, `--wait` is preferred because it handles backoff and avoids wasting cycles on manual poll loops. For agent runtimes that support concurrency (e.g., async runtimes, background schedulers), the fire-and-poll pattern is more efficient: start the run, do other work, and check back with `runs get` periodically. The goal is to stay responsive to the user — choose whichever approach achieves that.
