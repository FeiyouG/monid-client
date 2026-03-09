# GitLab CI/CD Setup Guide

This guide walks you through setting up the GitLab CI/CD pipeline for ScopeOS CLI, including all required environment variables and npm configuration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [npm Setup](#npm-setup)
3. [GitLab Configuration](#gitlab-configuration)
4. [Testing the Pipeline](#testing-the-pipeline)
5. [Creating Your First Release](#creating-your-first-release)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ GitLab account with this repository
- ✅ npm account (free at [npmjs.com](https://npmjs.com))
- ✅ Maintainer/Owner access to the GitLab project
- ✅ Access to your OAuth provider configuration

---

## npm Setup

### Step 1: Create npm Account

1. Go to [npmjs.com/signup](https://npmjs.com/signup)
2. Create a free account
3. Verify your email address

### Step 2: Create npm Organization

You need two organizations (or use different package names):
- One for development builds (e.g., `yourorg-dev`)
- One for production builds (e.g., `yourorg`)

**Create organizations:**

1. Go to [npmjs.com/org/create](https://npmjs.com/org/create)
2. Create organization: `yourorg-dev`
   - Choose "Free" option
   - Packages will be public
3. Create organization: `yourorg`
   - Choose "Free" option for public packages
   - Or choose "Teams" ($7/user/month) for private packages

**Alternative**: Use the same organization with different package names:
- Dev: `@yourorg/scopeos-cli-dev`
- Prod: `@yourorg/scopeos-cli`

### Step 3: Generate npm Access Token

1. Log in to [npmjs.com](https://npmjs.com)
2. Click your avatar → **Access Tokens**
3. Click **Generate New Token**
4. Select **Automation** token type
5. Copy the token (starts with `npm_...`)
6. **Save this token** - you'll need it for GitLab

**Important**: Treat this token like a password! Don't commit it to your repository.

---

## GitLab Configuration

### Step 1: Create Environments

1. Go to your GitLab project
2. Navigate to **Settings → Environments**
3. Create two environments:

**Environment 1: `development`**
- Name: `development`
- Description: "Development builds from main branch"
- No deployment tier needed

**Environment 2: `production`**
- Name: `production`
- Description: "Production releases from tags"
- Deployment tier: "production"

### Step 2: Configure CI/CD Variables

Navigate to **Settings → CI/CD → Variables** and expand the section.

#### Global Variables (No environment scope)

Add the following variable:

| Variable Name | Value | Type | Protected | Masked | Expand |
|---------------|-------|------|-----------|--------|--------|
| `NPM_TOKEN` | `npm_xxxxx...` | Variable | ✅ Yes | ✅ Yes | ❌ No |

**How to add**:
1. Click "Add variable"
2. Key: `NPM_TOKEN`
3. Value: Paste your npm token from Step 3 above
4. Type: Variable
5. Check "Protect variable"
6. Check "Mask variable"
7. Uncheck "Expand variable reference"
8. Environment scope: **All (default)**
9. Click "Add variable"

#### Development Environment Variables

For each variable below, set **Environment scope: development**

| Variable Name | Example Value | Protected | Masked |
|---------------|---------------|-----------|--------|
| `OAUTH_DOMAIN` | `dev-app.clerk.accounts.dev` | ❌ No | ❌ No |
| `OAUTH_CLIENT_ID` | `dev_abc123` | ❌ No | ✅ Yes |
| `OAUTH_TYPE` | `clerk` | ❌ No | ❌ No |
| `OAUTH_REDIRECT_URI` | `http://localhost:8918/callback` | ❌ No | ❌ No |
| `OAUTH_SCOPES` | `profile email openid` | ❌ No | ❌ No |
| `API_ENDPOINT` | `https://api.dev.scopeos.xyz` | ❌ No | ❌ No |
| `DASHBOARD_URL` | `https://dev.scopeos.xyz` | ❌ No | ❌ No |
| `NPM_SCOPE` | `@yourorg-dev` | ❌ No | ❌ No |

**How to add each**:
1. Click "Add variable"
2. Key: (variable name from table)
3. Value: (your value)
4. Type: Variable
5. Environment scope: Select **development**
6. Check "Mask variable" if indicated in table
7. Click "Add variable"
8. Repeat for all 8 variables

#### Production Environment Variables

For each variable below, set **Environment scope: production**

| Variable Name | Example Value | Protected | Masked |
|---------------|---------------|-----------|--------|
| `OAUTH_DOMAIN` | `app.clerk.accounts.dev` | ✅ Yes | ❌ No |
| `OAUTH_CLIENT_ID` | `prod_xyz789` | ✅ Yes | ✅ Yes |
| `OAUTH_TYPE` | `clerk` | ✅ Yes | ❌ No |
| `OAUTH_REDIRECT_URI` | `http://localhost:8918/callback` | ✅ Yes | ❌ No |
| `OAUTH_SCOPES` | `profile email openid` | ✅ Yes | ❌ No |
| `API_ENDPOINT` | `https://api.scopeos.xyz` | ✅ Yes | ❌ No |
| `DASHBOARD_URL` | `https://scopeos.xyz` | ✅ Yes | ❌ No |
| `NPM_SCOPE` | `@yourorg` | ✅ Yes | ❌ No |

**How to add each**:
1. Click "Add variable"
2. Key: (variable name from table)
3. Value: (your value)
4. Type: Variable
5. Check "Protect variable"
6. Environment scope: Select **production**
7. Check "Mask variable" if indicated in table
8. Click "Add variable"
9. Repeat for all 8 variables

**Summary**: You should have **17 total variables**:
- 1 global (`NPM_TOKEN`)
- 8 for development environment
- 8 for production environment

### Step 3: Protect Branches and Tags

#### Protect main Branch

1. Go to **Settings → Repository → Protected branches**
2. Click "Protect a branch"
3. Branch: `main`
4. Allowed to merge: **Maintainers**
5. Allowed to push: **No one** (force merge requests)
6. Click "Protect"

#### Protect Version Tags

1. Go to **Settings → Repository → Protected tags**
2. Click "Protect a tag"
3. Tag: `v*` (matches v1.0.0, v2.1.3, etc.)
4. Allowed to create: **Maintainers**
5. Click "Protect"

This ensures only maintainers can create production releases.

---

## Testing the Pipeline

### Test 1: Verify Configuration

1. Go to **CI/CD → Pipelines**
2. Click "Run pipeline"
3. Select branch: `main`
4. Click "Run pipeline"

The pipeline will fail at the "prepare:dev" stage if environment variables are not set correctly. Check the job logs for details.

### Test 2: Push to Main (Dev Build)

Commit and push the GitLab CI files to test:

```bash
git add .gitlab-ci.yml scripts/ .npmrc .npmignore
git add deno.json DISTRIBUTION.md GITLAB_SETUP.md
git commit -m "Add GitLab CI/CD pipeline for multi-platform builds"
git push origin main
```

**Expected behavior**:
1. Pipeline starts automatically
2. `prepare:dev` job generates dev config
3. Five `build:*` jobs run in parallel (5-10 minutes)
4. `package:npm` job creates npm package
5. `publish:dev` job publishes to `@yourorg-dev/scopeos-cli`
6. `release:dev` job creates GitLab release

**Monitor progress**:
- Go to **CI/CD → Pipelines**
- Click on the running pipeline
- Watch each job complete

### Test 3: Verify npm Publication

After the pipeline completes:

```bash
# Check if package was published
npm info @yourorg-dev/scopeos-cli

# Try installing it
npm install -g @yourorg-dev/scopeos-cli@dev

# Test the CLI
scopeos-cli --version
```

---

## Creating Your First Release

Once dev builds are working, create a production release:

### Step 1: Prepare Release

1. Ensure `main` branch is stable
2. All tests passing
3. Documentation up to date

### Step 2: Create Git Tag

```bash
# Create version tag (following semantic versioning)
git tag -a v0.1.0 -m "First release"

# Push tag to GitLab
git push origin v0.1.0
```

**Version numbering**:
- `v0.1.0` - Initial release
- `v1.0.0` - First stable release
- `v1.1.0` - Minor feature addition
- `v1.0.1` - Patch/bugfix

### Step 3: Monitor Release Pipeline

1. Go to **CI/CD → Pipelines**
2. Find the pipeline triggered by tag `v0.1.0`
3. Watch it complete (similar to dev build)
4. `prepare:prod` uses production environment variables
5. `publish:prod` publishes to `@yourorg/scopeos-cli`
6. `release:prod` creates permanent GitLab release

### Step 4: Verify Release

**Check GitLab Release**:
1. Go to **Deployments → Releases**
2. You should see "Release v0.1.0"
3. Release includes:
   - All 5 platform binaries
   - Checksums file
   - Installation instructions

**Check npm**:
```bash
npm info @yourorg/scopeos-cli

# Should show version 0.1.0
```

**Test installation**:
```bash
npm install -g @yourorg/scopeos-cli

scopeos-cli --version
# Should output: scopeos-cli v0.1.0
```

---

## Troubleshooting

### Problem: "NPM_TOKEN not found"

**Error in logs**: 
```
npm ERR! need auth This command requires you to be logged in.
```

**Solution**:
1. Check that `NPM_TOKEN` is set in **Settings → CI/CD → Variables**
2. Ensure it's not scoped to a specific environment
3. Verify the token is valid (generate a new one if needed)
4. Make sure `.npmrc` file exists in repository

### Problem: "Environment variables not found"

**Error in logs**:
```
❌ Error: Missing required environment variables:
  - OAUTH_DOMAIN
  - API_ENDPOINT
```

**Solution**:
1. Check variables are set for the correct environment scope
2. For dev builds: variables should have scope = `development`
3. For prod builds: variables should have scope = `production`
4. Verify the environment is created in **Settings → Environments**

### Problem: "npm ERR! 404 Not Found"

**Error in logs**:
```
npm ERR! 404 Not Found - PUT https://registry.npmjs.org/@yourorg%2fscopeos-cli
```

**Solution**:
1. Create the npm organization if it doesn't exist
2. Verify `NPM_SCOPE` variable is set correctly (e.g., `@yourorg`)
3. Ensure your npm token has publish permissions
4. For private packages, ensure you have npm Teams subscription

### Problem: Build fails with "target not supported"

**Error in logs**:
```
error: Unsupported target: aarch64-apple-darwin
```

**Solution**:
1. Update Deno in `.gitlab-ci.yml` to latest version:
   ```yaml
   image: denoland/deno:latest
   ```
2. Check Deno version supports the target: `deno compile --help`

### Problem: "permission denied" when testing binary

**Error**:
```
bash: ./scopeos-cli: Permission denied
```

**Solution**:
```bash
chmod +x scopeos-cli
./scopeos-cli --version
```

### Problem: macOS binary blocked by Gatekeeper

**Error**: "cannot be opened because the developer cannot be verified"

**Solution for users**:
```bash
xattr -d com.apple.quarantine scopeos-cli
```

**Long-term solution**: Code sign macOS binaries (requires Apple Developer account)

### Problem: Pipeline takes too long

**Issue**: Builds taking 15+ minutes

**Optimization**:
1. Builds run in parallel - this is normal for 5 platforms
2. Deno dependency cache is enabled
3. To speed up further:
   - Use GitLab Runner with more CPU
   - Consider building only needed platforms
   - Use GitLab's paid tier for more CI minutes

### Problem: "This tag already exists"

**Error when pushing tag**:
```
! [rejected] v0.1.0 -> v0.1.0 (already exists)
```

**Solution**:
```bash
# Delete local tag
git tag -d v0.1.0

# Delete remote tag (if you have permission)
git push origin :refs/tags/v0.1.0

# Create new tag with different version
git tag -a v0.1.1 -m "Release 0.1.1"
git push origin v0.1.1
```

---

## Next Steps

### Distribute to Users

**For Paying Customers** (private):
- Share npm package name privately
- Or use GitLab releases with authentication
- Or use private npm packages (requires npm Teams)

**For Open Source Community** (public):
- Announce npm package publicly
- Add to package managers (Homebrew, Chocolatey)
- Create documentation site
- Add to awesome lists

### Set Up GitHub Mirror (Optional)

For open source, mirror to GitHub:

1. Create public GitHub repository
2. Add GitHub remote:
   ```bash
   git remote add github https://github.com/yourorg/scopeos-cli.git
   ```
3. Add mirror job to `.gitlab-ci.yml` (see CI_CD_GUIDE.md)
4. Create Homebrew tap for macOS users

### Add Monitoring

- Set up npm download tracking
- Monitor GitLab CI/CD minutes usage
- Track user feedback and issues
- Set up error reporting in CLI

---

## Summary Checklist

Before going live:

- [ ] npm account created
- [ ] npm organizations created (`@yourorg-dev`, `@yourorg`)
- [ ] npm token generated and added to GitLab
- [ ] GitLab environments created (development, production)
- [ ] 17 CI/CD variables configured (1 global + 8 dev + 8 prod)
- [ ] Main branch protected
- [ ] Version tags protected (`v*`)
- [ ] `.gitlab-ci.yml` committed and pushed
- [ ] Dev build pipeline successful
- [ ] Dev package published to npm
- [ ] First release tag created
- [ ] Production build pipeline successful
- [ ] Production package published to npm
- [ ] Binaries tested on at least one platform
- [ ] DISTRIBUTION.md reviewed and customized
- [ ] README.md updated with correct organization names

---

## Questions?

- **GitLab CI/CD Issues**: Check pipeline logs, variables, and permissions
- **npm Issues**: Verify token, organization, and package access
- **Build Issues**: Check Deno version, targets, and permissions
- **Distribution Issues**: See DISTRIBUTION.md for user-facing guidance

**Need help?** Open an issue or contact the team!

---

**You're ready to ship!** 🚀

After completing this setup, every push to `main` will automatically build and publish dev versions, and every version tag will create a production release with binaries for all platforms.
