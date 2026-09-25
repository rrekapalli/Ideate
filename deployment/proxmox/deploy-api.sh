#!/usr/bin/env bash
# Deploy Ideate API to LXC VMID 7201 (clone of moneytree-lxc-base / 9001).
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
Deploy the Ideate API Spring Boot JAR to Proxmox LXC VMID 7201 (hostname ideate-api).

  --accept-defaults    Use deployment.conf and .env (no prompts)
  --recreate           Destroy the existing container and clone from template 9001
  --help, -h           Show this help

Prerequisites: artifacts from ./deployment/prepare-artifacts.sh, PROXMOX_PASSWORD,
CONTAINER_PASSWORD, TS_AUTHKEY, and DB_* in the repo .env.
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
log_info "Ideate API Deployment (LXC 7201)"
log_info "=========================================="

ideate_load_config "$SCRIPT_DIR" "$ROOT_DIR"
ARTIFACTS_DIR="${DEPLOYMENT_DIR}/artifacts"
ideate_init_proxmox "$SCRIPT_DIR" || exit 1

[[ -z "${CONTAINER_PASSWORD:-}" ]] && { log_error "CONTAINER_PASSWORD must be set in .env"; exit 1; }
[[ -z "${DB_PASSWORD:-}" ]] && { log_error "DB_PASSWORD must be set in .env"; exit 1; }

CONTAINER_NAME="${API_CONTAINER_NAME:-ideate-api}"
CLONE_TEMPLATE="${API_CLONE_TEMPLATE:-moneytree-lxc-base}"
CLONE_VMID="${API_CLONE_TEMPLATE_VMID:-9001}"
CORES="${API_CORES:-2}"
MEMORY_MB="${API_MEMORY_MB:-2048}"
FIXED_VMID="${API_VMID:-7201}"
DOMAIN="${API_HOST:-ideate-api.tailce422e.ts.net}"
APP_DIR="${API_DIR:-/opt/ideate-api}"
APP_PORT="${API_PORT:-8080}"

JAR_FILE="${ARTIFACTS_DIR}/ideate-api.jar"
MIGRATIONS_DIR="${ARTIFACTS_DIR}/database-migrations"
if [[ ! -f "$JAR_FILE" ]]; then
  log_error "Missing ${JAR_FILE}. Run ./deployment/prepare-artifacts.sh first."
  exit 1
fi
if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  log_error "Missing ${MIGRATIONS_DIR}. Run ./deployment/prepare-artifacts.sh first."
  exit 1
fi

NATIVE_JAR="/tmp/ideate-api-deploy.jar"
cp -f "$JAR_FILE" "$NATIVE_JAR"
JAR_FILE="$NATIVE_JAR"

log_info "Container: $CONTAINER_NAME  VMID: $FIXED_VMID  Host: $DOMAIN"
ideate_ensure_container "$CONTAINER_NAME" "$FIXED_VMID" "$CLONE_TEMPLATE" "$CLONE_VMID" "$CORES" "$MEMORY_MB" || exit 1
VMID="$IDEATE_VMID"
ideate_bootstrap_lxc "$VMID" "$CONTAINER_NAME" || exit 1

log_info "Installing API under ${APP_DIR}..."
proxmox_exec_in_container "$VMID" "mkdir -p ${APP_DIR}/database-migrations"

ideate_push_file "$VMID" "$JAR_FILE" "${APP_DIR}/ideate-api.jar"

MIGRATIONS_TAR="/tmp/ideate-migrations-$$.tgz"
tar -C "$MIGRATIONS_DIR" -czf "$MIGRATIONS_TAR" .
ideate_push_file "$VMID" "$MIGRATIONS_TAR" "/tmp/ideate-migrations.tgz"
rm -f "$MIGRATIONS_TAR"
proxmox_exec_in_container "$VMID" "rm -rf ${APP_DIR}/database-migrations && mkdir -p ${APP_DIR}/database-migrations && tar -C ${APP_DIR}/database-migrations -xzf /tmp/ideate-migrations.tgz && rm -f /tmp/ideate-migrations.tgz"

CORS_ORIGINS="${IDEATE_CORS_ORIGINS:-http://localhost:4200,http://127.0.0.1:4200,https://ideate.tailce422e.ts.net}"
ENV_TEMP="$(mktemp)"
cat > "$ENV_TEMP" <<EOF
DB_HOST=${DB_HOST:-pg18.tailce422e.ts.net}
DB_PORT=${DB_PORT:-6432}
DB_NAME=${DB_NAME:-ideate}
DB_USERNAME=${DB_USERNAME:-postgres}
DB_PASSWORD=${DB_PASSWORD}
IDEATE_AUTH_ENABLED=${IDEATE_AUTH_ENABLED:-false}
IDEATE_DEV_ACCOUNT_ID=${IDEATE_DEV_ACCOUNT_ID:-acct_local_dev}
IDEATE_DEV_EMAIL=${IDEATE_DEV_EMAIL:-dev@localhost}
IDEATE_DEV_NAME=${IDEATE_DEV_NAME:-Local Thinker}
IDEATE_DEV_CREDITS=${IDEATE_DEV_CREDITS:-10000}
IDEATE_MIGRATIONS_PATH=${APP_DIR}/database-migrations
IDEATE_CORS_ORIGINS=${CORS_ORIGINS}
OLLAMA_BASE_URL=${OLLAMA_BASE_URL:-}
OLLAMA_MODEL=${OLLAMA_MODEL:-llama3.2}
OPENAI_BASE_URL=${OPENAI_BASE_URL:-https://api.openai.com}
OPENAI_API_KEY=${OPENAI_API_KEY:-}
OPENAI_MODEL=${OPENAI_MODEL:-gpt-4o-mini}
SERVER_PORT=${APP_PORT}
EOF
ideate_push_file "$VMID" "$ENV_TEMP" "${APP_DIR}/.env"
rm -f "$ENV_TEMP"

UNIT_SRC="${SCRIPT_DIR}/systemd/ideate-api.service"
UNIT_TEMP="$(mktemp)"
sed -e "s|User=raja|User=${CONTAINER_USER:-raja}|" \
    -e "s|Group=raja|Group=${CONTAINER_USER:-raja}|" \
    -e "s|/opt/ideate-api|${APP_DIR}|g" \
    "$UNIT_SRC" > "$UNIT_TEMP"
ideate_push_file "$VMID" "$UNIT_TEMP" "/etc/systemd/system/ideate-api.service"
rm -f "$UNIT_TEMP"

START_TEMP="$(mktemp)"
cat > "$START_TEMP" <<EOF
#!/bin/bash
set -euo pipefail
cd ${APP_DIR}
exec java -jar ${APP_DIR}/ideate-api.jar
EOF
ideate_push_file "$VMID" "$START_TEMP" "${APP_DIR}/start.sh"
rm -f "$START_TEMP"

proxmox_exec_in_container "$VMID" "chown -R ${CONTAINER_USER:-raja}:${CONTAINER_USER:-raja} ${APP_DIR} && chmod 600 ${APP_DIR}/.env && chmod 755 ${APP_DIR}/start.sh && chmod 644 ${APP_DIR}/ideate-api.jar"
proxmox_exec_in_container "$VMID" "command -v ufw >/dev/null 2>&1 && (ufw allow ${APP_PORT}/tcp >/dev/null 2>&1; ufw allow 22/tcp >/dev/null 2>&1; ufw --force enable >/dev/null 2>&1) || true"

ideate_deploy_final_tailscale "$SCRIPT_DIR" --required "$VMID" "$CONTAINER_NAME"
ideate_restore_magicdns "$VMID"
proxmox_exec_in_container "$VMID" "systemctl daemon-reload && systemctl enable ideate-api && systemctl restart ideate-api"
ideate_wait_for_health "http://${DOMAIN}:${APP_PORT}/actuator/health" || {
  log_error "API did not become healthy. Check: pct exec ${VMID} -- journalctl -u ideate-api -n 80 --no-pager"
  exit 1
}

log_success "Ideate API deployed: http://${DOMAIN}:${APP_PORT}"
log_info "Health: http://${DOMAIN}:${APP_PORT}/actuator/health"
