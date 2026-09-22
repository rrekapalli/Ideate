#!/usr/bin/env bash
# Enable HTTPS on the Ideate app LXC.
# Prefers Tailscale-provisioned certs; falls back to a local cert so port 443 is never left closed
# (browsers default to https:// and otherwise show ERR_CONNECTION_REFUSED).
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
  PROXMOX_SSH_OPTS="-o StrictHostKeyChecking=accept-new -o ConnectTimeout=60 -o ServerAliveInterval=15 -o ServerAliveCountMax=4"
fi

VMID="${1:-${APP_VMID:-${FRONTEND_VMID:-7202}}}"
DOMAIN="${APP_HOST:-${FRONTEND_HOST:-ideate.tailce422e.ts.net}}"
CERT_TIMEOUT="${TAILSCALE_CERT_TIMEOUT_SECS:-20}"

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
log_info "Trying Tailscale cert (${CERT_TIMEOUT}s), then a local cert if ACME is unavailable."

if ! run_in "
  set -euo pipefail
  mkdir -p /etc/nginx/ssl /etc/nginx/snippets
  tailscale serve reset >/dev/null 2>&1 || true
  if ! tailscale status >/dev/null 2>&1; then
    echo 'Tailscale not running'
    exit 1
  fi
  if timeout ${CERT_TIMEOUT} tailscale cert --cert-file /etc/nginx/ssl/frontend.crt --key-file /etc/nginx/ssl/frontend.key '${DOMAIN}' </dev/null; then
    echo 'Installed Tailscale certificate for ${DOMAIN}'
  elif [[ -s /etc/nginx/ssl/frontend.crt && -s /etc/nginx/ssl/frontend.key ]]; then
    echo 'Keeping existing certificate (tailscale cert timed out or failed)'
  else
    echo 'tailscale cert unavailable; generating local TLS cert so :443 accepts connections'
    openssl req -x509 -nodes -days 825 -newkey rsa:2048 \\
      -keyout /etc/nginx/ssl/frontend.key \\
      -out /etc/nginx/ssl/frontend.crt \\
      -subj '/CN=${DOMAIN}' \\
      -addext 'subjectAltName=DNS:${DOMAIN}'
  fi
  chmod 644 /etc/nginx/ssl/frontend.crt
  chmod 600 /etc/nginx/ssl/frontend.key
  cat > /etc/nginx/snippets/ideate-ssl.conf <<'SSL'
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    ssl_certificate /etc/nginx/ssl/frontend.crt;
    ssl_certificate_key /etc/nginx/ssl/frontend.key;
SSL
  nginx -t && systemctl reload nginx
"; then
  log_error "Could not enable HTTPS on ${DOMAIN}"
  exit 1
fi

log_success "HTTPS enabled: https://${DOMAIN}"
log_warn "If the browser warns about the certificate, Tailscale HTTPS Certificates are not issuing (ACME hang). Enable them under Tailscale admin → DNS, then re-run this script."
