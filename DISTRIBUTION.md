# ScopeOS CLI Distribution Guide

This guide explains how to install and use the ScopeOS CLI.

## Table of Contents

- [Installation](#installation)
  - [via npm (Recommended)](#via-npm-recommended)
  - [Direct Binary Download](#direct-binary-download)
  - [Platform-Specific Instructions](#platform-specific-instructions)
- [Verifying Installation](#verifying-installation)
- [Getting Started](#getting-started)
- [Updating](#updating)
- [Uninstalling](#uninstalling)
- [Troubleshooting](#troubleshooting)

---

## Installation

### via npm (Recommended)

The easiest way to install ScopeOS CLI is through npm:

```bash
npm install -g @yourorg/scopeos-cli
```

For development builds:
```bash
npm install -g @yourorg-dev/scopeos-cli@dev
```

**Requirements**:
- Node.js 16.0.0 or higher
- npm (comes with Node.js)

**Advantages**:
- ✅ Automatic platform detection
- ✅ Easy updates
- ✅ Works on all platforms
- ✅ No manual binary management

### Direct Binary Download

If you prefer not to use npm, you can download pre-compiled binaries directly.

#### Step 1: Download the Binary

**Linux x86_64:**
```bash
curl -LO https://gitlab.com/yourorg/scopeos-cli/-/releases/latest/downloads/scopeos-cli-linux-x64
chmod +x scopeos-cli-linux-x64
sudo mv scopeos-cli-linux-x64 /usr/local/bin/scopeos-cli
```

**Linux ARM64:**
```bash
curl -LO https://gitlab.com/yourorg/scopeos-cli/-/releases/latest/downloads/scopeos-cli-linux-arm64
chmod +x scopeos-cli-linux-arm64
sudo mv scopeos-cli-linux-arm64 /usr/local/bin/scopeos-cli
```

**macOS x86_64 (Intel):**
```bash
curl -LO https://gitlab.com/yourorg/scopeos-cli/-/releases/latest/downloads/scopeos-cli-macos-x64
chmod +x scopeos-cli-macos-x64
sudo mv scopeos-cli-macos-x64 /usr/local/bin/scopeos-cli
```

**macOS ARM64 (M1/M2/M3 - Apple Silicon):**
```bash
curl -LO https://gitlab.com/yourorg/scopeos-cli/-/releases/latest/downloads/scopeos-cli-macos-arm64
chmod +x scopeos-cli-macos-arm64
sudo mv scopeos-cli-macos-arm64 /usr/local/bin/scopeos-cli
```

**Windows x86_64:**
1. Download from: https://gitlab.com/yourorg/scopeos-cli/-/releases/latest
2. Save as `scopeos-cli.exe`
3. Add to your PATH or move to a directory in PATH

#### Step 2: Verify the Download (Optional but Recommended)

Each release includes SHA256 checksums. Download `checksums.txt` and verify:

**Linux/macOS:**
```bash
# Download checksums file
curl -LO https://gitlab.com/yourorg/scopeos-cli/-/releases/latest/downloads/checksums.txt

# Verify (compare output with checksums.txt)
sha256sum scopeos-cli-*
# or on macOS:
shasum -a 256 scopeos-cli-*
```

**Windows (PowerShell):**
```powershell
Get-FileHash scopeos-cli.exe -Algorithm SHA256
```

### Platform-Specific Instructions

#### Linux

**Debian/Ubuntu:**
```bash
# Install via npm
sudo apt update
sudo apt install nodejs npm
npm install -g @yourorg/scopeos-cli

# Or download binary (see above)
```

**Fedora/RHEL/CentOS:**
```bash
# Install via npm
sudo dnf install nodejs npm
npm install -g @yourorg/scopeos-cli
```

**Arch Linux:**
```bash
# Install via npm
sudo pacman -S nodejs npm
npm install -g @yourorg/scopeos-cli
```

#### macOS

**via npm:**
```bash
# If you don't have Node.js:
brew install node

# Then install CLI
npm install -g @yourorg/scopeos-cli
```

**Direct download:**
```bash
# Intel Mac
curl -LO https://gitlab.com/yourorg/scopeos-cli/-/releases/latest/downloads/scopeos-cli-macos-x64
chmod +x scopeos-cli-macos-x64
sudo mv scopeos-cli-macos-x64 /usr/local/bin/scopeos-cli

# Apple Silicon (M1/M2/M3)
curl -LO https://gitlab.com/yourorg/scopeos-cli/-/releases/latest/downloads/scopeos-cli-macos-arm64
chmod +x scopeos-cli-macos-arm64

# Remove quarantine attribute (macOS security)
xattr -d com.apple.quarantine scopeos-cli-macos-arm64

sudo mv scopeos-cli-macos-arm64 /usr/local/bin/scopeos-cli
```

#### Windows

**via npm:**
```powershell
# If you don't have Node.js, download from nodejs.org

# Then install CLI
npm install -g @yourorg/scopeos-cli
```

**Direct download:**
1. Download `scopeos-cli-windows-x64.exe` from releases
2. Rename to `scopeos-cli.exe`
3. Move to a directory in your PATH, or add its location to PATH:
   ```powershell
   # Add to PATH for current user
   $env:Path += ";C:\path\to\cli"
   [Environment]::SetEnvironmentVariable("Path", $env:Path, [EnvironmentVariableTarget]::User)
   ```

---

## Verifying Installation

After installation, verify the CLI is working:

```bash
# Check version
scopeos-cli --version

# Should output something like:
# scopeos-cli v1.0.0

# View help
scopeos-cli --help
```

---

## Getting Started

### 1. Authenticate

```bash
scopeos-cli auth login
```

This will:
- Open your browser for OAuth authentication
- Store credentials securely on your machine
- Display your authenticated user and workspace

### 2. Check Your Status

```bash
scopeos-cli auth whoami
```

### 3. Generate a Signing Key

```bash
scopeos-cli keys generate my-key
```

This creates an Ed25519 key pair for signing API requests.

### 4. List Your Keys

```bash
scopeos-cli keys list
```

### 5. Activate a Key

```bash
scopeos-cli keys activate my-key
```

Now all your API requests will be signed with this key.

---

## Updating

### via npm

```bash
# Check for updates
npm outdated -g @yourorg/scopeos-cli

# Update to latest version
npm update -g @yourorg/scopeos-cli
```

### Direct Binary

Download the latest binary from releases and replace your existing binary.

---

## Uninstalling

### via npm

```bash
npm uninstall -g @yourorg/scopeos-cli
```

### Direct Binary

```bash
# Linux/macOS
sudo rm /usr/local/bin/scopeos-cli

# Windows
# Delete the .exe file from your PATH
```

### Remove Configuration (Optional)

The CLI stores configuration and keys in `~/.scopeos`:

```bash
# Linux/macOS
rm -rf ~/.scopeos

# Windows (PowerShell)
Remove-Item -Recurse -Force "$env:USERPROFILE\.scopeos"
```

**Warning**: This will delete all your keys and credentials. Make sure to revoke keys on the server first if needed.

---

## Troubleshooting

### "command not found: scopeos-cli"

**Cause**: The CLI is not in your PATH.

**Solution**:

For npm installations:
```bash
# Check npm global bin directory
npm config get prefix

# Add to PATH if needed (add to ~/.bashrc or ~/.zshrc)
export PATH="$(npm config get prefix)/bin:$PATH"
```

For binary installations:
```bash
# Linux/macOS: Ensure /usr/local/bin is in PATH
echo $PATH | grep /usr/local/bin

# Windows: Check PATH in Environment Variables
```

### macOS: "cannot be opened because the developer cannot be verified"

**Cause**: macOS Gatekeeper blocking unsigned binary.

**Solution**:
```bash
# Remove quarantine attribute
xattr -d com.apple.quarantine /usr/local/bin/scopeos-cli

# Or allow in System Preferences → Security & Privacy
```

### npm: "EACCES: permission denied"

**Cause**: npm doesn't have permission to install globally.

**Solution**:

**Option 1** (Recommended): Use a Node version manager:
```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js
nvm install 20
nvm use 20

# Now install CLI
npm install -g @yourorg/scopeos-cli
```

**Option 2**: Change npm global directory:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

npm install -g @yourorg/scopeos-cli
```

**Option 3** (Not recommended): Use sudo:
```bash
sudo npm install -g @yourorg/scopeos-cli
```

### "Error: Failed to authenticate"

**Cause**: OAuth configuration issue or network problem.

**Solution**:
1. Check your internet connection
2. Try logging out and back in:
   ```bash
   scopeos-cli auth logout
   scopeos-cli auth login
   ```
3. If issue persists, contact support

### Windows: Binary blocked by SmartScreen

**Cause**: Windows SmartScreen blocking unsigned executable.

**Solution**:
1. Right-click the downloaded file
2. Select "Properties"
3. Check "Unblock" at the bottom
4. Click "Apply" and "OK"
5. Run the binary again

### Binary verification fails

**Cause**: Downloaded binary doesn't match checksum (corrupted or tampered).

**Solution**:
1. Delete the downloaded binary
2. Download again from official releases
3. Verify checksum matches the official checksums.txt
4. If still failing, report the issue

### "npm ERR! 404 Not Found"

**Cause**: Package not published or incorrect package name.

**Solution**:
1. Check package name is correct: `@yourorg/scopeos-cli`
2. For dev builds, use: `@yourorg-dev/scopeos-cli@dev`
3. Contact support if package should exist

---

## Platform Support

| Platform | Architecture | Supported | Binary Name |
|----------|-------------|-----------|-------------|
| Linux | x86_64 | ✅ Yes | scopeos-cli-linux-x64 |
| Linux | ARM64 | ✅ Yes | scopeos-cli-linux-arm64 |
| macOS | x86_64 (Intel) | ✅ Yes | scopeos-cli-macos-x64 |
| macOS | ARM64 (Apple Silicon) | ✅ Yes | scopeos-cli-macos-arm64 |
| Windows | x86_64 | ✅ Yes | scopeos-cli-windows-x64.exe |
| Windows | ARM64 | ❌ Not yet | - |
| Linux | x86 (32-bit) | ❌ Not supported | - |

---

## Getting Help

### Documentation

- **Full Documentation**: https://scopeos.xyz/docs
- **API Reference**: https://scopeos.xyz/docs/api
- **Quickstart Guide**: See QUICKSTART.md in the repository

### Support

- **Issues**: https://gitlab.com/yourorg/scopeos-cli/-/issues
- **Email**: support@scopeos.xyz
- **Community**: Join our Discord (link on website)

### Contributing

Interested in contributing? See CONTRIBUTING.md (when available).

---

## License

ScopeOS CLI is released under the MIT License. See LICENSE file for details.

---

**Enjoy using ScopeOS CLI!** 🚀
