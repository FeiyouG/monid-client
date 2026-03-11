# Quick Start Guide: Tasks, Quotes & Searches

This guide demonstrates the complete workflow for using the new task management and search execution features.

## Prerequisites

1. Authenticate with ScopeOS:
   ```bash
   scopeos-cli auth login
   ```

2. Generate an API key:
   ```bash
   scopeos-cli keys generate my-search-key
   ```

## Simple Search (Recommended for Most Users)

The fastest way to execute a search:

```bash
# Execute search and wait for results
scopeos-cli searches "Find information about Tesla's latest products" --wait

# Save results to a file
scopeos-cli searches "Research SpaceX launches in 2024" --wait --output results.json

# Check results later (returns executionId immediately)
scopeos-cli searches "Company financials for Apple"
# Output: executionId: 01JBXZ...
scopeos-cli searches check 01JBXZ...
```

## Advanced Workflow: Tasks, Quotes & Execution

For reusable search templates:

### Step 1: Create a Task Template

Create schema files:

**input-schema.json**
```json
{
  "type": "object",
  "properties": {
    "company": {
      "type": "string",
      "description": "Company name to research"
    },
    "depth": {
      "type": "string",
      "enum": ["basic", "detailed"],
      "description": "Research depth level"
    }
  },
  "required": ["company"]
}
```

**output-schema.json**
```json
{
  "type": "object",
  "properties": {
    "company_name": { "type": "string" },
    "description": { "type": "string" },
    "products": {
      "type": "array",
      "items": { "type": "string" }
    },
    "financial_data": {
      "type": "object",
      "properties": {
        "revenue": { "type": "string" },
        "employees": { "type": "number" }
      }
    },
    "sources": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "url": { "type": "string" },
          "title": { "type": "string" }
        }
      }
    }
  },
  "required": ["company_name", "description"]
}
```

**capabilities.json**
```json
[
  {
    "capabilityId": "apify.actor.website-scraper",
    "prepareInput": {
      "startUrls": "https://www.google.com/search?q={{input.company}}",
      "maxDepth": 2,
      "maxPages": 10
    }
  }
]
```

Create the task:
```bash
scopeos-cli tasks create \
  --title "Company Research Template" \
  --description "Comprehensive company research from web sources" \
  --input-schema input-schema.json \
  --output-schema output-schema.json \
  --capabilities capabilities.json
```

Output:
```
✓ Task created successfully

┌─────────────────────────────────────────────────────────────┐
│ Task ID:     01JBXX1234567890ABCDEFGHIJ                     │
│ Title:       Company Research Template                       │
│ Description: Comprehensive company research from web sources │
│ Workspace:   workspace_abc123                                │
│ Created:     3/10/2026, 12:30:00 PM                          │
│ Updated:     3/10/2026, 12:30:00 PM                          │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: List Your Tasks

```bash
scopeos-cli tasks list
```

Output:
```
TASK ID          TITLE                       DESCRIPTION                  CREATED
01JBXX123456...  Company Research Template   Comprehensive company res... 3/10/2026
01JBXY789012...  Product Analysis            Analyze product reviews a... 3/9/2026

→ End of results
```

### Step 3: Get a Price Quote

**input.json**
```json
{
  "company": "Tesla",
  "depth": "detailed"
}
```

```bash
scopeos-cli quotes create 01JBXX1234567890ABCDEFGHIJ --input input.json
```

Output:
```
✓ Quote created successfully

┌────────────────────────────────────────────────────────┐
│ Quote ID:        01JBXY9876543210ZYXWVUTSRQP            │
│ Task ID:         01JBXX1234567890ABCDEFGHIJ             │
│ Estimated Price: 150 USD                                │
│ Created:         3/10/2026, 12:35:00 PM                 │
│ Expiry:          expires in 59 minutes                  │
└────────────────────────────────────────────────────────┘

Capability Breakdown:

CAPABILITY ID                    PRICE
apify.actor.website-scraper      150 USD

→ Execute search with: scopeos-cli searches run --quote-id 01JBXY9876543210ZYXWVUTSRQP
```

### Step 4: Execute the Search

#### Option A: Execute and Return Immediately
```bash
scopeos-cli searches run --quote-id 01JBXY9876543210ZYXWVUTSRQP
```

Output:
```
Estimated price: 150 USD
Quote expires: expires in 58 minutes

Proceed with execution? (y/N): y

✓ Execution started: 01JBXZ5555555555NMLKJIHGFE

Status: RUNNING

→ Check status with: scopeos-cli searches check 01JBXZ5555555555NMLKJIHGFE
→ Or wait for completion: scopeos-cli execution get 01JBXZ5555555555NMLKJIHGFE --wait
```

Check status later:
```bash
scopeos-cli searches check 01JBXZ5555555555NMLKJIHGFE
```

#### Option B: Execute and Wait for Completion
```bash
scopeos-cli searches run --quote-id 01JBXY9876543210ZYXWVUTSRQP --wait
```

Output with polling:
```
Estimated price: 150 USD
Quote expires: expires in 58 minutes

Proceed with execution? (y/N): y

✓ Execution started: 01JBXZ5555555555NMLKJIHGFE

→ Waiting for completion...

⠙ Status: RUNNING...
⠹ Status: RUNNING...
⠸ Status: COMPLETED...

┌────────────────────────────────────────────────────────┐
│ Execution ID: 01JBXZ5555555555NMLKJIHGFE               │
│ Task ID:      01JBXX1234567890ABCDEFGHIJ               │
│ Quote ID:     01JBXY9876543210ZYXWVUTSRQP              │
│ Status:       COMPLETED                                │
│ Created:      3/10/2026, 12:36:00 PM                   │
│ Started:      3/10/2026, 12:36:05 PM                   │
│ Completed:    3/10/2026, 12:38:30 PM                   │
│ Actual Price: 150 USD                                  │
└────────────────────────────────────────────────────────┘

✓ Execution completed successfully!

Results:
{
  "company_name": "Tesla, Inc.",
  "description": "American electric vehicle and clean energy company...",
  "products": [
    "Model S",
    "Model 3",
    "Model X",
    "Model Y",
    "Cybertruck"
  ],
  "financial_data": {
    "revenue": "$81.5 billion (2023)",
    "employees": 127855
  },
  "sources": [
    {
      "url": "https://www.tesla.com",
      "title": "Tesla Official Website"
    },
    ...
  ]
}

→ Results expire: expires in 23 hours
```

Save to file:
```bash
scopeos-cli execution get 01JBXZ5555555555NMLKJIHGFE --output tesla-research.json
```

## Task Management Examples

### Update a Task
```bash
# Update title only
scopeos-cli tasks update 01JBXX... --title "Updated Company Research"

# Update output schema
scopeos-cli tasks update 01JBXX... --output-schema new-output.json

# Update multiple fields
scopeos-cli tasks update 01JBXX... \
  --title "Enhanced Research" \
  --description "New description" \
  --input-schema updated-input.json
```

### Get Task Details
```bash
scopeos-cli tasks get 01JBXX1234567890ABCDEFGHIJ
```

Output shows full task with formatted schemas:
```
┌────────────────────────────────────────────────────────┐
│ Task ID:     01JBXX1234567890ABCDEFGHIJ                │
│ Title:       Company Research Template                  │
│ Description: Comprehensive company research...           │
│ Workspace:   workspace_abc123                           │
│ Created:     3/10/2026, 12:30:00 PM                     │
│ Updated:     3/10/2026, 12:30:00 PM                     │
└────────────────────────────────────────────────────────┘

Input Schema:
{
  "type": "object",
  "properties": {
    "company": {
      "type": "string",
      ...
    }
  }
}

Output Schema:
{
  "type": "object",
  "properties": {
    ...
  }
}

Capabilities:
  - apify.actor.website-scraper
    Prepare Input: {
      "startUrls": "https://www.google.com/search?q={{input.company}}",
      "maxDepth": 2,
      "maxPages": 10
    }
```

### Delete a Task
```bash
# With confirmation prompt
scopeos-cli tasks delete 01JBXX...

# Skip confirmation
scopeos-cli tasks delete 01JBXX... -y
```

## Pagination Example

```bash
# Get first page (default 10 items)
scopeos-cli tasks list

# Get more items per page
scopeos-cli tasks list --limit 25

# Get next page using cursor from previous response
scopeos-cli tasks list --cursor eyJsYXN0SWQiOiIwMUpCWFguLi4ifQ==
```

## Error Handling

The CLI provides helpful error messages:

```bash
# Missing authentication
scopeos-cli tasks list
# Output: ✗ Not authenticated. Run 'scopeos-cli auth login' first.

# Invalid task ID
scopeos-cli tasks get invalid-id
# Output: ✗ API Error (404): Resource not found or not accessible in your workspace.

# Expired quote
scopeos-cli searches run --quote-id expired-quote-id
# Output: ✗ API Error (400): Quote has expired. Please create a new quote.

# Missing required fields
scopeos-cli tasks create --title "Test"
# Output: ✗ Please provide a task description
#         Example: scopeos-cli tasks create --title 'Test' --description '...'
```

## Tips & Best Practices

1. **Use files for schemas**: Store schemas in JSON files for reusability
2. **Test with small limits**: Use `--limit 5` when exploring tasks
3. **Save important results**: Always use `--output` for production searches
4. **Monitor costs**: Check quote prices before execution
5. **Reuse tasks**: Create task templates for common searches
6. **Use --wait judiciously**: For long searches, execute without --wait and check later
7. **Handle expiry**: Results expire after 24 hours - save them if needed

## Common Workflows

### Batch Research Workflow
```bash
# 1. Create reusable task once
scopeos-cli tasks create --title "Company Research" ...
# Save task ID: 01JBXX...

# 2. Research multiple companies
for company in "Tesla" "Apple" "Google"; do
  # Create quote
  echo "{\"company\":\"$company\"}" > /tmp/input.json
  QUOTE_ID=$(scopeos-cli quotes create 01JBXX... --input /tmp/input.json | grep "Quote ID" | awk '{print $3}')
  
  # Execute (without waiting)
  scopeos-cli searches run --quote-id $QUOTE_ID -y
done

# 3. Check all executions later
scopeos-cli execution get <execution-id-1> --output results-tesla.json
scopeos-cli execution get <execution-id-2> --output results-apple.json
scopeos-cli execution get <execution-id-3> --output results-google.json
```

### Interactive Research
```bash
# Quick one-off search
scopeos-cli searches "What are the top AI companies in 2024?" --wait --output ai-companies.json

# Review results
cat ai-companies.json | jq '.results[] | .company_name'
```

## Troubleshooting

**Issue**: "No active key" error
**Solution**: Generate a key: `scopeos-cli keys generate my-key`

**Issue**: "Quote expired" error  
**Solution**: Quotes expire after 1 hour. Create a new quote.

**Issue**: Results not available
**Solution**: Results expire after 24 hours. Re-run the search.

**Issue**: Execution stuck in RUNNING
**Solution**: Executions timeout after 5 minutes. Check for errors in the API logs.

## Next Steps

- Explore the [full command reference](README.md)
- Review [API endpoint documentation](IMPLEMENTATION_SUMMARY.md)
- Set up [workspace defaults](docs/configuration.md)
- Integrate with [automation workflows](docs/automation.md)
