#!/usr/bin/env bash
# Deploy the Ideate marketing site to LXC VMID 7203 (clone of moneytree-lxc-frontend-base / 9002).
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
Deploy the Ideate marketing website to Proxmox LXC VMID 7203 (hostname ideate-web).

  --accept-defaults    Use deployment.conf and .env (no prompts)
  --recreate           Destroy the existing container and clone from template 9002
  --skip-build         Deploy existing deployment/artifacts/website-dist.tar.gz
  --help, -h           Show this help

nginx serves static pages only (no /v1 proxy). Reachable on the tailnet as
https://ideate-web.tailce422e.ts.net
EOF
}

ACCEPT_DEFAULTS=false
RECREATE=false
SKIP_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --accept-defaults|--accept-default) ACCEPT_DEFAULTS=true ;;
    --recreate) RECREATE=true ;;
    --skip-build) SKIP_BUILD=true ;;
    --help|-h)
      print_help
      exit 0
      ;;
    *)
      log_error "Unknown option: $arg"
      print_help
      exit 1
      ;;
  esac
done

log_info "=========================================="
log_info "Ideate Website Deployment (LXC 7203)"
log_info "=========================================="

ideate_load_config "$SCRIPT_DIR" "$ROOT_DIR"
ARTIFACTS_DIR="${DEPLOYMENT_DIR}/artifacts"
ideate_init_proxmox "$SCRIPT_DIR" || exit 1

[[ -z "${CONTAINER_PASSWORD:-}" ]] && { log_error "CONTAINER_PASSWORD must be set in .env"; exit 1; }

if [[ "$SKIP_BUILD" != true ]]; then
  "${DEPLOYMENT_DIR}/prepare-website-artifact.sh"
fi

TAR_FILE="${ARTIFACTS_DIR}/website-dist.tar.gz"
if [[ ! -f "$TAR_FILE" ]]; then
  log_error "Missing ${TAR_FILE}. Run ./deployment/prepare-website-artifact.sh first."
  exit 1
fi
NATIVE_TAR="/tmp/ideate-website-deploy.tar.gz"
cp -f "$TAR_FILE" "$NATIVE_TAR"
TAR_FILE="$NATIVE_TAR"

CONTAINER_NAME="${WEBSITE_CONTAINER_NAME:-ideate-web}"
CLONE_TEMPLATE="${WEBSITE_CLONE_TEMPLATE:-moneytree-lxc-frontend-base}"
CLONE_VMID="${WEBSITE_CLONE_TEMPLATE_VMID:-9002}"
CORES="${WEBSITE_CORES:-1}"
MEMORY_MB="${WEBSITE_MEMORY_MB:-512}"
FIXED_VMID="${WEBSITE_VMID:-7203}"
DOMAIN="${WEBSITE_HOST:-ideate-web.tailce422e.ts.net}"
WEB_ROOT="${WEBSITE_DIR:-/var/www/ideate-website}"
LXC_ROOTFS_GB="${WEBSITE_ROOTFS_GB:-${LXC_ROOTFS_GB:-8}}"

log_info "Container: $CONTAINER_NAME  VMID: $FIXED_VMID  Host: $DOMAIN"
ideate_ensure_container "$CONTAINER_NAME" "$FIXED_VMID" "$CLONE_TEMPLATE" "$CLONE_VMID" "$CORES" "$MEMORY_MB" || exit 1
VMID="$IDEATE_VMID"
ideate_bootstrap_lxc "$VMID" "$CONTAINER_NAME" || exit 1

log_info "Configuring static-site nginx..."
proxmox_exec_in_container "$VMID" "mkdir -p ${WEB_ROOT} /etc/nginx/snippets /etc/nginx/sites-available /etc/nginx/sites-enabled"

NGINX_SRC="$(mktemp)"
sed -e "s|{{DOMAIN}}|${DOMAIN}|g" \
    -e "s|{{APP_ROOT}}|${WEB_ROOT}|g" \
    "${SCRIPT_DIR}/nginx-website.template" > "$NGINX_SRC"
ideate_push_file "$VMID" "$NGINX_SRC" "/etc/nginx/sites-available/ideate-website"
rm -f "$NGINX_SRC"

EMPTY_SSL="$(mktemp)"
: > "$EMPTY_SSL"
ideate_push_file "$VMID" "$EMPTY_SSL" "/etc/nginx/snippets/ideate-ssl.conf"
rm -f "$EMPTY_SSL"

proxmox_exec_in_container "$VMID" "ln -sfn /etc/nginx/sites-available/ideate-website /etc/nginx/sites-enabled/ideate-website && rm -f /etc/nginx/sites-enabled/default"
proxmox_exec_in_container "$VMID" "command -v ufw >/dev/null 2>&1 && (ufw allow 80/tcp >/dev/null 2>&1; ufw allow 443/tcp >/dev/null 2>&1; ufw allow 22/tcp >/dev/null 2>&1; ufw --force enable >/dev/null 2>&1) || true"
proxmox_exec_in_container "$VMID" "nginx -t && systemctl enable nginx && systemctl restart nginx"

log_info "Publishing site to ${WEB_ROOT}..."
ideate_push_file "$VMID" "$TAR_FILE" "/tmp/website-dist.tar.gz"
proxmox_exec_in_container "$VMID" "
  set -e
  rm -rf ${WEB_ROOT}.new
  mkdir -p ${WEB_ROOT}.new
  tar -xzf /tmp/website-dist.tar.gz -C ${WEB_ROOT}.new
  rm -f /tmp/website-dist.tar.gz
  rm -rf ${WEB_ROOT}.old
  if [ -d ${WEB_ROOT} ]; then mv ${WEB_ROOT} ${WEB_ROOT}.old; fi
  mkdir -p \$(dirname ${WEB_ROOT})
  mv ${WEB_ROOT}.new ${WEB_ROOT}
  rm -rf ${WEB_ROOT}.old
  chown -R www-data:www-data ${WEB_ROOT}
  find ${WEB_ROOT} -type d -exec chmod 755 {} +
  find ${WEB_ROOT} -type f -exec chmod 644 {} +
  nginx -t && systemctl reload nginx
" || exit 1

log_info "Smoke-testing pages inside the container..."
SMOKE_FAILED=false
for path in / /features /personas /about /contact /privacy /terms /security /cookies; do
  code="$(proxmox_exec_in_container "$VMID" \
      "curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1${path}" \
      2>/dev/null | tr -d '[:space:]' || true)"
  if [[ "$code" == "200" ]]; then
    log_success "  ${path} -> 200"
  else
    log_error "  ${path} -> ${code:-no response}"
    SMOKE_FAILED=true
  fi
done
if [[ "$SMOKE_FAILED" == true ]]; then
  log_error "Some pages did not return 200"
  exit 1
fi

APP_VMID="$VMID" HTTPS_DOMAIN="$DOMAIN" \
  "${SCRIPT_DIR}/setup-https-frontend-tailscale.sh" "$VMID" \
  && log_success "HTTPS configured with Tailscale cert" \
  || log_warn "HTTPS setup skipped or failed. HTTP is available on port 80."

ideate_restore_magicdns "$VMID"

ideate_wait_for_health "http://${DOMAIN}/health" || ideate_wait_for_health "https://${DOMAIN}/health" || {
  log_error "Website nginx did not become healthy"
  exit 1
}

log_success "Ideate website deployed: https://${DOMAIN}"
log_info "Tailnet only (no Funnel). Open the URL from a machine on the same tailnet."
