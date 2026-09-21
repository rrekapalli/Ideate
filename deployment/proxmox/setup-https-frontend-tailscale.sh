#!/usr/bin/env bash
# Enable HTTPS on the Ideate app LXC using Tailscale-provisioned certificates.
# Prerequisites: Tailscale admin → DNS → enable "HTTPS Certificates".
#
# Usage:
#   ./setup-https-frontend-tailscale.sh [VMID]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${DEPLOYMENT_DIR}/.." && pwd)"
# shellcheck source=../lib/ensure-linux-bash.sh
source "${DEPLOYMENT_DIR}/lib/ensure-linux-bash.sh"
ensure_linux_bash "$@"

# shellcheck source=scripts/deploy-logging.sh
source "${SCRIPT_DIR}/scripts/deploy-logging.sh"
# shellcheck source=deploy-common.sh
source "${SCRIPT_DIR}/deploy-common.sh"

ideate_load_config "$SCRIPT_DIR" "$ROOT_DIR"
ACCEPT_DEFAULTS="${ACCEPT_DEFAULTS:-true}"
USE_REMOTE_PROXMOX=false
if ! command -v pct >/dev/null 2>&1; then
  USE_REMOTE_PROXMOX=true
  PROXMOX_SSH_OPTS="-o StrictHostKeyChecking=accept-new -o ConnectTimeout=60 -o ServerAliveInterval=30 -o ServerAliveCountMax=6"
fi

VMID="${1:-${APP_VMID:-${FRONTEND_VMID:-7202}}}"
DOMAIN="${APP_HOST:-${FRONTEND_HOST:-ideate.tailce422e.ts.net}}"

run_in() {
  local cmd="$1"
  if command -v pct >/dev/null 2>&1; then
    pct exec "$VMID" -- bash -lc "$cmd"
  else
    local q
    q=$(printf '%q' "$cmd")
    _pct_remote "pct exec $VMID -- bash -lc $q"
  fi
}

log_info "Enabling HTTPS on $DOMAIN (VMID $VMID)"
run_in "
  set -e
  mkdir -p /etc/nginx/ssl /etc/nginx/snippets
  if ! tailscale status >/dev/null 2>&1; then
    echo 'Tailscale not running'
    exit 1
  fi
  tailscale cert --cert-file /etc/nginx/ssl/frontend.crt --key-file /etc/nginx/ssl/frontend.key '$DOMAIN'
  chmod 644 /etc/nginx/ssl/frontend.crt
  chmod 600 /etc/nginx/ssl/frontend.key
  cat > /etc/nginx/snippets/ideate-ssl.conf <<'SSL'
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    ssl_certificate /etc/nginx/ssl/frontend.crt;
    ssl_certificate_key /etc/nginx/ssl/frontend.key;
SSL
  nginx -t && systemctl reload nginx
"
log_success "HTTPS enabled: https://${DOMAIN}"
log_warn "Tailscale certs expire in ~90 days. Re-run this script to renew."
