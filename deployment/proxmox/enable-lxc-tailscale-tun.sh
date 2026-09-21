#!/bin/bash
# Enable TUN device for any MoneyTree LXC container so Tailscale can run inside it.
# Run on the Proxmox host or via SSH with PROXMOX_* env vars.
#
# Usage:
#   ./enable-lxc-tailscale-tun.sh <VMID_or_container_name>
#   ./enable-lxc-tailscale-tun.sh 8001
#   ./enable-lxc-tailscale-tun.sh moneytree-discovery
#   ./enable-lxc-tailscale-tun.sh moneytree-gateway
#   ./enable-lxc-tailscale-tun.sh moneytree-kitegateway
#   ... (any container: discovery, gateway, kitegateway, backend, ingestionengine, moneytree-admin, ironflyengine)
#
# On Proxmox host: ./enable-lxc-tailscale-tun.sh 8003
# From your machine: PROXMOX_HOST=192.168.29.231 PROXMOX_USER=root PROXMOX_PASSWORD=xxx ./enable-lxc-tailscale-tun.sh moneytree-backend
#
# After this, inside the container run:
#   sudo systemctl start tailscaled
#   sudo tailscale up --auth-key=tskey-auth-...

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/deployment.conf"
ENV_FILE="${ROOT_DIR}/.env"

ARG="${1:-}"
if [[ -z "$ARG" ]]; then
    echo "Usage: $0 <VMID_or_container_name>" >&2
    echo "  VMID: 7201 (ideate-api), 7202 (ideate)" >&2
    echo "  Names: ideate-api, ideate" >&2
    exit 1
fi

# Load config and .env so we can resolve names to VMIDs from deployment.conf if needed
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

# Resolve ARG to VMID and container name (pct list: VMID is col 1, name is last column)
if [[ "$ARG" =~ ^[0-9]+$ ]]; then
    VMID="$ARG"
    CONTAINER_NAME=$(run_on_host "pct list 2>/dev/null | tail -n +2 | awk -v vmid=$VMID '\$1 == vmid {print \$NF}' | head -n1" 2>/dev/null | tr -d '[:space:]')
    [[ -z "$CONTAINER_NAME" ]] && CONTAINER_NAME="VMID-$VMID"
else
    CONTAINER_NAME="$ARG"
    VMID=$(run_on_host "pct list 2>/dev/null | tail -n +2 | awk -v name=\"$CONTAINER_NAME\" '\$NF == name {print \$1}' | head -n1" 2>/dev/null | tr -d '[:space:]')
    if [[ -z "$VMID" ]]; then
        VMID=$(run_on_host "pct list 2>/dev/null | tail -n +2 | awk -v name=\"$CONTAINER_NAME\" '\$3 == name {print \$1}' | head -n1" 2>/dev/null | tr -d '[:space:]')
    fi
    if [[ -z "$VMID" ]]; then
        echo "ERROR: Container '$CONTAINER_NAME' not found on Proxmox (pct list)." >&2
        exit 1
    fi
fi

echo "Enabling TUN device for container $CONTAINER_NAME (VMID $VMID) on Proxmox host..."

# 1. Ensure tun module and /dev/net/tun exist on the host
run_on_host "modprobe tun 2>/dev/null || true; mkdir -p /dev/net; [[ -c /dev/net/tun ]] || mknod /dev/net/tun c 10 200 2>/dev/null || true; chmod 666 /dev/net/tun 2>/dev/null || true; echo TUN on host:; ls -la /dev/net/tun 2>/dev/null || echo '/dev/net/tun not found'"

# 2. Add TUN device to the LXC config (Proxmox 7+ cgroup2) - format per Tailscale KB 1130
CONF="/etc/pve/lxc/${VMID}.conf"
MARKER="# Tailscale TUN device (added by enable-lxc-tailscale-tun.sh)"
run_on_host "grep -q 'lxc.mount.entry.*tun' $CONF 2>/dev/null && echo 'TUN already configured in $CONF' || {
    echo '' >> $CONF
    echo '$MARKER' >> $CONF
    echo 'lxc.cgroup2.devices.allow: c10:200 rwm' >> $CONF
    echo 'lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file' >> $CONF
    echo 'Added TUN device to $CONF'
}"

# 3. Enable keyctl and nesting (recommended by Tailscale for LXC)
run_on_host "pct set $VMID --features keyctl=1,nesting=1 2>/dev/null && echo 'Enabled keyctl and nesting for container $VMID' || echo 'Note: pct set features failed (may already be set or unsupported)'"

# 4. Restart container so config takes effect
run_on_host "pct status $VMID 2>/dev/null | head -1"
run_on_host "echo 'Stopping container $VMID...'; pct stop $VMID 2>/dev/null || true; sleep 2; echo 'Starting container $VMID...'; pct start $VMID; sleep 3; pct status $VMID"
echo ""
echo "Container restarted. Inside the container:"
echo "  1. Check TUN device:  ls -la /dev/net/tun"
echo "  2. Start Tailscale:   sudo systemctl restart tailscaled && sleep 2 && sudo tailscale up --auth-key=tskey-auth-..."
echo ""
echo "If you still get '503 no backend', see docs/DISCOVERY_TAILSCALE_LXC.md for userspace fallback."
