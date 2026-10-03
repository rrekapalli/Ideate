#!/usr/bin/env bash
# Build the Ideate marketing site and tar output/ to deployment/artifacts/website-dist.tar.gz.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/ensure-linux-bash.sh
source "${SCRIPT_DIR}/lib/ensure-linux-bash.sh"
ensure_linux_bash "$@"

ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SITE_DIR="${ROOT_DIR}/ideate-website"
ARTIFACTS_DIR="${SCRIPT_DIR}/artifacts"

log_info() { echo "[INFO] $*"; }
log_error() { echo "[ERROR] $*" >&2; }
log_success() { echo "[OK] $*"; }

ideate_setup_node() {
  local shim="/tmp/ideate-website-build-bin"
  mkdir -p "$shim"
  local win_node="/mnt/c/nvm4w/nodejs"
  if [[ -x "${win_node}/node.exe" ]]; then
    cat > "${shim}/node" <<EOF
#!/bin/bash
exec "${win_node}/node.exe" "\$@"
EOF
    cat > "${shim}/npm" <<EOF
#!/bin/bash
exec "${win_node}/node.exe" "${win_node}/node_modules/npm/bin/npm-cli.js" "\$@"
EOF
    chmod +x "${shim}/node" "${shim}/npm"
    export PATH="${shim}:${PATH}"
    log_info "Using Windows Node at ${win_node}"
  fi
}

ideate_to_win_path() {
  wslpath -w "$1"
}

ideate_website_build() {
  if [[ -x /mnt/c/nvm4w/nodejs/node.exe ]]; then
    local win_site win_node bat
    win_site="$(ideate_to_win_path "$SITE_DIR")"
    win_node='C:\nvm4w\nodejs'
    bat="/mnt/c/Users/rajar/AppData/Local/Temp/ideate-website-build.cmd"
    log_info "Building marketing site with Windows Node"
    cat > "$bat" <<EOF
@echo off
set "Path=${win_node};%Path%"
cd /d "${win_site}"
if errorlevel 1 exit /b 1
if not exist node_modules\\.bin\\vite.cmd npm.cmd ci
if errorlevel 1 exit /b 1
call npm.cmd run build
exit /b %ERRORLEVEL%
EOF
    unix2dos "$bat" 2>/dev/null || sed -i 's/\r$//;s/$/\r/' "$bat"
    /mnt/c/Windows/System32/cmd.exe /c "$(ideate_to_win_path "$bat")"
    local rc=$?
    rm -f "$bat"
    return "$rc"
  fi
  (
    cd "$SITE_DIR"
    if [[ ! -x node_modules/.bin/vite ]]; then
      if [[ -f package-lock.json ]]; then
        npm ci
      else
        npm install
      fi
    fi
    npm run build
  )
}

mkdir -p "$ARTIFACTS_DIR"
ideate_setup_node

log_info "Building ideate-website..."
BUILD_START="$(date +%s)"
ideate_website_build

OUT_DIR="${SITE_DIR}/output"
if [[ ! -f "${OUT_DIR}/index.html" ]]; then
  log_error "Website output not found at ${OUT_DIR}/index.html"
  exit 1
fi
OUT_MTIME="$(stat -c%Y "${OUT_DIR}/index.html" 2>/dev/null || stat -f%Y "${OUT_DIR}/index.html")"
if (( OUT_MTIME + 2 < BUILD_START )); then
  log_error "Website output is stale (index.html older than this build)"
  exit 1
fi

TAR_PATH="${ARTIFACTS_DIR}/website-dist.tar.gz"
rm -f "$TAR_PATH"
(
  cd "$OUT_DIR"
  tar -czf "$TAR_PATH" .
)
log_success "Wrote ${TAR_PATH} ($(stat -c%s "$TAR_PATH" 2>/dev/null || stat -f%z "$TAR_PATH") bytes)"
