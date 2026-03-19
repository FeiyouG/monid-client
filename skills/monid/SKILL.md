---
name: monid
description: How to use the Monid CLI to execute data scraping and collection tasks from social media platforms, e-commerce sites, and search engines. Use this skill when the user needs to scrape data from Twitter/X, Instagram, TikTok, Facebook, LinkedIn, YouTube, Amazon, or Google Maps. This skill provides complete workflow guidance for authentication, task creation, price quotes, and execution monitoring. Monid supports two modes - standard (API key authentication) and x402 (anonymous crypto payment via EVM wallet using USDC). Use the x402 mode when the user wants anonymous execution without an account, or wants to pay with crypto. ALWAYS use this skill when the user mentions scraping, collecting, or extracting data from supported platforms, even if they don't explicitly say "Monid". Also use this skill when the user mentions x402, crypto payments for APIs, or anonymous data scraping. Use this for queries like "find tweets about X", "scrape Instagram posts", "get Amazon product reviews", "anonymous search", "pay with crypto", or any data collection from the supported platforms.
---

# Monid CLI Skill

Monid is an agentic payment platform CLI that enables secure, pay-per-use data scraping from various platforms. This skill teaches you how to help users accomplish data collection tasks using the Monid CLI.

## Core Concept

Monid supports **two execution modes**:

### Standard Mode (`monid search`)
Follows a **quote-then-execute** workflow with API key authentication:
1. **Create a task** (defines what data to collect)
2. **Get a price quote** (shows cost before execution)
3. **Execute the search** (runs the scraping job)
4. **Monitor and retrieve results** (check status and download data)

Requires a Monid account and API key. Supports both synchronous and asynchronous execution.

### x402 Anonymous Mode (`monid x402 search`)
**Anonymous, pay-per-request** execution via crypto wallet:
1. **Configure a wallet** (one-time: add an EVM private key)
2. **Execute the search** (payment is handled automatically via USDC)
3. **Get results immediately** (synchronous only)

No Monid account or API key required. Requires an EVM wallet with USDC and ETH for gas. Execution is **synchronous only** and takes 1-120 seconds (blocks until complete).

## 🚨 CRITICAL: Verify Capabilities Before Query Execution

**BEFORE suggesting or executing ANY search, you MUST:**

### 1. Verify the Platform is Supported
- Check if platform exists in the "Supported Capabilities" section below
- **Supported platforms**: X (Twitter), Instagram, TikTok, LinkedIn, YouTube, Facebook, Amazon, Google Maps
- **If platform NOT in this list** → ❌ **STOP**. Inform user it's not supported. Do NOT proceed.

### 2. Verify a Specific Capability Exists
- Match user's request to an exact capability ID (e.g., `apify#apidojo/tweet-scraper`)
- Review capability description to ensure it matches the request
- **If no matching capability exists** → ❌ **STOP**. Explain what's possible vs. what was requested.

### 3. Verify Request Feasibility
- Can the capability actually provide the requested data?
- Are the filters/parameters within capability bounds?
- Is the data publicly available?
- Is the scope reasonable (not "all tweets ever")?
- **If request cannot be fulfilled** → ❌ **STOP**. Explain limitations clearly.

### What You MUST NOT Do

❌ **DO NOT** make up capability IDs that don't exist
❌ **DO NOT** suggest workarounds for unsupported platforms (e.g., "use a different tool")
❌ **DO NOT** attempt queries that will fail
❌ **DO NOT** promise data the capabilities cannot provide
❌ **DO NOT** proceed if verification fails

### If Task Cannot Be Accomplished

**Tell the user clearly and specifically**:
- Which platform or capability is missing
- Why their request cannot be fulfilled
- What alternatives exist (if any within Monid)
- What IS supported that might help them

**Example**: "Monid doesn't support Reddit scraping. Supported platforms are: X, Instagram, TikTok, LinkedIn, YouTube, Facebook, Amazon, and Google Maps. If you need social media data, I can help you scrape from any of these platforms instead."

---

## Prerequisites

Before using Monid for data scraping, the user must complete these one-time setup steps:

### 1. Install the Monid CLI

**Quick Install (Recommended)**:
```bash
curl -fsSL https://monid.ai/install.sh | bash
```

This downloads and installs the latest stable Monid CLI to `~/.local/bin/monid`.

**Verify installation**:
```bash
monid --version
```

Expected output: `monid v0.0.3` or later. If the version is below 0.0.3 or the command fails, reinstall using the install script.

**Supported platforms**: Linux x64, macOS ARM64 (Apple Silicon), Windows x64

**Troubleshooting**:
- If `monid: command not found` after installation, restart your terminal or run `source ~/.bashrc` (or `~/.zshrc` for zsh)
- Ensure `~/.local/bin` is in your PATH
- For Windows or manual installation, download binaries from: https://github.com/FeiyouG/monid-client/releases/latest

### 2. Create a Monid Account

If you don't have a Monid account yet, you'll need to register:

1. Visit **https://app.monid.ai**
2. Click on "Sign Up" or "Get Started"
3. Complete the registration process (email, password, or social login)
4. Verify your email address if required
5. Log in to access your dashboard

### 3. Generate an API Key

Once logged into your Monid account:

1. Navigate to **https://app.monid.ai/access/api-keys**
2. Click "Generate New API Key" or "Create API Key"
3. Give your key a descriptive name (e.g., "Main CLI Key", "Development Key")
4. Copy the generated API key immediately (it won't be shown again)

**API Key Format**: Keys follow the format `monid_<stage>_<key>` (e.g., `monid_live_abc123xyz...`)

⚠️ **Important**: Store your API key securely. You won't be able to see it again after closing the generation page.

### 4. Add API Key to CLI

Add your API key to the Monid CLI:

```bash
monid keys add --label main <your-api-key>
```

Replace `<your-api-key>` with the API key you copied from the dashboard.

**What happens**:
1. CLI validates the API key format (must start with `monid_`)
2. Key is encrypted using system-specific credentials (username@hostname)
3. Encrypted key is stored locally in `~/.monid/config.yaml`
4. Key is automatically activated for use

**Verify key**:
```bash
monid keys list
```

Expected output shows your key marked with `*` (active), along with its type (API Key), prefix, and status.

### Setup Complete!

After these four steps, you're ready to execute searches. If the user hasn't completed these steps, guide them through installation, account creation, and API key setup first before attempting any searches.

## API Key Management

Once you have an API key configured, you can manage your keys using these commands:

### Available Commands

**Add a new API key**:
```bash
monid keys add --label <name> <api-key>
```
- `<name>`: A descriptive label for your key (e.g., "main", "prod", "dev")
- `<api-key>`: The API key from https://app.monid.ai/access/api-keys
- Labels must be unique
- First key added is automatically activated

**List all API keys**:
```bash
monid keys list
```
Shows a table with all configured keys, including:
- Activation status (marked with `*`)
- Key type (API Key)
- Label
- Key prefix (e.g., `monid_live`)
- Status
- Expiration (if applicable)

**Activate a key**:
```bash
monid keys activate <label>
```
Set which key should be used for API requests.

**Rename a key**:
```bash
monid keys rename <old-label> <new-label>
```
Change the label of an existing key.

**Remove a key**:
```bash
monid keys remove <label>
```
Delete an API key from your local configuration. This does NOT revoke the key on the server - do that in the web dashboard at https://app.monid.ai/access/api-keys.

### API Key Format and Validation

API keys must follow this format: `monid_<stage>_<key>`

Examples:
- `monid_live_abc123xyz...` (production)
- `monid_test_def456uvw...` (testing)

When you add a key, the CLI validates:
1. Key starts with `monid_`
2. Key contains at least 3 parts separated by `_`
3. Format matches expected pattern

Invalid keys will be rejected with a clear error message.

### Security Notes

- API keys are encrypted before being stored locally using AES-GCM encryption
- Encryption password is derived from your system credentials (username@hostname)
- Keys are stored in `~/.monid/config.yaml`
- Never share your API keys or commit them to version control
- To revoke a key, use the web dashboard at https://app.monid.ai/access/api-keys

## x402 Anonymous Search (Crypto Payment)

x402 is an alternative execution mode that allows **anonymous, account-free** data scraping. Instead of authenticating with an API key and billing to a Monid account, x402 uses an EVM crypto wallet to pay for each request directly with USDC.

### What is x402?

[x402](https://docs.x402.org) is an open payment protocol for HTTP APIs. When the server responds with HTTP 402 Payment Required, the x402 client automatically:
1. Reads the payment requirements from the response
2. Signs a USDC payment authorization using your wallet
3. Retries the request with the signed payment attached
4. Returns the results

This all happens transparently — from the user's perspective, you just run a command and get results.

### When to Use x402 vs Standard Search

| Aspect | Standard (`monid search`) | x402 (`monid x402 search`) |
|--------|--------------------------|---------------------------|
| Authentication | API key | EVM wallet (crypto) |
| Account required | Yes (monid.ai account) | **No (anonymous)** |
| Payment | Pre-quoted, billed to account | Direct USDC from wallet |
| Execution mode | Sync or async | **Synchronous only** |
| Execution time | 1-120 seconds | 1-120 seconds |
| `--wait` flag | Supported | Not needed (always synchronous) |
| `--task-id` / `--quote-id` | Supported | Not supported |
| Async polling | Yes (`monid executions get`) | No |

**Use x402 when**:
- User does not have or want a Monid account
- User wants to pay with crypto (USDC)
- User wants anonymous execution
- User has an EVM wallet with funds

**Use standard search when**:
- User has a Monid account and API key
- User needs async execution (non-blocking)
- User wants to create reusable tasks
- User needs to track executions over time

### x402 Prerequisites

Before using x402, the user needs:

1. **Monid CLI installed** (same as standard — see Installation section above)
2. **An EVM private key** (0x-prefixed, 64 hex characters)
   - This can be from any EVM-compatible wallet (MetaMask export, Foundry, etc.)
3. **Wallet funded with**:
   - **USDC** for payment (the actual search cost)
   - **ETH** for gas fees (small amount needed for transaction signing)

**For testnet (Base Sepolia)**:
- Get testnet ETH: https://www.alchemy.com/faucets/base-sepolia or https://portal.cdp.coinbase.com
- Get testnet USDC: https://faucet.circle.com/ (select Base Sepolia)

### Wallet Management

The wallet stores your EVM private key securely on disk, encrypted with AES-256-GCM using machine-specific credentials. Encrypted key files are stored at `~/.monid/wallets/<label>` with 0600 permissions.

#### Add a Wallet

```bash
monid wallet add --label <name> --private-key <0x...>
```

- `<name>`: A descriptive label (e.g., "main", "testnet")
- `<0x...>`: Your EVM private key (must start with `0x`, 66 characters total)
- The CLI derives and displays the public address for verification
- First wallet added is automatically activated

**Example**:
```bash
monid wallet add --label testnet --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
# Output:
# ✓ Wallet added successfully
#   Label:   testnet
#   Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
#   Status:  Activated
```

#### List Wallets

```bash
monid wallet list
```

Shows all configured wallets with activation status (marked with `*`), label, and public address.

#### Activate a Wallet

```bash
monid wallet activate --label <name>
```

Set which wallet to use for x402 payments. Only one wallet can be active at a time.

#### Remove a Wallet

```bash
monid wallet remove --label <name>
```

Removes the wallet from config and deletes the encrypted key file from disk.

#### Wallet Security Notes

- Private keys are encrypted with AES-256-GCM before being stored
- Encryption password is derived from system credentials (username@hostname) — keys are **not portable** between machines
- Encrypted key files have `0600` permissions (owner read/write only)
- The public address is stored in plaintext in `~/.monid/config.yaml` (safe to expose)
- Never share your private key or the encrypted wallet files

### Executing x402 Search

```bash
monid x402 search \
  --name <name> \
  --query <query> \
  --output-schema <schema> \
  [--description <desc>] \
  [--output <file>]
```

**Required flags**:
- `--name` / `-n`: Search name (descriptive label)
- `--query` / `-q`: Natural language query describing what data to collect
- `--output-schema` / `-s`: JSON schema defining expected output (inline JSON or file path)

**Optional flags**:
- `--description` / `-d`: Additional description for the search
- `--output` / `-o`: Save results to a file

**Important differences from standard search**:
- No `--wait` flag (execution is always synchronous — it blocks until complete, 1-120 seconds)
- No `--task-id` or `--quote-id` flags (no task/quote system — payment is per-request)
- No `--yes` flag (no price confirmation needed — payment is automatic)
- The same output schema guidelines apply (see "Output Schema Guidelines" section below)

### x402 Search Example

**User request**: "Anonymously find recent tweets about Bitcoin without creating an account"

**Step 1: Verify request feasibility**
- Platform: X (Twitter) - SUPPORTED
- Capability: X Tweet Scraper - EXISTS
- Feasible: Yes

**Step 2: Ensure wallet is set up**
```bash
# Check if wallet exists
monid wallet list

# If no wallet, add one
monid wallet add --label main --private-key <0x-your-private-key>
```

**Step 3: Execute x402 search**
```bash
monid x402 search \
  --name "Bitcoin Tweets" \
  --query "Find the 50 most recent tweets about Bitcoin from the past 3 days" \
  --output-schema '{
    "type": "object",
    "properties": {
      "tweets": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "text": {"type": "string"},
            "author": {"type": "string"},
            "created_at": {"type": "string"},
            "likes": {"type": "number"},
            "retweets": {"type": "number"}
          }
        }
      }
    }
  }' \
  --output bitcoin_tweets.json
```

The command will:
1. Load your active wallet and decrypt the private key
2. Send the search request to the x402 endpoint
3. Automatically handle the 402 payment (sign USDC authorization)
4. Block until results are returned (1-120 seconds)
5. Display results and save to `bitcoin_tweets.json`

### x402 Agent Guidance

Because x402 search is **synchronous only**, agents should be aware of the following:

- **Execution blocks for 1-120 seconds** — there is no async mode for x402
- **Communicate timing expectations** to the user before executing:
  ```
  "I'm going to run an anonymous x402 search. This will take 10-120 seconds 
  and will block until complete. The search cost will be paid directly from 
  your wallet in USDC."
  ```
- **No execution polling** — you cannot start the search in the background and check later
- **No execution-id** — results are returned inline; if the command fails or is interrupted, you must re-run it
- **Always use `--output`** to save results to a file so they aren't lost
- For long-running or complex tasks where async is preferred, guide the user to set up a Monid account and use standard `monid search` instead

### Troubleshooting x402

#### "No wallets configured" / "No wallet activated"
**Solution**: Add and activate a wallet:
```bash
monid wallet add --label main --private-key <0x...>
# First wallet is auto-activated; otherwise:
monid wallet activate --label main
```

#### "Payment is still required after retry"
**Cause**: Insufficient USDC balance in wallet, or the facilitator rejected the payment.

**Solution**:
1. Check your wallet balance on a block explorer (the wallet address is shown in `monid wallet list`)
2. Ensure you have both USDC (for payment) and ETH (for gas)
3. For testnet:
   - Get USDC: https://faucet.circle.com/ (select Base Sepolia)
   - Get ETH: https://www.alchemy.com/faucets/base-sepolia

#### "Network not supported"
**Cause**: The server requested a blockchain network that the x402 client doesn't support.

**Solution**: This is typically a server-side configuration issue. The x402 client supports any EVM-compatible chain (eip155:*), so this error is rare. Contact support if it persists.

#### "Decryption failed"
**Cause**: The encrypted wallet key cannot be decrypted. This happens when:
- The wallet was added on a different machine (encryption is machine-specific)
- Your system username or hostname changed since the wallet was added

**Solution**: Remove the wallet and re-add it:
```bash
monid wallet remove --label <name>
monid wallet add --label <name> --private-key <0x...>
```

#### "Failed to initialize x402 client"
**Cause**: Problem loading the wallet or setting up the payment client.

**Solution**:
1. Verify wallet exists: `monid wallet list`
2. Try removing and re-adding the wallet
3. Ensure your private key is valid (0x-prefixed, 64 hex characters)

---

## Supported Capabilities

Monid supports **ONLY** these 8 platforms with 39 total capabilities. **NEVER suggest capabilities outside this list**:

### Quick Reference Table

| Platform | Capability Name | Capability ID | Best Use Case | Est. Cost |
|----------|----------------|---------------|---------------|-----------|
| **X (Twitter)** |
| | X Tweet Scraper | `apify#apidojo/tweet-scraper` | Large-scale tweet collection, search terms, profiles, advanced filters | $0.0004/call |
| **Instagram** |
| | Instagram Scraper | `apify#apify/instagram-scraper` | General Instagram content from usernames, hashtags, locations | $0.0023/call |
| | Instagram Profile Scraper | `apify#apify/instagram-profile-scraper` | Profile-level info, influencer analysis | $0.0023/call |
| | Instagram API Scraper | `apify#apify/instagram-api-scraper` | API-style structured extraction, programmatic pipelines | $0.0020/call |
| | Instagram Hashtag Scraper | `apify#apify/instagram-hashtag-scraper` | Hashtag pages, trend tracking, campaign monitoring | $0.0023/call |
| | Instagram Post Scraper | `apify#apify/instagram-post-scraper` | Direct post URLs, deterministic URL-driven workflows | $0.0023/call |
| **TikTok** |
| | TikTok API Scraper | `apify#scraptik/tiktok-api` | Flexible TikTok collection (profiles, videos, hashtags, search) | $0.0020/call |
| | TikTok Profile Scraper | `apify#apidojo/tiktok-profile-scraper` | Creator profiles, influencer tracking | $0.0003/call |
| | TikTok Scraper | `apify#apidojo/tiktok-scraper` | High-throughput video collection from profiles, hashtags, keywords | $0.0003/call |
| | TikTok Post Scraper | `apify#thenetaji/tiktok-post-scraper` | Individual posts by URL | $0.0015/call |
| | TikTok Video Scraper | `apify#clockworks/tiktok-video-scraper` | Detailed video metadata, per-video extraction | $0.0100/call |
| **LinkedIn** |
| | LinkedIn Post Search | `apify#harvestapi/linkedin-post-search` | Find posts by keywords, topic monitoring | $0.0020/call |
| | LinkedIn Profile Search | `apify#harvestapi/linkedin-profile-search` | Search people by role/company/location, lead generation | $0.1000/call |
| | LinkedIn Job Search | `apify#powerai/linkedin-job-search-scraper` | Job listings, hiring intelligence | $0.0050/call |
| | LinkedIn Company Search | `apify#powerai/linkedin-company-search-scraper` | Company pages, organization data | $0.0050/call |
| **YouTube** |
| | YouTube Scraper | `apify#streamers/youtube-scraper` | Videos from searches, channels, URLs | $0.0030/call |
| | YouTube Comments Scraper | `apify#streamers/youtube-comments-scraper` | Comments and threads, sentiment analysis | $0.0015/call |
| | YouTube Scraper (API Dojo) | `apify#apidojo/youtube-scraper` | High-volume, cost-effective scraping | $0.0005/call |
| | YouTube Video Transcript | `apify#starvibe/youtube-video-transcript` | Video transcripts with timing, NLP workflows | $0.0050/call |
| **Facebook** |
| | Facebook Reviews Scraper | `apify#apify/facebook-reviews-scraper` | Reviews from pages, reputation monitoring | $0.0020/call |
| | Facebook Events Scraper | `apify#apify/facebook-events-scraper` | Event listings, local activity tracking | $0.0100/call |
| | Facebook Marketplace Scraper | `apify#curious_coder/facebook-marketplace` | Marketplace listings, market monitoring | $0.0050/call |
| | Facebook Pages Scraper | `apify#apify/facebook-pages-scraper` | Page data and content, page monitoring | $0.0100/call |
| | Facebook Groups Scraper | `apify#apify/facebook-groups-scraper` | Public group posts, community monitoring | $0.0040/call |
| | Facebook Comments Scraper | `apify#apify/facebook-comments-scraper` | Comments from posts/pages, sentiment analysis | $0.0020/call |
| | Facebook Ads Library Scraper | `apify#curious_coder/facebook-ads-library-scraper` | Ads library data, competitive research | $0.0008/call |
| **Amazon** |
| | Amazon Product Scraper | `apify#delicious_zebu/amazon-product-scraper` | Product details from URLs (price, reviews, ratings) | $0.0010/call |
| | Amazon Reviews Scraper | `apify#axesso_data/amazon-reviews-scraper` | Customer reviews, review analysis | $0.0070/call |
| | Amazon Search Scraper | `apify#axesso_data/amazon-search-scraper` | Search results, product listings | $0.0001/call |
| **Google** |
| | Google Maps Scraper | `apify#damilo/google-maps-scraper` | Businesses by query + location (BOTH REQUIRED) | $0.0030/call |

### Platform-Specific Details

#### X (Twitter)

**Single Capability**: X Tweet Scraper (`apify#apidojo/tweet-scraper`)
- **Can scrape**: Search terms, profile handles (@username), list URLs, tweet URLs
- **Advanced filters**: Date range, language, media type, engagement thresholds
- **Best for**: Any Twitter scraping task - large-scale collection, trend analysis, sentiment analysis

**Example queries**:
- "Recent tweets about Bitcoin in the past week"
- "Tweets from @elonmusk in the last month"
- "Viral tweets with >10k likes about AI"

#### Instagram

**5 Capabilities** - Choose based on data source:

1. **Instagram Scraper** (`apify#apify/instagram-scraper`) - General purpose
   - Scrape posts from usernames, hashtags, locations
   - Best for: Broad Instagram content collection

2. **Instagram Profile Scraper** (`apify#apify/instagram-profile-scraper`)
   - Extract profile information and account metrics
   - Best for: Influencer analysis, account research

3. **Instagram API Scraper** (`apify#apify/instagram-api-scraper`)
   - API-style structured data extraction
   - Best for: Programmatic integration pipelines

4. **Instagram Hashtag Scraper** (`apify#apify/instagram-hashtag-scraper`)
   - Scrape hashtag pages and posts
   - Best for: Trend tracking, campaign monitoring

5. **Instagram Post Scraper** (`apify#apify/instagram-post-scraper`)
   - Extract specific posts from direct URLs
   - Best for: Known post URLs, deterministic collection

**Selection guide**:
- Have post URLs? → Post Scraper
- Tracking hashtags? → Hashtag Scraper
- Analyzing influencers? → Profile Scraper
- Need API-style data? → API Scraper
- General collection? → Instagram Scraper

#### TikTok

**5 Capabilities** - Choose based on scope:

1. **TikTok API Scraper** (`apify#scraptik/tiktok-api`) - Most flexible
   - Supports profiles, videos, hashtags, search
   - Best for: Multi-purpose TikTok collection

2. **TikTok Profile Scraper** (`apify#apidojo/tiktok-profile-scraper`)
   - Creator profiles and metrics
   - Best for: Influencer tracking

3. **TikTok Scraper** (`apify#apidojo/tiktok-scraper`)
   - High-throughput video collection
   - Best for: Profiles, hashtags, keywords at scale

4. **TikTok Post Scraper** (`apify#thenetaji/tiktok-post-scraper`)
   - Individual posts by URL
   - Best for: Specific video collection

5. **TikTok Video Scraper** (`apify#clockworks/tiktok-video-scraper`)
   - Detailed per-video metadata
   - Best for: Focused video extraction (more expensive at $0.01/call)

**Selection guide**:
- Need flexibility? → API Scraper
- High volume? → TikTok Scraper (cheaper at $0.0003/call)
- Specific videos? → Post/Video Scraper
- Creator focus? → Profile Scraper

#### LinkedIn

**4 Capabilities** - Choose based on entity type:

1. **LinkedIn Post Search** (`apify#harvestapi/linkedin-post-search`)
   - Find posts by keyword queries
   - Best for: Topic monitoring, brand discussions

2. **LinkedIn Profile Search** (`apify#harvestapi/linkedin-profile-search`)
   - Search people profiles by role, company, location
   - ⚠️ **Most expensive** at $0.10/call (20x other LinkedIn scrapers)
   - Best for: Lead generation, market mapping
   - Only use when specifically searching for people profiles

3. **LinkedIn Job Search** (`apify#powerai/linkedin-job-search-scraper`)
   - Collect job listings from searches
   - Best for: Hiring intelligence, talent mapping

4. **LinkedIn Company Search** (`apify#powerai/linkedin-company-search-scraper`)
   - Find company pages and organization data
   - Best for: Company prospecting

#### YouTube

**4 Capabilities** - Choose based on data type:

1. **YouTube Scraper** (`apify#streamers/youtube-scraper`)
   - General video and channel scraping
   - Best for: Broad YouTube data collection

2. **YouTube Comments Scraper** (`apify#streamers/youtube-comments-scraper`)
   - Extract comments and thread metadata
   - Best for: Sentiment analysis, engagement research

3. **YouTube Scraper (API Dojo)** (`apify#apidojo/youtube-scraper`)
   - High-volume, cost-effective (60% cheaper at $0.0005/call)
   - Best for: Scalable YouTube collection

4. **YouTube Video Transcript** (`apify#starvibe/youtube-video-transcript`)
   - Fetch video transcripts with timing data
   - Best for: Summarization, semantic search, NLP workflows

**Selection guide**:
- Need transcripts? → Video Transcript
- Need comments? → Comments Scraper
- Cost-sensitive? → API Dojo version
- General collection? → Standard YouTube Scraper

#### Facebook

**7 Capabilities** - Most granular platform:

1. **Facebook Reviews Scraper** (`apify#apify/facebook-reviews-scraper`)
   - Scrape reviews from Facebook pages
   - Best for: Reputation monitoring

2. **Facebook Events Scraper** (`apify#apify/facebook-events-scraper`)
   - Extract event listings and metadata
   - Best for: Event intelligence, local activity tracking

3. **Facebook Marketplace Scraper** (`apify#curious_coder/facebook-marketplace`)
   - Scrape marketplace buy/sell listings
   - Best for: Market monitoring, competitor analysis

4. **Facebook Pages Scraper** (`apify#apify/facebook-pages-scraper`)
   - Extract page data and content
   - Best for: Page monitoring

5. **Facebook Groups Scraper** (`apify#apify/facebook-groups-scraper`)
   - Scrape public group posts
   - Best for: Community monitoring

6. **Facebook Comments Scraper** (`apify#apify/facebook-comments-scraper`)
   - Extract comments from posts and pages
   - Best for: Sentiment analysis, conversation tracking

7. **Facebook Ads Library Scraper** (`apify#curious_coder/facebook-ads-library-scraper`)
   - Scrape public ad campaigns from Ads Library
   - Best for: Competitive research, ad intelligence

**Selection guide**: Choose the scraper that matches exactly what the user wants (reviews, events, marketplace, pages, groups, comments, or ads).

#### Amazon

**3 Capabilities** - Choose based on data source:

1. **Amazon Product Scraper** (`apify#delicious_zebu/amazon-product-scraper`)
   - Scrape product details from URLs
   - Returns: pricing, reviews, ratings, availability, descriptions
   - Best for: Product research, price monitoring

2. **Amazon Reviews Scraper** (`apify#axesso_data/amazon-reviews-scraper`)
   - Scrape customer reviews and ratings
   - ⚠️ Most expensive Amazon scraper at $0.007/call
   - Best for: Review analysis, sentiment research

3. **Amazon Search Scraper** (`apify#axesso_data/amazon-search-scraper`)
   - Scrape search results with product listings
   - ✅ Cheapest overall at $0.0001/call
   - Best for: Market research, competitor analysis

**Selection guide**:
- Have product URL? → Product Scraper
- Need reviews specifically? → Reviews Scraper
- Keyword search? → Search Scraper

#### Google

**Single Capability**: Google Maps Scraper (`apify#damilo/google-maps-scraper`)
- **REQUIRED inputs**: BOTH query (what to search) AND location (where)
- **Returns**: Business name, address, phone, website, rating, reviews
- **Best for**: Local business data, competitor mapping

**Example queries**:
- "Coffee shops in Seattle"
- "Italian restaurants in New York City"
- "Gyms near downtown Los Angeles"

### Unsupported Platforms

Monid does **NOT** support these platforms. If a user asks for any of these, clearly state they are not supported:

❌ **Reddit** - Not supported
❌ **Pinterest** - Not supported
❌ **Snapchat** - Not supported
❌ **WhatsApp** - Not supported
❌ **Telegram** - Not supported
❌ **Discord** - Not supported
❌ **Twitter Spaces** (audio) - Not supported
❌ **Twitch** - Not supported
❌ **Generic web scraping** - Not supported
❌ **Any platform not in the supported list above**

## Complete Workflow Guide

### Step 1: One-Time Setup

If the user is new to Monid, guide them through complete setup:

```bash
# 1. Install CLI
curl -fsSL https://raw.githubusercontent.com/FeiyouG/monid-client/main/install.sh | bash

# 2. Verify installation
monid --version

# 3. Create account (browser - do this at https://app.monid.ai)
#    - Sign up with email or social login
#    - Verify your email if required

# 4. Generate API key (browser - do this at https://app.monid.ai/access/api-keys)
#    - Create new API key in the dashboard
#    - Copy the key immediately (you won't see it again)

# 5. Add API key to CLI
monid keys add --label main <your-api-key>

# 6. Verify everything is ready
monid keys list
```

If already set up, skip to Step 2.

### Step 2: Understanding Task Creation

A **task** defines:
- **name**: Descriptive task name
- **query**: Natural language description of what to collect
- **output-schema**: JSON schema defining expected output structure

### Step 3: Execute a Search

⏱️ **Execution Timing**: Tasks can take anywhere from **1 second to 120 seconds** depending on complexity, data volume, and platform rate limits.

💡 **Recommendation for Agents**: Use **async execution** (without `--wait`) as the default pattern. This provides non-blocking operation and better user experience. See "Understanding Execution Times" section below for detailed orchestration patterns.

#### Method A: Synchronous Execution (Blocking)

Use this for very simple queries when immediate results are needed:

```bash
# Quick execution with natural language query (BLOCKS until complete)
monid search \
  --name "Twitter Sentiment Analysis" \
  --query "Find the most recent tweets related to Elon Musk from the past 7 days" \
  --output-schema '{
    "type": "object",
    "properties": {
      "tweets": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "text": {"type": "string"},
            "author": {"type": "string"},
            "timestamp": {"type": "string"},
            "likes": {"type": "number"},
            "retweets": {"type": "number"}
          }
        }
      }
    }
  }' \
  --wait \
  --output results.json
```

⚠️ **Warning**: This will block for 1-120 seconds. Not recommended for agents.

#### Method B: Asynchronous Execution (Recommended for Agents)

Use this as the default pattern for agent-orchestrated tasks:

```bash
# Quick execution with natural language query
monid search \
  --name "Twitter Sentiment Analysis" \
  --query "Find the most recent tweets related to Elon Musk from the past 7 days" \
  --output-schema '{
    "type": "object",
    "properties": {
      "tweets": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "text": {"type": "string"},
            "author": {"type": "string"},
            "timestamp": {"type": "string"},
            "likes": {"type": "number"},
            "retweets": {"type": "number"}
          }
        }
      }
    }
  }' \
  --wait \
  --output results.json
```

⚠️ **Warning**: This will block for 1-120 seconds. Not recommended for agents.

#### Method B: Asynchronous Execution (Recommended for Agents)

Use this as the default pattern for agent-orchestrated tasks:

```bash
# Start execution (returns immediately with execution-id)
monid search \
  --name "Twitter Sentiment Analysis" \
  --query "Find the most recent tweets related to Elon Musk from the past 7 days" \
  --output-schema '{
    "type": "object",
    "properties": {
      "tweets": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "text": {"type": "string"},
            "author": {"type": "string"},
            "timestamp": {"type": "string"},
            "likes": {"type": "number"},
            "retweets": {"type": "number"}
          }
        }
      }
    }
  }' \
  --yes

# Output shows execution-id immediately:
# ✓ Execution started: exec_abc123xyz
# Check status with: monid executions get --execution-id exec_abc123xyz

# Later, poll for status
monid executions get --execution-id exec_abc123xyz

# When complete, retrieve results
monid executions get --execution-id exec_abc123xyz --output results.json
```

✅ **Benefits**: Non-blocking, user can continue conversation, better UX.

**Flags explained (both methods)**:
- `--name`: Human-readable task name
- `--query`: Natural language query describing the task
- `--output-schema`: JSON schema (inline JSON or file path)
- `--wait`: Poll until completion (optional: `--wait 300` for 5-min timeout)
- `--output`: Save results to file
- `--yes` or `-y`: Skip price confirmation

### Step 4: Alternative - Create Reusable Tasks

For repeated use, create a task first:

```bash
# Create a reusable task
monid tasks create \
  --title "Elon Musk Twitter Monitor" \
  --description "Track Elon Musk mentions on Twitter" \
  --input-schema '{
    "type": "object",
    "properties": {
      "keywords": {"type": "string"},
      "days": {"type": "number"}
    },
    "required": ["keywords"]
  }' \
  --output-schema '{
    "type": "object",
    "properties": {
      "tweets": {"type": "array"}
    }
  }' \
  --capabilities '[{
    "capabilityId": "apify#apidojo/tweet-scraper",
    "prepareInput": {}
  }]'

# List all tasks
monid tasks list

# Get quote for a task
monid quotes create <task-id> --input '{"keywords": "Elon Musk", "days": 7}'

# Execute with quote
monid search --quote-id <quote-id> --wait --output results.json

# Or execute with task ID directly
monid search --task-id <task-id> --wait --output results.json
```

### Step 5: Monitor Execution

For **async execution** (tasks started without `--wait`), use these commands to monitor progress:

```bash
# Check execution status (returns immediately)
monid executions get --execution-id <execution-id>

# Output shows:
# - Status: PENDING, RUNNING, SUCCEEDED, FAILED
# - Progress information (if available)
# - Error messages (if failed)
# - Results (if succeeded)

# Wait for completion and save results (blocking - use with caution)
monid executions get --execution-id <execution-id> --wait --output results.json

# List all executions (useful for finding lost execution-ids)
monid executions list

# List recent executions with filtering
monid executions list --status RUNNING
monid executions list --limit 10
```

**Status meanings**:
- `PENDING`: Queued, waiting to start
- `RUNNING`: Actively executing
- `SUCCEEDED`: Complete, results available for retrieval
- `FAILED`: Execution failed (check error message in output)

**Best practice for agents**: Poll every 30-60 seconds for tasks in progress. Don't block user conversation while waiting. Provide status updates proactively or when asked.

### Understanding Execution Times

⚠️ **Important**: Task execution times can vary significantly from **1 second to 120 seconds** depending on:
- **Task complexity**: Query complexity and data transformation requirements
- **Data volume**: Number of items being collected
- **Platform rate limits**: Some platforms throttle requests, increasing execution time
- **Capability type**: Different scrapers have different performance characteristics
- **Current system load**: Queue times and concurrent executions

**Because execution times are unpredictable**, agents should use async patterns for all tasks except the simplest queries.

### Synchronous vs Asynchronous Execution

**Synchronous (with `--wait` flag)**:
```bash
# Blocks until completion (can take 1s to 120s)
monid search --name "Quick Search" --query "..." --wait --output results.json
```
- ✅ **Use when**: Very simple queries, immediate results required, interactive CLI usage
- ❌ **Avoid when**: Task complexity unknown, agent orchestration, background operations, any risk of >30s execution

**Asynchronous (recommended for agents)**:
```bash
# Step 1: Start execution (non-blocking, returns immediately)
monid search --name "My Search" --query "..." --output-schema '{...}' --yes

# Returns immediately with execution-id:
# ✓ Execution started: exec_abc123xyz
# Status: PENDING
# Check status with: monid executions get --execution-id exec_abc123xyz

# Step 2: Poll for status (when needed)
monid executions get --execution-id exec_abc123xyz

# Step 3: Retrieve results when complete
monid executions get --execution-id exec_abc123xyz --output results.json
```
- ✅ **Use when**: Most tasks (default choice for agents), long-running operations, batch jobs
- ✅ **Benefits**: Non-blocking, can run multiple tasks in parallel, better user experience

### 🤖 Agent Orchestration for Async Execution

When orchestrating Monid tasks as an agent/LLM, follow these patterns for optimal user experience:

#### Pattern 1: Fire-and-Forget with Status Updates

**Best for**: Any task where execution time is uncertain (recommended default)

**Agent communication pattern**:

1. **Before execution**: 
   ```
   "I'm going to start collecting [data description]. This will run in the background 
   and typically takes 10-60 seconds. I'll let you know when it's ready."
   ```

2. **During execution**:
   - Execute: `monid search --name "..." --query "..." --yes` (without --wait)
   - Capture execution-id from output
   - Store execution-id in agent memory/context
   - Immediately respond: "✓ Started execution: exec_abc123xyz. I'll check on this shortly."

3. **Background monitoring** (agent-controlled):
   - Set internal timer/polling interval (e.g., every 30 seconds)
   - Periodically run: `monid executions get --execution-id exec_abc123xyz`
   - Parse status: PENDING, RUNNING, SUCCEEDED, FAILED
   
4. **User communication during wait**:
   - Don't block the conversation
   - Allow user to ask other questions
   - Provide status updates if asked: 
     ```
     "The data collection is still running (status: RUNNING). 
     Started 2 minutes ago, checking again shortly..."
     ```

5. **Upon completion**:
   - Proactively notify: 
     ```
     "✓ Your [data description] is ready! I've collected [summary]. 
     Results saved to results.json"
     ```
   - Offer to analyze/summarize the results

#### Pattern 2: Parallel Execution for Multiple Tasks

**Best for**: Batch operations, multiple independent data sources

**Agent orchestration**:

1. **Identify parallelizable tasks**:
   ```
   User: "Get me tweets about AI and Instagram posts about AI"
   ```
   
2. **Launch multiple async executions**:
   ```bash
   # Task 1
   monid search --name "AI Tweets" --query "tweets about AI" --yes
   # Returns: exec_tweet_123
   
   # Task 2  
   monid search --name "AI Instagram" --query "Instagram posts about AI" --yes
   # Returns: exec_ig_456
   ```

3. **Communicate plan**:
   ```
   "I'm running two data collection tasks in parallel:
   • Twitter search (exec_tweet_123)
   • Instagram search (exec_ig_456)
   
   Both are running in the background. I'll notify you as each completes."
   ```

4. **Monitor all executions**:
   - Track multiple execution-ids
   - Poll each periodically
   - Notify as each completes

5. **Aggregate and deliver**:
   ```
   "Both collections are complete! Here's a summary:
   • Twitter: 150 tweets collected
   • Instagram: 89 posts collected
   Would you like me to analyze or combine these results?"
   ```

#### Pattern 3: Progressive Status Updates

**Best for**: Keeping user engaged during any async operation

**Agent status update pattern**:

```
0:00 - "Starting data collection for [description]..."
0:30 - "Task is running... (status: RUNNING)"
1:30 - "Still collecting data..."
2:30 - "Processing results..."
3:00 - "✓ Complete! Results ready."
```

**Implementation**:
- Use execution polling intervals: 30s, 60s, 90s (exponential backoff)
- Parse task status from `monid executions get` output
- Provide meaningful updates, not just "still running"
- Balance keeping user informed vs. being too chatty

### Agent Decision Tree: When to Use Async

```
For ANY Monid task, should you use async?
├─ Is this an agent/LLM orchestrating the task?
│   └─ YES → Default to ASYNC pattern (recommended)
│       ├─ Start execution without --wait
│       ├─ Store execution-id
│       ├─ Poll in background
│       └─ Notify when complete
│
├─ Is this interactive CLI usage by human?
│   ├─ Very simple query AND user wants immediate result
│   │   └─ OK to use --wait (but async is still fine)
│   └─ Any complexity or uncertainty
│       └─ Use ASYNC to avoid blocking
│
└─ General rule: **When in doubt, use async**
```

### Error Handling for Async Execution

When polling async executions, handle these states:

```bash
# Get execution status
monid executions get --execution-id exec_abc123

# Possible states:
# - PENDING: Queued, not started yet
# - RUNNING: Actively executing
# - SUCCEEDED: Complete, results available
# - FAILED: Execution failed (check error message)
# - CANCELLED: User or system cancelled
```

**Agent error handling**:
- **PENDING**: Continue polling (normal startup delay)
- **RUNNING**: Continue polling, provide status updates
- **SUCCEEDED**: Retrieve results with `--output`, notify user
- **FAILED**: Parse error message, explain to user, suggest fixes or alternatives
- **CANCELLED**: Inform user, ask if they want to retry
- **Timeout** (no status change after 5 min): Notify user, check with `monid executions list`

### Command Reference for Async Patterns

```bash
# Start async execution (recommended for agents)
monid search --name "My Task" --query "..." --output-schema '{...}' --yes
# Captures execution-id from output

# Check status (polling - returns immediately)
monid executions get --execution-id <exec-id>

# Check status + wait for completion (blocks)
monid executions get --execution-id <exec-id> --wait

# Get results when ready
monid executions get --execution-id <exec-id> --output results.json

# List all executions (find lost execution-ids)
monid executions list

# List filtered executions
monid executions list --status RUNNING
monid executions list --limit 10
```

**Key insight for agents**: The async pattern provides better UX because:
1. User is not blocked waiting for unknown duration (1-120s)
2. User can continue conversation during execution
3. Agent can provide helpful status updates
4. Multiple tasks can run in parallel
5. Execution survives if agent/session is interrupted

## Common Use Cases with Examples

### Example 0: First-Time User - Complete Setup to First Search

**User request**: "I want to scrape tweets about AI but I've never used Monid before"

**Step 0: Verify Request**
✅ Platform: X (Twitter) - SUPPORTED
✅ Capability: X Tweet Scraper (`apify#apidojo/tweet-scraper`) - EXISTS
✅ Request: "tweets about AI" - FEASIBLE

**Complete workflow**:
```bash
# Step 1: Install Monid CLI
curl -fsSL https://raw.githubusercontent.com/FeiyouG/monid-client/main/install.sh | bash

# Step 2: Verify installation
monid --version

# Step 3: Create Monid account
# Open your browser and go to: https://app.monid.ai
# Click "Sign Up" and complete registration
# Verify your email if required

# Step 4: Generate API key
# While logged in, go to: https://app.monid.ai/access/api-keys
# Click "Generate New API Key"
# Give it a name (e.g., "Main CLI Key")
# Copy the API key immediately (format: monid_live_...)

# Step 5: Add API key to CLI
monid keys add --label main <paste-your-api-key-here>

# Step 6: Verify key is configured
monid keys list

# Step 7: Execute your first search
monid search \
  --name "AI Tweets" \
  --query "Find the 50 most recent tweets about artificial intelligence from the past week" \
  --output-schema '{
    "type": "object",
    "properties": {
      "tweets": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "text": {"type": "string"},
            "author": {"type": "string"},
            "created_at": {"type": "string"},
            "likes": {"type": "number"},
            "retweets": {"type": "number"}
          }
        }
      }
    }
  }' \
  --wait \
  --output ai_tweets.json
```

**Estimated time**: 5-7 minutes for complete setup and first search.

### Example 1: Find Recent Tweets

**User request**: "Find the most recent tweets related to Elon Musk"

**Verification**:
✅ Platform: X (Twitter) - SUPPORTED
✅ Capability: X Tweet Scraper - EXISTS
✅ Feasible: Yes

**Solution** (assumes Monid is already installed with API key configured):
```bash
monid search \
  --name "Elon Musk Tweets" \
  --query "Find the 50 most recent tweets mentioning 'Elon Musk' from the past 3 days" \
  --output-schema '{
    "type": "object",
    "properties": {
      "tweets": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "text": {"type": "string"},
            "author": {"type": "string"},
            "created_at": {"type": "string"},
            "likes": {"type": "number"},
            "retweets": {"type": "number"},
            "url": {"type": "string"}
          }
        }
      }
    }
  }' \
  --wait \
  --output elon_tweets.json
```

### Example 2: Instagram Hashtag Analysis

**User request**: "Get Instagram posts with hashtag #ai"

**Verification**:
✅ Platform: Instagram - SUPPORTED
✅ Capability: Instagram Hashtag Scraper - EXISTS
✅ Feasible: Yes

**Solution**:
```bash
monid search \
  --name "AI Hashtag Instagram" \
  --query "Scrape the top 100 Instagram posts with hashtag #ai, including engagement metrics" \
  --output-schema '{
    "type": "object",
    "properties": {
      "posts": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "caption": {"type": "string"},
            "author": {"type": "string"},
            "likes": {"type": "number"},
            "comments": {"type": "number"},
            "timestamp": {"type": "string"},
            "image_url": {"type": "string"}
          }
        }
      }
    }
  }' \
  --wait \
  --output ai_instagram.json
```

### Example 3: Unsupported Platform - Reddit

**User request**: "Scrape the top posts from r/programming on Reddit"

**Verification**:
❌ Platform: Reddit - **NOT SUPPORTED**

**Response**:
"Monid doesn't support Reddit scraping. The supported platforms are:
- X (Twitter)
- Instagram
- TikTok
- LinkedIn
- YouTube
- Facebook
- Amazon
- Google Maps

If you need social media data, I can help you scrape from any of these platforms instead. Would Twitter/X posts about programming topics work for your needs?"

## Output Schema Guidelines

A good output schema:
1. **Defines structure clearly**: Use nested objects and arrays appropriately
2. **Matches data type**: Use correct JSON schema types (string, number, boolean, array, object)
3. **Is realistic**: Don't expect data that the scraper can't provide
4. **Uses descriptive property names**: Clear, snake_case or camelCase names

### Schema Templates by Platform

**Social Media Posts** (X, Instagram, TikTok, Facebook):
```json
{
  "type": "object",
  "properties": {
    "posts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "text": {"type": "string"},
          "author": {"type": "string"},
          "timestamp": {"type": "string"},
          "likes": {"type": "number"},
          "comments": {"type": "number"},
          "shares": {"type": "number"},
          "url": {"type": "string"},
          "media_urls": {"type": "array", "items": {"type": "string"}}
        }
      }
    }
  }
}
```

**Profile/Creator Data**:
```json
{
  "type": "object",
  "properties": {
    "profiles": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "username": {"type": "string"},
          "display_name": {"type": "string"},
          "bio": {"type": "string"},
          "followers": {"type": "number"},
          "following": {"type": "number"},
          "posts_count": {"type": "number"},
          "verified": {"type": "boolean"},
          "profile_url": {"type": "string"}
        }
      }
    }
  }
}
```

**E-commerce Products** (Amazon):
```json
{
  "type": "object",
  "properties": {
    "products": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": {"type": "string"},
          "price": {"type": "number"},
          "currency": {"type": "string"},
          "rating": {"type": "number"},
          "review_count": {"type": "number"},
          "availability": {"type": "string"},
          "asin": {"type": "string"},
          "url": {"type": "string"}
        }
      }
    }
  }
}
```

**Local Businesses** (Google Maps):
```json
{
  "type": "object",
  "properties": {
    "businesses": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "address": {"type": "string"},
          "phone": {"type": "string"},
          "website": {"type": "string"},
          "rating": {"type": "number"},
          "review_count": {"type": "number"},
          "categories": {"type": "array", "items": {"type": "string"}},
          "hours": {"type": "string"}
        }
      }
    }
  }
}
```

**Job Listings** (LinkedIn):
```json
{
  "type": "object",
  "properties": {
    "jobs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": {"type": "string"},
          "company": {"type": "string"},
          "location": {"type": "string"},
          "description": {"type": "string"},
          "posted_date": {"type": "string"},
          "employment_type": {"type": "string"},
          "seniority_level": {"type": "string"},
          "job_url": {"type": "string"}
        }
      }
    }
  }
}
```

## Important Constraints and Limitations

### Platform Limitations
- **Rate limiting**: Platforms may have rate limits; Monid handles retries automatically
- **Authentication**: Some data requires platform login (handled by scrapers where possible)
- **Public data only**: Can only access publicly available data
- **Real-time limits**: Data freshness depends on platform and scraper performance

### Query Limitations
- **Be specific**: Vague queries may produce unexpected results
- **Use realistic limits**: Request reasonable amounts (e.g., "top 100" not "all tweets ever")
- **Include timeframes**: Specify date ranges when relevant
- **Provide context**: Include keywords, hashtags, URLs, or usernames as needed

### What Monid CANNOT Do
- ❌ Scrape platforms not in the supported list
- ❌ Access private accounts or authenticated content (unless user provides credentials)
- ❌ Bypass platform rate limits or ToS restrictions
- ❌ Guarantee 100% data completeness (platforms may block or limit scrapers)
- ❌ Real-time streaming (it's batch-based scraping)

### Recommended Request Sizes
- **Social media posts**: 50-500 per request
- **Profiles**: 10-100 per request
- **Products**: 20-200 per request
- **Job listings**: 50-500 per request
- **Local businesses**: 20-200 per request

Larger requests may timeout or fail. When in doubt, start small and scale up.

## Cost Optimization Tips

### Most Expensive Scrapers (>$0.005/call)
- **LinkedIn Profile Search** ($0.10) - 20x cost premium. Only use when specifically needed.
- **TikTok Video Scraper** ($0.01)
- **Facebook Events/Pages** ($0.01)
- **Amazon Reviews** ($0.007)

**Alternatives when possible**:
- For TikTok videos: Try TikTok Scraper ($0.0003) first - 33x cheaper
- For Amazon: Use Product Scraper ($0.001) instead of Reviews if reviews aren't critical

### Most Cost-Effective Scrapers (<$0.001/call)
- **Amazon Search** ($0.0001) - Cheapest overall
- **TikTok Profile/Scraper** ($0.0003)
- **X Tweet Scraper** ($0.0004)
- **YouTube API Dojo** ($0.0005)

## Pricing and Cost Management

- **Quote first**: Always get a quote before execution to show user the cost
- **Costs vary**: Different scrapers have different per-call costs (see table above)
- **Wait for confirmation**: Use `--yes` flag only when user explicitly agrees to cost
- **Monitor spending**: Users can view usage in the dashboard

**Example with cost confirmation**:
```bash
# Get quote first
monid search \
  --name "Test Search" \
  --query "..." \
  --output-schema '...'
# CLI will show price and ask for confirmation
# Press 'y' to proceed or 'n' to cancel
```

## Troubleshooting

### "No active key" or "API key not found"
**Solution**: 
1. Check if you have any keys configured: `monid keys list`
2. If no keys exist:
   - Go to https://app.monid.ai/access/api-keys
   - Generate a new API key
   - Add it to CLI: `monid keys add --label main <your-api-key>`
3. If keys exist but none are active: `monid keys activate <label>`

### "Invalid API key format"
**Cause**: API key doesn't match required format `monid_<stage>_<key>`

**Solution**: 
- Verify you copied the full API key from the dashboard
- Ensure key starts with `monid_`
- Generate a new key if the old one was corrupted

### "API key rejected" or "Unauthorized"
**Possible causes**:
- API key was revoked in the web dashboard
- API key has expired
- Using wrong API key for the environment

**Solution**: 
1. Log in to https://app.monid.ai/access/api-keys
2. Check if key is still active
3. If revoked or expired, generate a new key and add it to CLI
4. Remove old key: `monid keys remove <label>`

### "Task not found" or "Quote expired"
**Solution**: Quotes expire after 1 hour. Create a new quote or execute immediately with `--wait`

### "Execution failed"
**Possible causes**:
- Invalid query (too vague or requesting unavailable data)
- Platform blocked the scraper (temporary, retry later)
- Invalid output schema (doesn't match actual data structure)
- Request exceeds platform limits

**Solution**: Check execution details with `monid executions get --execution-id <id>` for error messages

### "Invalid JSON schema"
**Solution**: Validate JSON syntax, ensure proper structure, use online JSON schema validators

### "Task is taking a very long time"
**Solution**: 
- Check status: `monid executions get --execution-id <id>`
- If status is RUNNING, this is normal - tasks can take 1-120 seconds
- Large scraping jobs may take the full 120 seconds or occasionally longer
- If PENDING for >5 minutes, there may be queue delays (contact support)
- If RUNNING for >3 minutes, be patient - some capabilities are slower
- Task execution time depends on complexity, platform rate limits, and data volume

### "Lost execution-id from async execution"
**Solution**: 
- List all recent executions: `monid executions list`
- Filter by status: `monid executions list --status RUNNING`
- Find your task by name or timestamp in the list
- Copy the execution-id and use: `monid executions get --execution-id <exec-id>`
- Alternatively, check most recent: `monid executions list --limit 1`

### "Agent blocked waiting for long task" (For Developers)
**Problem**: Using `--wait` flag caused agent to block for 1-120 seconds

**Solution**:
- Don't use `--wait` for tasks with uncertain execution time
- Use async pattern as default: start task without `--wait`, store exec-id, poll later
- Implement background polling (every 30-60s) instead of blocking
- Allow user to continue conversation while task runs
- See "Agent Orchestration for Async Execution" section for detailed patterns

## Best Practices

1. **Verify before executing**: Always check platform and capability support BEFORE attempting a search
2. **Start with small tests**: Test with small data requests (e.g., "top 10") before scaling up
3. **Use descriptive names**: Name tasks clearly for future reference
4. **Save results immediately**: Always use `--output` to avoid losing data
5. **Check prices first**: Review quotes before confirming execution, especially for expensive scrapers
6. **Structure queries well**: Be specific about what you want, include filters (date, location, keywords)
7. **Design realistic schemas**: Match schema to actual data structure scrapers provide
8. **Respect rate limits**: Use reasonable request sizes to avoid timeouts
9. **🆕 Default to async execution**: 
   - Agents should use async pattern (no `--wait`) as the default choice
   - Tasks can take 1-120 seconds - unpredictable timing makes async safer
   - Only use `--wait` for very simple queries in interactive CLI usage
   - Store execution-ids immediately and poll in background
10. **🆕 Communicate timing expectations**: 
   - Tell users when tasks are running in background
   - Provide status updates during longer operations (>1 minute)
   - Don't block conversation during async execution
   - Proactively notify when results are ready
11. **🆕 Handle async execution carefully**:
   - Store execution-ids immediately after starting tasks
   - Track multiple execution-ids if running parallel tasks
   - Use `monid executions list` to recover lost execution-ids
   - Poll periodically (30-60s intervals) without blocking user interaction

## Workflow Decision Tree

When a user asks for data collection:

### 0. Determine Execution Mode

- **Does the user want anonymous/x402 search (no account, crypto payment)?**
  - YES → Skip to **x402 Flow** below
  - NO or unsure → Continue with standard flow (Step 1)

**Indicators the user wants x402**:
- Mentions "anonymous", "no account", "crypto", "wallet", "USDC", "x402"
- Explicitly does not want to create a Monid account
- Wants to pay per-request with cryptocurrency

**x402 Flow**:
1. Verify platform/capability support (same as Steps 1-3 below)
2. Check wallet: `monid wallet list`
   - No wallet → Guide through `monid wallet add --label main --private-key <0x...>`
   - Need testnet funds → Link to faucets (USDC: https://faucet.circle.com/, ETH: https://www.alchemy.com/faucets/base-sepolia)
3. Execute: `monid x402 search --name "..." --query "..." --output-schema '{...}' --output results.json`
4. Warn user: "This will block for 1-120 seconds. Payment is automatic from your wallet."
5. Return results when complete

### 1. Verify Platform Support
- **Is the platform in the supported list?**
  - NO → ❌ **STOP**. Inform user Monid doesn't support that platform. List supported platforms.
  - YES → Continue to step 2

### 2. Verify Capability Exists
- **Does a capability exist for this specific request?**
  - Check the Quick Reference Table above
  - NO → ❌ **STOP**. Explain what's possible vs. what was requested.
  - YES → Continue to step 3

### 3. Verify Feasibility
- **Can the capability accomplish the request?**
  - Review capability description
  - Check if data is publicly available
  - Verify scope is reasonable
  - NO → ❌ **STOP**. Suggest alternatives or explain limits.
  - YES → Continue to step 4

### 4. Check Installation
- **Is Monid CLI installed?**
  - Don't know → Ask user to run `monid --version`
  - NO → Guide through: `curl -fsSL https://raw.githubusercontent.com/FeiyouG/monid-client/main/install.sh | bash`
  - YES → Continue to step 5

### 5. Check API Key Configuration
- **Does user have an API key configured?**
  - Don't know → Ask user to run `monid keys list`
  - NO → Guide through:
    1. Create account at https://app.monid.ai (if needed)
    2. Generate API key at https://app.monid.ai/access/api-keys
    3. Copy the API key (format: `monid_<stage>_<key>`)
    4. Add to CLI: `monid keys add --label main <api-key>`
    5. Verify with `monid keys list`
  - YES → Continue to step 6

### 6. Determine Task Type
- **Is this a one-time or repeated task?**
  - One-time → Use `monid search --name --query --output-schema`
  - Repeated → Create task with `monid tasks create`, then reference with `--task-id`

### 7. Execute with Appropriate Mode

**Choose execution mode based on context**:

**For agents (recommended default)**:
- Use async: `monid search --name "..." --query "..." --yes` (no --wait)
- Benefit: Non-blocking, better UX, user can continue conversation
- Store execution-id immediately from output
- Communicate to user: "Started data collection, running in background..."

**For interactive CLI (occasional use)**:
- For very simple queries: `monid search ... --wait --output results.json`
- Benefit: Immediate results, simpler flow
- Warning: Blocks for 1-120 seconds

**Always include**:
- `--output` to save results
- `--yes` if user pre-approved cost or using async pattern

### 8. Monitor and Deliver

**For synchronous execution (with `--wait`)**:
- Results appear automatically when complete
- Display or summarize results to user immediately

**For asynchronous execution (no `--wait`) - RECOMMENDED FOR AGENTS**:
- Store execution-id immediately after command returns
- Poll periodically: `monid executions get --execution-id <exec-id>`
- Provide status updates to user if asked or after 1+ minutes
- Don't block conversation - allow user to ask other questions
- Notify user proactively when complete: "✓ Your data is ready!"
- Retrieve results: `monid executions get --execution-id <exec-id> --output results.json`
- If execution-id is lost, use: `monid executions list` to find it

## Summary

Monid enables agents and LLMs to help users collect data from social media, e-commerce, and search platforms through a simple CLI workflow:

**Standard mode** (API key):
1. **Verify feasibility** (CRITICAL): Check platform and capability support BEFORE attempting
2. **Install CLI** (one-time): `curl -fsSL https://raw.githubusercontent.com/FeiyouG/monid-client/main/install.sh | bash`
3. **Setup API key** (one-time):
   - Register account at https://app.monid.ai
   - Generate API key at https://app.monid.ai/access/api-keys
   - Add to CLI: `monid keys add --label main <api-key>`
4. **Execute searches**: Use natural language queries with structured output schemas
5. **Monitor results**: Track execution status and download data

**x402 anonymous mode** (crypto wallet):
1. **Verify feasibility** (same as standard)
2. **Install CLI** (same as standard)
3. **Setup wallet** (one-time): `monid wallet add --label main --private-key <0x...>`
   - Requires EVM wallet with USDC (payment) + ETH (gas)
   - No Monid account needed
4. **Execute searches**: `monid x402 search --name "..." --query "..." --output-schema '{...}' --output results.json`
   - Synchronous only (blocks 1-120 seconds) — payment is automatic from wallet

### Always Remember

✅ **Verify FIRST**: Platform supported → Capability exists → Request feasible
✅ **Stop if verification fails**: Don't proceed with unsupported requests
✅ **Be explicit**: Tell users clearly what IS and ISN'T possible
✅ **Check installation**: Verify CLI is installed with API key or wallet configured
✅ **Get API keys from web dashboard**: https://app.monid.ai/access/api-keys
✅ **Validate API key format**: Must be `monid_<stage>_<key>`
✅ **Design realistic schemas**: Match expected data structure
✅ **Save results**: Always use `--output` flag
✅ **x402 is synchronous only**: Blocks for 1-120 seconds — warn users before executing
✅ **x402 requires a funded wallet**: USDC for payment + ETH for gas
✅ **For agents using x402**: Communicate timing expectations — the command blocks, there is no async mode

❌ **NEVER suggest unsupported platforms or capabilities**
❌ **NEVER make up capability IDs**
❌ **NEVER proceed if verification fails**
❌ **NEVER use x402 expecting async behavior** — it is synchronous only

**Supported platforms only**: X (Twitter), Instagram, TikTok, LinkedIn, YouTube, Facebook, Amazon, Google Maps - that's it. Nothing else.

**Two execution modes**: Standard (`monid search` with API key) or x402 (`monid x402 search` with crypto wallet, anonymous, synchronous only).
