#!/usr/bin/env bash
# Deploy Ideate Angular PWA to LXC VMID 7202 (clone of moneytree-lxc-frontend-base / 9002).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${DEPLOYMENT_DIR}/.." && pwd)"
# shellcheck source=../lib/ensure-linux-bash.sh
source "${DEPLOYMENT_DIR}/lib/ensure-linux-bash.sh"
ensure_linux_bash "$@"

# shellcheck source=scripts/deploy-logging.sh
source "${SCRIPT_DIR}/scripts/deploy-logging.sh"
# shellcheck source=lxc-deploy-clone-only.inc.sh
source "${SCRIPT_DIR}/lxc-deploy-clone-only.inc.sh"
# shellcheck source=deploy-common.sh
source "${SCRIPT_DIR}/deploy-common.sh"

print_help() {
  cat <<EOF
Usage: $0 [OPTIONS]
Deploy the Ideate PWA to Proxmox LXC VMID 7202 (hostname ideate).

  --accept-defaults    Use deployment.conf and .env (no prompts)
  --recreate           Destroy the existing container and clone from template 9002
  --help, -h           Show this help

nginx serves the static app and reverse-proxies /v1 and /actuator to ideate-api.
EOF
}

ideate_parse_flags "$@"
flag_rc=$?
if [[ $flag_rc -eq 2 ]]; then
  print_help
  exit 0
fi
if [[ $flag_rc -ne 0 ]]; then
  print_help
  exit 1
fi

log_info "=========================================="
log_info "Ideate App Deployment (LXC 7202)"
log_info "=========================================="

ideate_load_config "$SCRIPT_DIR" "$ROOT_DIR"
ARTIFACTS_DIR="${DEPLOYMENT_DIR}/artifacts"
ideate_init_proxmox "$SCRIPT_DIR" || exit 1

[[ -z "${CONTAINER_PASSWORD:-}" ]] && { log_error "CONTAINER_PASSWORD must be set in .env"; exit 1; }

CONTAINER_NAME="${APP_CONTAINER_NAME:-ideate}"
CLONE_TEMPLATE="${APP_CLONE_TEMPLATE:-moneytree-lxc-frontend-base}"
CLONE_VMID="${APP_CLONE_TEMPLATE_VMID:-9002}"
CORES="${APP_CORES:-1}"
MEMORY_MB="${APP_MEMORY_MB:-512}"
FIXED_VMID="${APP_VMID:-7202}"
DOMAIN="${APP_HOST:-ideate.tailce422e.ts.net}"
APP_DIR="${APP_DIR:-/opt/ideate-app}"
WWW_DIR="${APP_DIR}/www"
API_BASE="http://${API_HOST:-ideate-api.tailce422e.ts.net}:${API_PORT:-8080}"

ZIP_FILE="${ARTIFACTS_DIR}/ideate-app.zip"
if [[ ! -f "$ZIP_FILE" ]]; then
  log_error "Missing ${ZIP_FILE}. Run ./deployment/prepare-artifacts.sh first."
  exit 1
fi
NATIVE_ZIP="/tmp/ideate-app-deploy.zip"
cp -f "$ZIP_FILE" "$NATIVE_ZIP"
ZIP_FILE="$NATIVE_ZIP"

log_info "Container: $CONTAINER_NAME  VMID: $FIXED_VMID  Host: $DOMAIN"
ideate_ensure_container "$CONTAINER_NAME" "$FIXED_VMID" "$CLONE_TEMPLATE" "$CLONE_VMID" "$CORES" "$MEMORY_MB" || exit 1
VMID="$IDEATE_VMID"
ideate_bootstrap_lxc "$VMID" "$CONTAINER_NAME" || exit 1

log_info "Installing static app under ${WWW_DIR}..."
proxmox_exec_in_container "$VMID" "mkdir -p ${WWW_DIR} /etc/nginx/snippets /etc/nginx/sites-available /etc/nginx/sites-enabled"
ideate_push_file "$VMID" "$ZIP_FILE" "/tmp/ideate-app.zip"
proxmox_exec_in_container "$VMID" "rm -rf ${WWW_DIR} && mkdir -p ${WWW_DIR} && unzip -oq /tmp/ideate-app.zip -d ${WWW_DIR} && rm -f /tmp/ideate-app.zip"

NGINX_SRC="$(mktemp)"
sed -e "s|{{DOMAIN}}|${DOMAIN}|g" \
    -e "s|{{APP_ROOT}}|${WWW_DIR}|g" \
    -e "s|{{API_BASE_URL}}|${API_BASE}|g" \
    "${SCRIPT_DIR}/nginx.template" > "$NGINX_SRC"
ideate_push_file "$VMID" "$NGINX_SRC" "/etc/nginx/sites-available/ideate"
rm -f "$NGINX_SRC"

EMPTY_SSL="$(mktemp)"
: > "$EMPTY_SSL"
ideate_push_file "$VMID" "$EMPTY_SSL" "/etc/nginx/snippets/ideate-ssl.conf"
rm -f "$EMPTY_SSL"

proxmox_exec_in_container "$VMID" "ln -sfn /etc/nginx/sites-available/ideate /etc/nginx/sites-enabled/ideate && rm -f /etc/nginx/sites-enabled/default"
proxmox_exec_in_container "$VMID" "command -v ufw >/dev/null 2>&1 && (ufw allow 80/tcp >/dev/null 2>&1; ufw allow 443/tcp >/dev/null 2>&1; ufw allow 22/tcp >/dev/null 2>&1; ufw --force enable >/dev/null 2>&1) || true"
proxmox_exec_in_container "$VMID" "nginx -t && systemctl enable nginx && systemctl restart nginx"

if "${SCRIPT_DIR}/setup-https-frontend-tailscale.sh" "$VMID"; then
  log_success "HTTPS configured with Tailscale cert"
else
  log_warn "HTTPS setup skipped or failed. HTTP is available on port 80. Re-run setup-https-frontend-tailscale.sh after enabling Tailscale HTTPS Certificates."
fi

ideate_deploy_final_tailscale "$SCRIPT_DIR" --required "$VMID" "$CONTAINER_NAME"
ideate_wait_for_health "http://${DOMAIN}/health" || ideate_wait_for_health "https://${DOMAIN}/health" || {
  log_error "App nginx did not become healthy"
  exit 1
}

log_success "Ideate app deployed: https://${DOMAIN}"
log_info "API is proxied at https://${DOMAIN}/v1/"
