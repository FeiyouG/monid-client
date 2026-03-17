#!/bin/bash
set -euo pipefail

# Monid CLI Nightly Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/FeiyouG/monid-client/main/install-nightly.sh | bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
REPO_OWNER="FeiyouG"
REPO_NAME="monid-client"
BINARY_NAME="monid-nightly"
INSTALL_DIR="$HOME/.local/bin"
RELEASE_TAG="nightly"

# Functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $*"
}

log_error() {
    echo -e "${RED}✗${NC} $*"
}

detect_os_arch() {
    OS=$(uname -s)
    ARCH=$(uname -m)
    
    log_info "Detected: $OS $ARCH"
    
    case "$OS-$ARCH" in
        "Linux-x86_64")
            PLATFORM="linux-x64"
            BINARY_FILE="${BINARY_NAME}-linux-x64"
            ;;
        "Darwin-arm64")
            PLATFORM="macos-arm64"
            BINARY_FILE="${BINARY_NAME}-macos-arm64"
            ;;
        *)
            log_error "Unsupported platform: $OS $ARCH"
            echo ""
            echo "Supported platforms:"
            echo "  - Linux x86_64"
            echo "  - macOS ARM64 (Apple Silicon)"
            echo ""
            echo "For other platforms, please download manually from:"
            echo "  https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/nightly"
            exit 1
            ;;
    esac
}

download_binary() {
    DOWNLOAD_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${RELEASE_TAG}/${BINARY_FILE}"
    TMP_FILE="/tmp/${BINARY_NAME}-$$"
    
    log_info "Downloading nightly build..."
    log_info "From: $DOWNLOAD_URL"
    
    if command -v curl &> /dev/null; then
        if ! curl -fsSL "$DOWNLOAD_URL" -o "$TMP_FILE"; then
            log_error "Failed to download binary"
            echo ""
            echo "Possible reasons:"
            echo "  - No nightly build available yet (push to main to trigger)"
            echo "  - Network connectivity issues"
            echo "  - GitHub releases not accessible"
            exit 1
        fi
    elif command -v wget &> /dev/null; then
        if ! wget -q "$DOWNLOAD_URL" -O "$TMP_FILE"; then
            log_error "Failed to download binary"
            exit 1
        fi
    else
        log_error "Neither curl nor wget found. Please install one of them."
        exit 1
    fi
    
    log_success "Downloaded successfully"
}

install_binary() {
    # Create install directory if it doesn't exist
    if [ ! -d "$INSTALL_DIR" ]; then
        log_info "Creating directory: $INSTALL_DIR"
        mkdir -p "$INSTALL_DIR"
    fi
    
    # Move binary to install location
    INSTALL_PATH="${INSTALL_DIR}/${BINARY_NAME}"
    mv "$TMP_FILE" "$INSTALL_PATH"
    chmod +x "$INSTALL_PATH"
    
    log_success "Installed to: $INSTALL_PATH"
}

ensure_path() {
    # Check if install directory is in PATH
    if echo "$PATH" | grep -q "${INSTALL_DIR}"; then
        log_success "~/.local/bin is already on PATH"
        return 0
    fi
    
    log_warn "~/.local/bin is not on PATH"
    
    # Detect shell
    CURRENT_SHELL=$(basename "$SHELL")
    
    case "$CURRENT_SHELL" in
        bash)
            SHELL_CONFIG="$HOME/.bashrc"
            if [ ! -f "$SHELL_CONFIG" ]; then
                SHELL_CONFIG="$HOME/.bash_profile"
            fi
            echo '' >> "$SHELL_CONFIG"
            echo '# Added by Monid CLI installer' >> "$SHELL_CONFIG"
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_CONFIG"
            log_success "Added to PATH in $SHELL_CONFIG"
            ;;
        zsh)
            SHELL_CONFIG="$HOME/.zshrc"
            echo '' >> "$SHELL_CONFIG"
            echo '# Added by Monid CLI installer' >> "$SHELL_CONFIG"
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_CONFIG"
            log_success "Added to PATH in $SHELL_CONFIG"
            ;;
        fish)
            if command -v fish &> /dev/null; then
                fish -c "set -Ua fish_user_paths $HOME/.local/bin"
                log_success "Added to PATH in fish config"
            else
                log_warn "Fish shell detected but fish command not found"
            fi
            ;;
        *)
            log_warn "Unknown shell: $CURRENT_SHELL"
            log_info "Please manually add to your PATH:"
            echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
            ;;
    esac
}

verify_installation() {
    # Try to run the binary
    if ! "${INSTALL_DIR}/${BINARY_NAME}" --version &> /dev/null; then
        log_error "Installation verification failed"
        log_info "Try running manually: ${INSTALL_DIR}/${BINARY_NAME} --version"
        exit 1
    fi
    
    VERSION_OUTPUT=$("${INSTALL_DIR}/${BINARY_NAME}" --version 2>&1 || true)
    log_success "Successfully installed Monid CLI (nightly)"
    echo ""
    echo "$VERSION_OUTPUT"
}

print_next_steps() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    log_warn "This is a NIGHTLY BUILD from the main branch"
    echo ""
    echo "  • Contains unreleased features and bug fixes"
    echo "  • Uses production API endpoints (safe to test)"
    echo "  • May be less stable than tagged releases"
    echo ""
    log_info "For stable releases, use:"
    echo "  curl -fsSL https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/install.sh | bash"
    echo ""
    
    if ! echo "$PATH" | grep -q "${INSTALL_DIR}"; then
        log_info "To activate in current shell, run:"
        echo ""
        case "$(basename "$SHELL")" in
            bash)
                echo "  source ~/.bashrc"
                ;;
            zsh)
                echo "  source ~/.zshrc"
                ;;
            *)
                echo "  Restart your terminal"
                ;;
        esac
        echo ""
        log_info "Or simply restart your terminal"
        echo ""
    fi
    
    echo "Get started with nightly build:"
    echo "  ${BINARY_NAME} auth login"
    echo "  ${BINARY_NAME} keys generate --label my-key"
    echo "  ${BINARY_NAME} --help"
    echo ""
    
    if command -v monid &> /dev/null; then
        log_info "You also have the stable version installed:"
        echo "  monid                → stable release"
        echo "  monid-nightly        → nightly build"
        echo ""
    fi
    
    echo "Documentation: https://github.com/${REPO_OWNER}/${REPO_NAME}"
    echo ""
}

# Main installation flow
main() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "  ${MAGENTA}🌙 Monid CLI Nightly Installer${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    detect_os_arch
    download_binary
    install_binary
    ensure_path
    verify_installation
    print_next_steps
}

main
