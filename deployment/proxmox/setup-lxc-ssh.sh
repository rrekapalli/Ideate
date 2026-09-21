#!/bin/bash
# Set up SSH and UFW (allow 22/tcp) for any MoneyTree LXC container.
# Creates container user, installs openssh-server/sudo, enables SSH with password auth,
# and enables UFW with port 22/tcp allowed. Safe to re-run (idempotent).
#
# Usage:
#   ./setup-lxc-ssh.sh <VMID_or_container_name> [container_user] [password]
#   ./setup-lxc-ssh.sh 8001
#   ./setup-lxc-ssh.sh moneytree-discovery
#   ./setup-lxc-ssh.sh moneytree-gateway raja mypassword
#
# Run on Proxmox host: ./setup-lxc-ssh.sh 8003
# Or with remote Proxmox: PROXMOX_HOST=192.168.29.231 PROXMOX_USER=root ./setup-lxc-ssh.sh moneytree-backend
# (requires sshpass and PROXMOX_PASSWORD in .env or environment for remote)
#
# User/password from .env or deployment.conf (same as moneytree-lxc-base); or pass as 2nd/3rd argument.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/deployment.conf"
ENV_FILE="${ROOT_DIR}/.env"

ARG="${1:-}"

if [[ -z "$ARG" ]]; then
    echo "Usage: $0 <VMID_or_container_name> [container_user] [password]" >&2
    echo "  VMIDs: 7201 (ideate-api), 7202 (ideate)" >&2
    echo "  Names: ideate-api, ideate" >&2
    exit 1
fi

# Load config and .env
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
CONTAINER_USER="${2:-${CONTAINER_USER:-raja}}"
CONTAINER_USER_PASSWORD="${3:-${CONTAINER_PASSWORD:-}}"
[[ -z "$CONTAINER_USER_PASSWORD" ]] && { echo "CONTAINER_PASSWORD must be set in .env or deployment.conf, or pass as 3rd argument." >&2; exit 1; }

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
        echo "ERROR: Run this script on the Proxmox host (pct required) or set PROXMOX_HOST, PROXMOX_USER and optionally PROXMOX_PASSWORD" >&2
        exit 1
    fi
}

# Resolve ARG to VMID and container name
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

run_in_container() {
    local cmd="$1"
    if command -v pct > /dev/null 2>&1; then
        pct exec "$VMID" -- bash -c "$cmd"
    elif [[ -n "${PROXMOX_HOST:-}" ]] && [[ -n "${PROXMOX_USER:-}" ]]; then
        local escaped; escaped=$(printf '%s' "$cmd" | base64 | tr -d '\n')
        local remote_cmd="pct exec $VMID -- bash -c \"\$(echo $escaped | base64 -d)\""
        if [[ -n "${PROXMOX_PASSWORD:-}" ]] && command -v sshpass > /dev/null 2>&1; then
            sshpass -p "$PROXMOX_PASSWORD" ssh -o StrictHostKeyChecking=accept-new "${PROXMOX_USER}@${PROXMOX_HOST}" "$remote_cmd"
        else
            ssh -o StrictHostKeyChecking=accept-new "${PROXMOX_USER}@${PROXMOX_HOST}" "$remote_cmd"
        fi
    else
        echo "ERROR: Run this script on the Proxmox host (pct required) or set PROXMOX_HOST, PROXMOX_USER and optionally PROXMOX_PASSWORD" >&2
        exit 1
    fi
}

echo "Setting up user '$CONTAINER_USER', SSH, and UFW (22/tcp) on container $CONTAINER_NAME (VMID $VMID)..."

# Install openssh-server, sudo, and ufw if missing
run_in_container "apt-get update -qq > /dev/null 2>&1 && apt-get install -y -qq openssh-server sudo ufw > /dev/null 2>&1 || true"

# Create or update user with password and sudo
run_in_container "id -u $CONTAINER_USER > /dev/null 2>&1 || (useradd -m -s /bin/bash $CONTAINER_USER && echo User created)"
run_in_container "echo $CONTAINER_USER:$CONTAINER_USER_PASSWORD | chpasswd"
run_in_container "usermod -aG sudo $CONTAINER_USER 2>/dev/null || true"

# Enable and start SSH; allow password auth
run_in_container "systemctl enable ssh > /dev/null 2>&1 || systemctl enable sshd > /dev/null 2>&1 || true"
run_in_container "systemctl start ssh > /dev/null 2>&1 || systemctl start sshd > /dev/null 2>&1 || true"
run_in_container "sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config 2>/dev/null || true"
run_in_container "sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config 2>/dev/null || true"
run_in_container "systemctl restart ssh > /dev/null 2>&1 || systemctl restart sshd > /dev/null 2>&1 || true"

# UFW: allow 22/tcp and enable (non-interactive)
run_in_container "command -v ufw >/dev/null 2>&1 && (ufw allow 22/tcp >/dev/null 2>&1; echo 'y' | ufw enable 2>/dev/null || ufw --force enable 2>/dev/null) && echo 'UFW enabled, 22/tcp allowed' || true"

echo "Done. You can log in with:"
echo "  ssh $CONTAINER_USER@<container-ip>"
echo "  or via Tailscale: ssh $CONTAINER_USER@$CONTAINER_NAME.<your-tailnet>"
echo "  Password: $CONTAINER_USER_PASSWORD"
