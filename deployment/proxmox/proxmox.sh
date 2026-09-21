#!/bin/bash

# Proxmox LXC Container Helper Library
# Provides reusable functions for managing LXC containers via Proxmox pct CLI

set -euo pipefail

# Colors for output (if not already set by deploy-logging.sh)
RED="${RED:-\033[0;31m}"
GREEN="${GREEN:-\033[0;32m}"
YELLOW="${YELLOW:-\033[1;33m}"
BLUE="${BLUE:-\033[0;34m}"
CYAN="${CYAN:-\033[0;36m}"
NC="${NC:-\033[0m}"

# Logging: use timestamped versions from deploy-logging.sh when sourced by a deploy script
if ! type log_info &>/dev/null; then
    log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
    log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
    log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
    log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
    log_prompt() { echo -e "${CYAN}[?]${NC} $1"; }
fi

# ==============================================================================
# Proxmox LXC Container Helper Functions
# ==============================================================================

# Find container by name and return VMID
# Usage: VMID=$(proxmox_find_container_by_name "moneytree-admin")
proxmox_find_container_by_name() {
    local name="$1"
    if [[ -z "$name" ]]; then
        log_error "Container name is required"
        return 1
    fi
    
    # pct list format: VMID STATUS NAME
    # Find container by name in the NAME column
    local vmid
    vmid=$(pct list 2>/dev/null | awk -v name="$name" '$3 == name {print $1}' | head -n1)
    
    if [[ -n "$vmid" ]]; then
        echo "$vmid"
        return 0
    else
        echo ""
        return 1
    fi
}

# Check if container exists by name
# Usage: if proxmox_container_exists "moneytree-admin"; then ...
proxmox_container_exists() {
    local name="$1"
    if [[ -z "$name" ]]; then
        return 1
    fi
    
    local vmid
    vmid=$(proxmox_find_container_by_name "$name")
    
    if [[ -n "$vmid" ]]; then
        return 0
    else
        return 1
    fi
}

# Get next available VMID
# Proxmox typically uses 100-999 for containers
_get_next_vmid() {
    local max_vmid=0
    local vmid
    
    # Find the highest VMID in use
    while IFS= read -r line; do
        vmid=$(echo "$line" | awk '{print $1}')
        if [[ "$vmid" =~ ^[0-9]+$ ]] && [[ "$vmid" -gt "$max_vmid" ]]; then
            max_vmid=$vmid
        fi
    done < <(pct list 2>/dev/null | tail -n +2)
    
    # Return next available VMID (start from 100 if none exist)
    if [[ $max_vmid -lt 100 ]]; then
        echo 100
    else
        echo $((max_vmid + 1))
    fi
}

# Create unprivileged LXC container
# Usage: VMID=$(proxmox_create_container "moneytree-admin" "ubuntu-24.04-standard" 1 512)
proxmox_create_container() {
    local name="$1"
    local ostemplate="$2"
    local cores="$3"
    local memory="$4"
    
    if [[ -z "$name" ]] || [[ -z "$ostemplate" ]] || [[ -z "$cores" ]] || [[ -z "$memory" ]]; then
        log_error "proxmox_create_container requires: name, ostemplate, cores, memory"
        return 1
    fi
    
    # Check if container already exists
    if proxmox_container_exists "$name"; then
        local existing_vmid
        existing_vmid=$(proxmox_find_container_by_name "$name")
        log_warn "Container '$name' already exists with VMID $existing_vmid"
        echo "$existing_vmid"
        return 0
    fi
    
    # Get next available VMID
    local vmid
    vmid=$(_get_next_vmid)
    
    log_info "Creating LXC container '$name' with VMID $vmid..."
    log_info "  Template: $ostemplate"
    log_info "  Cores: $cores"
    log_info "  Memory: ${memory}MB"
    
    # Create container (unprivileged by default)
    # Use --rootfs for LXC containers (not --storage which is for VMs)
    # Try storage:path format first, fallback to filename
    local template_spec="local:vztmpl/$ostemplate"
    
    if ! pct create "$vmid" "$template_spec" \
        --hostname "$name" \
        --cores "$cores" \
        --memory "$memory" \
        --net0 name=eth0,bridge=vmbr0,ip=dhcp \
        --unprivileged 1 \
        --onboot 1 \
        --rootfs local-storage:20 2>&1; then
        # Fallback to just filename if storage:path format fails
        log_warn "Template format 'local:vztmpl/$ostemplate' failed, trying filename format..."
        if ! pct create "$vmid" "$ostemplate" \
            --hostname "$name" \
            --cores "$cores" \
            --memory "$memory" \
            --net0 name=eth0,bridge=vmbr0,ip=dhcp \
            --unprivileged 1 \
            --onboot 1 \
            --rootfs local-storage:20 2>&1; then
            log_error "Failed to create container '$name'"
            return 1
        fi
    fi
    
    # Set container name/description
    pct set "$vmid" --description "moneytree-admin LXC container" 2>/dev/null || true
    
    log_success "Container '$name' created successfully with VMID $vmid"
    echo "$vmid"
    return 0
}

# Start LXC container
# Usage: proxmox_start_container <vmid>
proxmox_start_container() {
    local vmid="$1"
    
    if [[ -z "$vmid" ]]; then
        log_error "VMID is required"
        return 1
    fi
    
    # Check if container is already running
    local status
    status=$(pct status "$vmid" 2>/dev/null | awk '{print $2}')
    
    if [[ "$status" == "running" ]]; then
        log_info "Container $vmid is already running"
        return 0
    fi
    
    log_info "Starting container $vmid..."
    if pct start "$vmid" 2>&1; then
        # Wait a moment for container to fully start
        sleep 2
        log_success "Container $vmid started successfully"
        return 0
    else
        log_error "Failed to start container $vmid"
        return 1
    fi
}

# Execute command inside container
# Usage: proxmox_exec_in_container <vmid> "command to run"
proxmox_exec_in_container() {
    local vmid="$1"
    local command="$2"
    
    if [[ -z "$vmid" ]] || [[ -z "$command" ]]; then
        log_error "proxmox_exec_in_container requires: vmid, command"
        return 1
    fi
    
    # Execute command and capture exit code
    if pct exec "$vmid" -- bash -c "$command"; then
        return 0
    else
        return $?
    fi
}

# Ensure deploy user exists (clone-from-base assumes user in template; stale java base 9001 may lack it).
proxmox_ensure_container_user_exists() {
    local vmid="$1"
    local user="${2:-${CONTAINER_USER:-raja}}"
    proxmox_exec_in_container "$vmid" "id ${user} >/dev/null 2>&1 || adduser --disabled-password --gecos '' ${user}" || return 1
    proxmox_exec_in_container "$vmid" "usermod -aG sudo ${user} 2>/dev/null || true; if [[ ! -f /etc/sudoers.d/${user} ]]; then printf '%s ALL=(ALL) NOPASSWD:ALL\\n' '${user}' > /etc/sudoers.d/${user} && chmod 440 /etc/sudoers.d/${user}; fi" || true
    return 0
}

# Push file from host to container
# Usage: proxmox_push_file <vmid> <src> <dst>
proxmox_push_file() {
    local vmid="$1"
    local src="$2"
    local dst="$3"
    
    if [[ -z "$vmid" ]] || [[ -z "$src" ]] || [[ -z "$dst" ]]; then
        log_error "proxmox_push_file requires: vmid, src, dst"
        return 1
    fi
    
    if [[ ! -f "$src" ]]; then
        log_error "Source file does not exist: $src"
        return 1
    fi
    
    log_info "Pushing file to container $vmid: $src -> $dst"
    
    if pct push "$vmid" "$src" "$dst" 2>&1; then
        log_success "File pushed successfully"
        return 0
    else
        log_error "Failed to push file to container $vmid"
        return 1
    fi
}

# Wait for Tailscale hostname to resolve inside the container (required for Eureka and Kite callback URL).
# Call after add-lxc-to-tailscale and before starting the app service so Eureka registers with Tailscale domain, not localhost.
# Usage: wait_for_tailscale_hostname <vmid> <tailscale_hostname> [max_attempts]
# Example: wait_for_tailscale_hostname "$VMID" "moneytree-backend.tailce422e.ts.net"
wait_for_tailscale_hostname() {
    local vmid="$1"
    local hostname="$2"
    local max_attempts="${3:-30}"
    if [[ -z "$vmid" ]] || [[ -z "$hostname" ]]; then
        log_error "wait_for_tailscale_hostname requires VMID and hostname (Tailscale domain, e.g. moneytree-backend.tailce422e.ts.net)"
        return 1
    fi
    if [[ "$hostname" == "localhost" ]] || [[ "$hostname" == "127.0.0.1" ]]; then
        log_error "EUREKA_INSTANCE_HOSTNAME must be the Tailscale domain (e.g. moneytree-backend.tailce422e.ts.net), not localhost. Set *_DOMAIN in deployment.conf."
        return 1
    fi
    log_info "Waiting for Tailscale hostname $hostname to resolve (required for Eureka and Kite callback)..."
    local attempt=1
    while [[ $attempt -le $max_attempts ]]; do
        if proxmox_exec_in_container "$vmid" "getent hosts $hostname >/dev/null 2>&1"; then
            log_success "Tailscale hostname $hostname resolves"
            return 0
        fi
        # Node can have 100.x before MagicDNS/nsswitch answers getent (common right after tailscale up).
        if proxmox_exec_in_container "$vmid" "tailscale ip -4 2>/dev/null | head -1 | grep -qE '^100[.]'"; then
            log_success "Tailscale has 100.x IPv4 (accepting before MagicDNS for $hostname)"
            return 0
        fi
        if [[ $attempt -eq $max_attempts ]]; then
            log_error "Tailscale hostname $hostname did not resolve after $max_attempts attempts. Start service manually after Tailscale is up."
            return 1
        fi
        sleep 2
        ((attempt++)) || true
    done
    return 1
}

# Get container IP address
# Usage: IP=$(proxmox_get_container_ip <vmid>)
proxmox_get_container_ip() {
    local vmid="$1"
    
    if [[ -z "$vmid" ]]; then
        log_error "VMID is required"
        echo ""
        return 1
    fi
    
    # Get IP from pct config or network info
    local ip
    ip=$(pct exec "$vmid" -- hostname -I 2>/dev/null | awk '{print $1}' | tr -d '[:space:]')
    
    if [[ -n "$ip" ]]; then
        echo "$ip"
        return 0
    else
        echo ""
        return 1
    fi
}

# Clone-only deploy: service scripts must not download vztmpl (see REQUIRE_CLONE_TEMPLATE in deployment.conf).
_PROXMOX_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lxc-deploy-clone-only.inc.sh
source "${_PROXMOX_LIB_DIR}/lxc-deploy-clone-only.inc.sh"

proxmox_require_clone_template() {
    local template_name="$1"
    local template_vmid="${2:-}"
    lxc_deploy_require_clone_template_name "$template_name" "${template_name:-service}"
    if [[ -z "$template_vmid" ]]; then
        return 0
    fi
    if ! pct config "$template_vmid" 2>/dev/null | grep -q '^template: 1'; then
        log_error "Proxmox template VMID ${template_vmid} (${template_name}) not found."
        log_error "Need MoneyTree template ${template_vmid} (${template_name}) on the Proxmox host."
        exit 1
    fi
}

proxmox_ensure_service_rootfs_gb() {
    lxc_deploy_ensure_service_rootfs_gb "$@"
}
