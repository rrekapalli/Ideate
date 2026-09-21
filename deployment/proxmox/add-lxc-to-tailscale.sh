#!/bin/bash
# Configure an LXC container to auto-join Tailscale on boot (Method 2: bake into template pattern).
# Installs Tailscale if missing, creates /etc/default/tailscale (from .env TS_AUTHKEY),
# /usr/local/bin/tailscale-autojoin.sh, and tailscale-autojoin.service so the container
# joins the tailnet on every boot. After join, verifies a 100.x address and retries
# systemctl restart tailscale-autojoin until connected (no manual SSH). Override attempts
# with TAILSCALE_JOIN_VERIFY_ATTEMPTS (default 8) and TAILSCALE_JOIN_RETRY_DELAY_SEC (default 5).
#
# Usage:
#   ./add-lxc-to-tailscale.sh <VMID> [expected_hostname]
#   ./add-lxc-to-tailscale.sh 8001
#   ./add-lxc-to-tailscale.sh 8007 moneytree
# If expected_hostname is provided and the container is already on the tailnet with that exact name, skips re-joining (avoids duplicate hostnames).
# From deploy scripts: "${SCRIPT_DIR}/add-lxc-to-tailscale.sh" "$VMID" "$CONTAINER_NAME"
#
# Requires: TS_AUTHKEY in project root .env (pre-auth key tskey-auth-..., https://login.tailscale.com/admin/settings/keys).
# If you only set TS_API_KEY, it is used as TS_AUTHKEY (alias for common typo).
# Optional: TAILNET_DNS (e.g. tailce422e.ts.net) in .env to show MagicDNS hostname format in success message.
# Optional: TAILSCALE_API_KEY (Admin API token) + TAILNET_DNS (e.g. tailce422e.ts.net) in .env so we
#   delete any existing device with this hostname (or the same name plus a numeric tailscale duplicate label)
#   from the tailnet before joining, so MagicDNS uses only the canonical name (e.g. moneytree-admin.<tailnet>).
#   See https://login.tailscale.com/admin/settings/keys
# Run on Proxmox host or with PROXMOX_HOST, PROXMOX_USER, PROXMOX_PASSWORD set.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/deploy-logging.sh
source "${SCRIPT_DIR}/scripts/deploy-logging.sh"
# shellcheck source=scripts/tailscale-device-api.sh
source "${SCRIPT_DIR}/scripts/tailscale-device-api.sh"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/deployment.conf"
ENV_FILE="${ROOT_DIR}/.env"

REQUIRED_TAILSCALE=""
while [[ "${1:-}" == --required ]]; do REQUIRED_TAILSCALE=1; shift; done
ARG="${1:-}"
CLI_EXPECTED_HOSTNAME="${2:-}"
EXPECTED_HOSTNAME="${CLI_EXPECTED_HOSTNAME}"
if [[ -z "$ARG" ]] || [[ ! "$ARG" =~ ^[0-9]+$ ]]; then
    echo "Usage: $0 [--required] <VMID> [expected_hostname]" >&2
    echo "  Example: $0 8001" >&2
    echo "  Example: $0 8007 moneytree" >&2
    echo "  Use --required to fail (exit 1) when TS_AUTHKEY is missing (e.g. for Discovery)." >&2
    exit 1
fi
VMID="$ARG"

# Load config and .env (for TS_AUTHKEY and PROXMOX_* when running from deploy host)
if [[ -f "$CONFIG_FILE" ]]; then
    set -a
    source <(grep -v '^#' "$CONFIG_FILE" | grep -v '^$' | grep '=') 2>/dev/null || true
    set +a
fi
if [[ -f "$ENV_FILE" ]]; then
    set -a
    source <(grep -v '^#' "$ENV_FILE" | grep -v '^$' | grep '=') 2>/dev/null || true
    set +a
fi
if [[ -n "${CLI_EXPECTED_HOSTNAME:-}" ]]; then
    EXPECTED_HOSTNAME="$CLI_EXPECTED_HOSTNAME"
fi

if [[ -z "${TS_AUTHKEY:-}" ]] && [[ -n "${TS_API_KEY:-}" ]]; then
    TS_AUTHKEY="$TS_API_KEY"
    log_warn "[add-lxc-to-tailscale] TS_AUTHKEY was empty; using TS_API_KEY. Prefer TS_AUTHKEY=tskey-auth-... in ${ENV_FILE}."
fi

if [[ -n "${TS_AUTHKEY:-}" ]]; then
    _ts_auth_trimmed="$(printf '%s' "$TS_AUTHKEY" | tr -d '[:space:]')"
    if [[ "${_ts_auth_trimmed}" != tskey-* ]]; then
        log_error "[add-lxc-to-tailscale] TS_AUTHKEY must be a Tailscale key starting with tskey- (usually tskey-auth-... from https://login.tailscale.com/admin/settings/keys). It is not KITE_API_KEY and not TAILSCALE_API_KEY (tskey-api-...)."
        if [[ -n "$REQUIRED_TAILSCALE" ]]; then
            exit 1
        fi
        log_warn "[add-lxc-to-tailscale] Skipping Tailscale join (invalid TS_AUTHKEY format)."
        exit 0
    fi
fi

if [[ -z "${TS_AUTHKEY:-}" ]]; then
    echo "[add-lxc-to-tailscale] TS_AUTHKEY not set in .env; skipping Tailscale auto-join for VMID $VMID." >&2
    echo "  Add TS_AUTHKEY=tskey-auth-... (or TS_API_KEY=...) to ${ENV_FILE} and re-run deploy to join this container to your tailnet." >&2
    if [[ -n "$REQUIRED_TAILSCALE" ]]; then
        echo "[add-lxc-to-tailscale] Failing because --required was used (container must be on Tailscale)." >&2
        exit 1
    fi
    exit 0
fi

run_on_host() {
    local cmd="$1"
    if command -v pct > /dev/null 2>&1; then
        bash -c "$cmd"
    elif [[ -n "${PROXMOX_HOST:-}" ]] && [[ -n "${PROXMOX_USER:-}" ]]; then
        if [[ -n "${PROXMOX_PASSWORD:-}" ]] && command -v sshpass > /dev/null 2>&1; then
            sshpass -p "$PROXMOX_PASSWORD" ssh -o StrictHostKeyChecking=accept-new "${PROXMOX_USER}@${PROXMOX_HOST}" "$cmd"
        else
            ssh -o StrictHostKeyChecking=accept-new "${PROXMOX_USER}@${PROXMOX_HOST}" "$cmd"
        fi
    else
        echo "ERROR: Run this script on the Proxmox host (where 'pct' is available) or set PROXMOX_HOST and PROXMOX_USER (and PROXMOX_PASSWORD for sshpass)." >&2
        exit 1
    fi
}

exec_in_container() {
    local cmd="$1"
    run_on_host "pct exec $VMID -- bash -c \"$cmd\""
}

dump_tailscale_join_logs() {
    log_warn "[add-lxc-to-tailscale] --- journalctl -u tailscale-autojoin -n 80 (join failures) ---"
    run_on_host "pct exec $VMID -- journalctl -u tailscale-autojoin -n 80 --no-pager 2>&1" || true
    log_warn "[add-lxc-to-tailscale] --- journalctl -u tailscaled -n 40 ---"
    run_on_host "pct exec $VMID -- journalctl -u tailscaled -n 40 --no-pager 2>&1" || true
}

# 100.x = Tailscale CGNAT; present means this LXC completed tailscale up for this tailnet.
tailscale_lxc_has_tailnet_ip() {
    run_on_host "pct exec $VMID -- bash -lc 'ip=\$(tailscale ip -4 2>/dev/null | head -1); [[ -n \"\$ip\" ]] && [[ \"\$ip\" == 100.* ]]'" 2>/dev/null
}

# Re-run the oneshot autjoin unit until connected (deploy path — no manual steps).
ensure_tailscale_connected_after_join() {
    local max_attempts="${TAILSCALE_JOIN_VERIFY_ATTEMPTS:-8}"
    local delay_sec="${TAILSCALE_JOIN_RETRY_DELAY_SEC:-5}"
    local n
    for ((n=1; n<=max_attempts; n++)); do
        if tailscale_lxc_has_tailnet_ip; then
            log_success "[add-lxc-to-tailscale] Tailscale is up (IPv4 in 100.64.0.0/10)."
            return 0
        fi
        if [[ "$n" -ge "$max_attempts" ]]; then
            break
        fi
        log_info "[add-lxc-to-tailscale] Tailscale not ready yet ($n/$max_attempts); restarting tailscale-autojoin…"
        exec_in_container "systemctl restart tailscale-autojoin 2>/dev/null || systemctl start tailscale-autojoin 2>/dev/null || /usr/local/bin/tailscale-autojoin.sh 2>/dev/null || true"
        sleep "$delay_sec"
    done
    log_warn "[add-lxc-to-tailscale] No Tailscale 100.x IPv4 after $max_attempts checks for VMID $VMID."
    if [[ -n "$REQUIRED_TAILSCALE" ]]; then
        dump_tailscale_join_logs
        log_error "[add-lxc-to-tailscale] --required: tailnet join failed. Verify TS_AUTHKEY is a reusable tskey-auth-... key (not expired, not Kite keys). ACLs: https://login.tailscale.com/admin/acls — then: pct exec $VMID -- journalctl -u tailscale-autojoin -n 80 --no-pager"
        exit 1
    fi
    return 1
}

# Write content to a file inside the container (avoids pct exec -i which is not supported on all Proxmox versions)
write_in_container() {
    local content="$1"
    local path="$2"
    local b64
    b64=$(echo -n "$content" | base64 -w 0)
    run_on_host "TMP=\$(mktemp) && echo '$b64' | base64 -d > \"\$TMP\" && pct push $VMID \"\$TMP\" '$path' && rm -f \"\$TMP\""
}

log_info "[add-lxc-to-tailscale] Configuring Tailscale auto-join for container VMID $VMID..."

# True if tailscale is already on the image (moneytree-lxc-base). Use explicit paths: pct exec often has a minimal PATH,
# so "command -v tailscale" can miss /usr/bin/tailscale and trigger a 10–15+ minute apt-get unnecessarily.
lxc_tailscale_binary_present() {
    run_on_host "pct exec ${VMID} -- sh -c 'command -v tailscale >/dev/null 2>&1 || test -x /usr/bin/tailscale || test -x /usr/sbin/tailscale'"
}

# 0. Use public DNS so tailscale.com and pkgs.tailscale.com resolve (Tailscale-first 100.100.100.100 often fails before the node has joined)
exec_in_container "printf 'nameserver 8.8.8.8\nnameserver 8.8.4.4\n' > /etc/resolv.conf 2>/dev/null || true"

# 1. Install Tailscale if not present (apt on Debian/Ubuntu is faster than install.sh; fallback to install.sh)
if ! lxc_tailscale_binary_present; then
    log_info "[add-lxc-to-tailscale] Installing Tailscale..."
    # Minimal images (e.g. clone from OS template) often lack curl; install it so we can fetch keyring and fallback install.sh
    exec_in_container "command -v curl >/dev/null 2>&1 || (DEBIAN_FRONTEND=noninteractive apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl ca-certificates)"
    exec_in_container "if grep -qEi 'debian|ubuntu' /etc/os-release 2>/dev/null; then mkdir -p /usr/share/keyrings; curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/noble.noarmor.gpg | gpg --batch --yes --dearmor -o /usr/share/keyrings/tailscale-archive-keyring.gpg; curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/noble.tailscale-keyring.list | tee /etc/apt/sources.list.d/tailscale.list; DEBIAN_FRONTEND=noninteractive apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq tailscale || (curl -fsSL https://tailscale.com/install.sh | sh); else curl -fsSL https://tailscale.com/install.sh | sh; fi"
else
    log_info "[add-lxc-to-tailscale] Tailscale binary already present (skipping apt install)."
fi

# 2. Ensure tailscaled is running and socket is ready (needed for "already on tailnet" check)
# Stock tailscaled After=network-pre.target can start before DHCP. In unprivileged LXCs that
# often logs magicsock SetNetworkUp(false) and never recovers (Serve/HTTPS timeouts while
# nginx is fine on :80). Wait for a default route before the daemon starts.
WAIT_DEFAULT_ROUTE_SCRIPT='#!/bin/bash
for i in $(seq 1 60); do
  ip -4 route show default | grep -q . && exit 0
  sleep 1
done
exit 0
'
write_in_container "$WAIT_DEFAULT_ROUTE_SCRIPT" "/usr/local/bin/wait-default-route.sh"
exec_in_container "chmod +x /usr/local/bin/wait-default-route.sh"
TS_WAIT_NET_DROPIN='[Unit]
After=network-online.target systemd-networkd.service
Wants=network-online.target

[Service]
ExecStartPre=/usr/local/bin/wait-default-route.sh
'
exec_in_container "mkdir -p /etc/systemd/system/tailscaled.service.d"
write_in_container "$TS_WAIT_NET_DROPIN" "/etc/systemd/system/tailscaled.service.d/20-wait-network-online.conf"
exec_in_container "systemctl daemon-reload"
exec_in_container "systemctl enable tailscaled 2>/dev/null || true"
if ! run_on_host "pct exec $VMID -- systemctl is-active tailscaled 2>/dev/null" 2>/dev/null | grep -q active; then
    exec_in_container "systemctl start tailscaled"
    sleep 3
fi
for _ in 1 2 3 4 5 6 7 8 9 10; do
    if run_on_host "pct exec $VMID -- test -S /var/run/tailscale/tailscaled.sock 2>/dev/null"; then
        break
    fi
    sleep 2
done

# 3. Early check: if already on tailnet with expected hostname, skip entirely (don't overwrite config or run up)
if run_on_host "pct exec $VMID -- test -S /var/run/tailscale/tailscaled.sock 2>/dev/null"; then
    expected_name="$EXPECTED_HOSTNAME"
    if [[ -z "$expected_name" ]]; then
        expected_name=$(run_on_host "pct exec $VMID -- hostname 2>/dev/null" 2>/dev/null | tr -d '[:space:]')
    fi
    # "tailscale status --self" can be multi-line; awk would print $2 for every line and break identity checks.
    current_name=""
    if command -v jq >/dev/null 2>&1; then
        current_name=$(run_on_host "pct exec $VMID -- tailscale status --json 2>/dev/null" 2>/dev/null | jq -r '.Self.DNSName // .Self.HostName // empty' 2>/dev/null | head -n1 | tr -d '[:space:]')
    fi
    if [[ -z "$current_name" ]]; then
        current_name=$(run_on_host "pct exec $VMID -- tailscale status --self 2>/dev/null | head -n 1 | awk '{print \$2}'" 2>/dev/null || true)
    fi
    # Compare short hostname (tailscale may return FQDN e.g. moneytree-discovery.tailce422e.ts.net)
    expected_short="${expected_name%%.*}"
    current_short="${current_name%%.*}"
    if [[ -n "$expected_short" && -n "$current_short" && "$current_short" == "$expected_short" ]]; then
        log_info "[add-lxc-to-tailscale] Already on tailnet as $current_name; skipping (no config change, no re-join)."
        exit 0
    fi
    # 4. Stale identity (typical: LXC cloned from a base that had Tailscale — same machine key as another host).
    # "tailscale logout" does NOT clear node keys; re-auth then causes duplicate node key / admin console churn.
    # Wipe local state so this node gets a fresh key. See tailscale/tailscale#392 #506.
    if [[ -n "$current_short" && -n "$expected_short" && "$current_short" != "$expected_short" ]]; then
        log_info "[add-lxc-to-tailscale] Tailnet identity '$current_short' != expected '$expected_short' (clone/stale state). Resetting local Tailscale state (machine key), not only logout…"
        exec_in_container "systemctl stop tailscaled 2>/dev/null || true"
        exec_in_container "rm -f /var/lib/tailscale/tailscaled.state 2>/dev/null; rm -rf /var/lib/tailscale/* 2>/dev/null || true"
        exec_in_container "systemctl start tailscaled 2>/dev/null || true"
        log_info "[add-lxc-to-tailscale] Waiting for tailscaled socket after state reset…"
        for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
            if run_on_host "pct exec $VMID -- test -S /var/run/tailscale/tailscaled.sock 2>/dev/null"; then
                break
            fi
            sleep 1
        done
        sleep 2
    fi
fi

# 4b. Free hostname via Tailscale Admin API so join gets exact name (no -1, -2 suffix)
#     When container is new or recreated, any stale device with this name must be deleted from the tailnet.
hostname_to_claim="$EXPECTED_HOSTNAME"
[[ -z "$hostname_to_claim" ]] && hostname_to_claim=$(run_on_host "pct exec $VMID -- hostname 2>/dev/null" 2>/dev/null | tr -d '[:space:]') || true
TAILNET="${TAILNET_DNS:-${TAILNET:-}}"
[[ -z "$TAILNET" ]] && [[ -n "${GATEWAY_DOMAIN:-}" ]] && TAILNET=$(echo "$GATEWAY_DOMAIN" | sed -n 's/^[^.]*\.\(.*\)$/\1/p')
[[ -z "$TAILNET" ]] && [[ -n "${FRONTEND_HOST:-}" ]] && TAILNET=$(echo "$FRONTEND_HOST" | sed -n 's/^[^.]*\.\(.*\)$/\1/p')
# Admin API only accepts tskey-api-... (https://login.tailscale.com/admin/settings/keys). Other values (e.g. Kite API keys) produce noisy failures.
if [[ -n "${TAILSCALE_API_KEY:-}" ]] && [[ "${TAILSCALE_API_KEY}" != tskey-api-* ]]; then
    log_warn "[add-lxc-to-tailscale] TAILSCALE_API_KEY must be a Tailscale Admin API token (prefix tskey-api-). Clearing it for this run so tailscale up is unaffected."
    TAILSCALE_API_KEY=""
fi
if [[ -n "${TAILSCALE_API_KEY:-}" ]] && [[ -n "$hostname_to_claim" ]] && [[ -n "$TAILNET" ]] && command -v curl > /dev/null 2>&1 && ts_has_json_tool; then
    DEVICES_JSON="$(ts_fetch_tailnet_devices_json "$TAILSCALE_API_KEY" "$TAILNET" || true)"
    if [[ -n "$DEVICES_JSON" ]]; then
        MATCHING_IDS="$(ts_match_device_ids "$hostname_to_claim" "$DEVICES_JSON" || true)"
        while IFS= read -r DEVICE_ID; do
            [[ -z "$DEVICE_ID" ]] || [[ "$DEVICE_ID" == "null" ]] && continue
            DEVICE_NAME="$(ts_device_display_name "$DEVICE_ID" "$DEVICES_JSON" || echo "$DEVICE_ID")"
            if ts_delete_device "$TAILSCALE_API_KEY" "$DEVICE_ID"; then
                log_info "[add-lxc-to-tailscale] Deleted existing device '$DEVICE_NAME' from tailnet so this node can register as '$hostname_to_claim' (canonical MagicDNS name)."
            fi
        done <<< "$MATCHING_IDS"
        sleep 5
    else
        log_warn "[add-lxc-to-tailscale] Could not list tailnet devices via Admin API; hostname '$hostname_to_claim' may get a -N suffix if stale nodes remain."
    fi
elif [[ -n "${TAILSCALE_API_KEY:-}" ]] && [[ -n "$hostname_to_claim" ]]; then
    log_warn "[add-lxc-to-tailscale] Skipping stale-device API cleanup (need curl and jq or python3 on the deploy host). Without it, --recreate leaves expired nodes and new LXCs join as ${hostname_to_claim}-1. Install: sudo apt install jq"
fi

# 5. Write config and autojoin
DEFAULT_CONTENT="TS_AUTHKEY=$TS_AUTHKEY"
write_in_container "$DEFAULT_CONTENT" "/etc/default/tailscale"
exec_in_container "chmod 600 /etc/default/tailscale"

AUTOJOIN_SCRIPT='#!/bin/bash
source /etc/default/tailscale
tailscale up --authkey=$TS_AUTHKEY --hostname=$(hostname) --accept-routes --accept-dns=true
'
write_in_container "$AUTOJOIN_SCRIPT" "/usr/local/bin/tailscale-autojoin.sh"
exec_in_container "chmod +x /usr/local/bin/tailscale-autojoin.sh"

SYSTEMD_UNIT='[Unit]
After=network-online.target tailscaled.service
Wants=network-online.target

[Service]
Type=oneshot
TimeoutStartSec=120
ExecStart=/usr/local/bin/tailscale-autojoin.sh

[Install]
WantedBy=multi-user.target
'
write_in_container "$SYSTEMD_UNIT" "/etc/systemd/system/tailscale-autojoin.service"

exec_in_container "systemctl daemon-reload"
exec_in_container "systemctl enable tailscale-autojoin"

# 6. Run join once, then verify 100.x and retry autjoin automatically (same flow as deploy.sh / every deploy-*.sh).
if run_on_host "pct exec $VMID -- test -S /var/run/tailscale/tailscaled.sock 2>/dev/null"; then
    exec_in_container "/usr/local/bin/tailscale-autojoin.sh" || true
    if tailscale_lxc_has_tailnet_ip; then
        log_success "[add-lxc-to-tailscale] Tailscale is up (IPv4 in 100.64.0.0/10)."
    elif ensure_tailscale_connected_after_join; then
        :
    else
        dump_tailscale_join_logs
        log_warn "[add-lxc-to-tailscale] VMID $VMID still has no Tailscale 100.x IPv4 after automatic retries; check logs above and journalctl -u tailscale-autojoin on the LXC."
    fi
    log_info "[add-lxc-to-tailscale] Tailscale auto-join configured; node should appear in your tailnet (hostname from container)."
    if [[ -n "${TAILNET_DNS:-}" ]]; then
        log_info "[add-lxc-to-tailscale] With MagicDNS: reachable at <hostname>.${TAILNET_DNS}"
    else
        log_info "[add-lxc-to-tailscale] MagicDNS: enable in Tailscale admin if needed: https://login.tailscale.com/admin/dns"
    fi
else
    log_info "[add-lxc-to-tailscale] tailscaled socket not ready; tailscale-autojoin will run on next boot."
fi
