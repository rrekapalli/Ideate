#!/usr/bin/env bash
# Shared helpers for Ideate Proxmox deploy-api.sh / deploy-app.sh.
# shellcheck shell=bash

_IDEATE_COMMON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lxc-deploy-clone-only.inc.sh
source "${_IDEATE_COMMON_DIR}/lxc-deploy-clone-only.inc.sh"

ideate_deploy_root() {
  local here
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "${here}/../.." && pwd
}

ideate_load_config() {
  local script_dir="$1"
  local root_dir="$2"
  local config_file="${script_dir}/deployment.conf"
  local env_file="${root_dir}/.env"
  if [[ -f "$config_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source <(grep -v '^#' "$config_file" | grep -v '^$' | grep '=') || true
    set +a
  fi
  if [[ -f "$env_file" ]]; then
    set -a
    while IFS= read -r line || [[ -n "$line" ]]; do
      [[ "$line" =~ ^[[:space:]]*# ]] && continue
      [[ -z "${line// }" ]] && continue
      [[ "$line" != *=* ]] && continue
      eval "export $line" 2>/dev/null || true
    done < "$env_file"
    set +a
  fi
}

ideate_parse_flags() {
  ACCEPT_DEFAULTS=false
  RECREATE=false
  local arg
  for arg in "$@"; do
    case "$arg" in
      --accept-defaults|--accept-default) ACCEPT_DEFAULTS=true ;;
      --recreate) RECREATE=true ;;
      --help|-h) return 2 ;;
      *)
        log_error "Unknown option: $arg"
        return 1
        ;;
    esac
  done
}

ideate_prompt_with_default() {
  local prompt_text="$1" default_value="$2" var_name="$3"
  if [[ -n "$default_value" ]]; then
    log_prompt "${prompt_text} [${default_value}]: "
  else
    log_prompt "${prompt_text}: "
  fi
  local input
  read -r input
  if [[ -z "$input" && -n "$default_value" ]]; then
    eval "$var_name=\"$default_value\""
  else
    eval "$var_name=\"$input\""
  fi
}

ideate_prompt_password() {
  log_prompt "$1: "
  local input
  read -rs input
  echo
  eval "$2=\"$input\""
}

ideate_init_proxmox() {
  local script_dir="$1"
  USE_REMOTE_PROXMOX=false
  PROXMOX_SSH_OPTS="-o StrictHostKeyChecking=accept-new -o ConnectTimeout=60 -o ServerAliveInterval=30 -o ServerAliveCountMax=6"
  if ! command -v pct >/dev/null 2>&1; then
    log_info "pct not found locally; using remote Proxmox via SSH."
    USE_REMOTE_PROXMOX=true
  fi

  if [[ "$USE_REMOTE_PROXMOX" == true ]]; then
    PROXMOX_HOST="${PROXMOX_HOST:-192.168.29.231}"
    PROXMOX_USER="${PROXMOX_USER:-root}"
    if [[ "$ACCEPT_DEFAULTS" == false ]]; then
      ideate_prompt_with_default "Proxmox Host" "$PROXMOX_HOST" PROXMOX_HOST
      ideate_prompt_with_default "Proxmox User" "$PROXMOX_USER" PROXMOX_USER
      [[ -z "${PROXMOX_PASSWORD:-}" ]] && ideate_prompt_password "Proxmox Password" PROXMOX_PASSWORD
    else
      [[ -z "${PROXMOX_PASSWORD:-}" ]] && { log_error "PROXMOX_PASSWORD required for --accept-defaults"; return 1; }
    fi
    if [[ -n "${PROXMOX_PASSWORD:-}" ]] && ! command -v sshpass >/dev/null 2>&1; then
      log_error "sshpass is required for remote Proxmox. Install it in WSL: sudo apt-get install -y sshpass"
      return 1
    fi
    log_info "Connecting to Proxmox ${PROXMOX_HOST}..."
    if ! _pct_remote "command -v pct >/dev/null 2>&1"; then
      log_error "Cannot reach Proxmox or pct is missing on ${PROXMOX_HOST}"
      return 1
    fi
    log_success "SSH to Proxmox verified"
    _ideate_define_remote_pct
  else
    # shellcheck source=proxmox.sh
    source "${script_dir}/proxmox.sh"
    _ideate_define_local_clone
    proxmox_push_file() {
      ideate_push_file "$1" "$2" "$3"
    }
  fi
}

_pct_remote() {
  local cmd="$*"
  if [[ -n "${PROXMOX_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
    sshpass -p "$PROXMOX_PASSWORD" ssh $PROXMOX_SSH_OPTS "${PROXMOX_USER}@${PROXMOX_HOST}" "$cmd"
  else
    ssh $PROXMOX_SSH_OPTS "${PROXMOX_USER}@${PROXMOX_HOST}" "$cmd"
  fi
}

_ideate_define_remote_pct() {
  proxmox_find_container_by_name() {
    local name="$1"
    _pct_remote "pct list 2>/dev/null | tail -n +2 | awk -v name=\"$name\" '\$NF == name {print \$1}' | head -n1"
  }
  proxmox_container_exists() {
    local name="$1"
    [[ -n "$(proxmox_find_container_by_name "$name" | tr -d '[:space:]')" ]]
  }
  proxmox_start_container() {
    local vmid="$1"
    local status
    status=$(_pct_remote "pct status $vmid 2>/dev/null | awk '{print \$2}'" | head -1)
    if [[ "$status" == "running" ]]; then
      log_info "Container $vmid is already running"
      return 0
    fi
    log_info "Starting container $vmid..."
    _pct_remote "pct start $vmid" && sleep 2
  }
  proxmox_exec_in_container() {
    local vmid="$1" command="$2"
    local q
    q=$(printf '%q' "$command")
    _pct_remote "pct exec $vmid -- bash -lc $q"
  }
  proxmox_push_file() {
    ideate_push_file "$1" "$2" "$3"
  }
  proxmox_ensure_container_user_exists() {
    local vmid="$1" user="${2:-${CONTAINER_USER:-raja}}"
    proxmox_exec_in_container "$vmid" "id ${user} >/dev/null 2>&1 || adduser --disabled-password --gecos '' ${user}"
    proxmox_exec_in_container "$vmid" "usermod -aG sudo ${user} 2>/dev/null || true; if [[ ! -f /etc/sudoers.d/${user} ]]; then printf '%s ALL=(ALL) NOPASSWD:ALL\\n' '${user}' > /etc/sudoers.d/${user} && chmod 440 /etc/sudoers.d/${user}; fi" || true
  }
  proxmox_ensure_service_rootfs_gb() {
    lxc_deploy_ensure_service_rootfs_gb "$@"
  }
  proxmox_clone_container() {
    ideate_clone_container "$@"
  }
}

_ideate_define_local_clone() {
  proxmox_clone_container() {
    ideate_clone_container "$@"
  }
}

ideate_host_exec() {
  if [[ "${USE_REMOTE_PROXMOX:-false}" == true ]]; then
    _pct_remote "$*"
  else
    bash -c "$*"
  fi
}

ideate_clone_container() {
  local template_name="$1" new_name="$2" new_vmid="$3" cores="$4" memory="$5" template_vmid="${6:-}"
  if [[ -z "$template_vmid" ]] || [[ ! "$template_vmid" =~ ^[0-9]+$ ]]; then
    template_vmid="$(ideate_host_exec "pct list 2>/dev/null | tail -n +2 | awk -v name=\"$template_name\" '\$NF == name {print \$1}' | head -n1" | tr -d '[:space:]')"
  fi
  if [[ -z "$template_vmid" ]] || [[ ! "$template_vmid" =~ ^[0-9]+$ ]]; then
    log_error "Clone template '$template_name' not found on Proxmox"
    return 1
  fi
  if ideate_host_exec "pct list 2>/dev/null | awk '{print \$1}' | grep -q '^${new_vmid}$'"; then
    log_error "VMID $new_vmid already exists."
    return 1
  fi
  log_info "Cloning '$template_name' (VMID $template_vmid) to VMID $new_vmid hostname $new_name..."
  ideate_host_exec "pct clone $template_vmid $new_vmid --hostname $new_name --full --storage ${LXC_ROOTFS_STORAGE:-local-storage}" || return 1
  ideate_host_exec "pct set $new_vmid --cores $cores --memory $memory --tags ideate" || true
  ideate_host_exec "pct set $new_vmid --net0 name=eth0,bridge=vmbr0,ip=dhcp" || true
  log_success "Container cloned"
}

ideate_push_file() {
  local vmid="$1" src="$2" dst="$3"
  if [[ ! -f "$src" ]]; then
    log_error "Source file does not exist: $src"
    return 1
  fi
  local src_size
  src_size=$(stat -c%s "$src" 2>/dev/null || stat -f%z "$src")
  if [[ "${USE_REMOTE_PROXMOX:-false}" != true ]]; then
    local dst_dir
    dst_dir=$(dirname "$dst")
    pct exec "$vmid" -- mkdir -p "$dst_dir"
    if [[ "$src_size" -ge 1048576 ]]; then
      cat "$src" | pct exec "$vmid" -- dd of="$dst" bs=8M conv=fsync status=none
    else
      pct push "$vmid" "$src" "$dst"
    fi
    return 0
  fi
  local temp_file="/tmp/ideate-push-${vmid}-$$-$(basename "$src" | tr -c 'A-Za-z0-9._-' '_')"
  if [[ -n "${PROXMOX_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
    sshpass -p "$PROXMOX_PASSWORD" scp $PROXMOX_SSH_OPTS "$src" "${PROXMOX_USER}@${PROXMOX_HOST}:${temp_file}" || return 1
  else
    scp $PROXMOX_SSH_OPTS "$src" "${PROXMOX_USER}@${PROXMOX_HOST}:${temp_file}" || return 1
  fi
  local dst_dir
  dst_dir=$(dirname "$dst")
  _pct_remote "pct exec $vmid -- mkdir -p ${dst_dir}" || true
  _pct_remote "pct exec $vmid -- rm -f ${dst}" || true
  if [[ "$src_size" -ge 1048576 ]]; then
    _pct_remote "cat ${temp_file} | pct exec ${vmid} -- dd of=${dst} bs=8M conv=fsync status=none" || { _pct_remote "rm -f ${temp_file}"; return 1; }
  else
    _pct_remote "pct push $vmid $temp_file $dst" || { _pct_remote "rm -f ${temp_file}"; return 1; }
  fi
  _pct_remote "rm -f ${temp_file}" || true
}

ideate_ensure_container() {
  local container_name="$1" fixed_vmid="$2" clone_template="$3" clone_vmid="$4" cores="$5" memory="$6"
  IDEATE_VMID=""
  IDEATE_CLONED=0
  if proxmox_container_exists "$container_name"; then
    IDEATE_VMID=$(proxmox_find_container_by_name "$container_name" | tr -d '[:space:]' | grep -o '[0-9]\+' | head -1)
    log_info "Found existing container '$container_name' with VMID $IDEATE_VMID"
    if [[ "$RECREATE" == true ]]; then
      log_info "Recreate: removing Tailscale identity for $container_name..."
      "${SCRIPT_DIR}/remove-lxc-from-tailscale.sh" "$IDEATE_VMID" "$container_name" 2>/dev/null || true
      log_info "Destroying container $IDEATE_VMID..."
      ideate_host_exec "pct stop $IDEATE_VMID" || true
      sleep 2
      ideate_host_exec "pct destroy $IDEATE_VMID" || { log_error "Failed to destroy $IDEATE_VMID"; return 1; }
      IDEATE_VMID=""
    fi
  fi
  if [[ -z "$IDEATE_VMID" ]]; then
    lxc_deploy_require_clone_template_name "$clone_template" "$container_name"
    ideate_clone_container "$clone_template" "$container_name" "$fixed_vmid" "$cores" "$memory" "$clone_vmid" || return 1
    IDEATE_VMID="$fixed_vmid"
    IDEATE_CLONED=1
    proxmox_ensure_service_rootfs_gb "$IDEATE_VMID"
  fi
}

ideate_bootstrap_lxc() {
  local vmid="$1" container_name="$2"
  proxmox_start_container "$vmid" || return 1
  sleep 3
  ideate_host_exec "pct set $vmid --onboot 1 --startup order=$vmid" || true
  proxmox_exec_in_container "$vmid" "echo $container_name > /etc/hostname && hostname -F /etc/hostname" || true
  proxmox_exec_in_container "$vmid" "grep -v '^127.0.1.1' /etc/hosts 2>/dev/null > /etc/hosts.new; printf '127.0.1.1\t%s\n' $container_name >> /etc/hosts.new; mv /etc/hosts.new /etc/hosts" || true
  proxmox_exec_in_container "$vmid" "systemctl stop systemd-resolved 2>/dev/null; systemctl disable systemd-resolved 2>/dev/null; systemctl mask systemd-resolved 2>/dev/null; rm -f /etc/resolv.conf; printf 'nameserver 8.8.8.8\nnameserver 8.8.4.4\nnameserver 100.100.100.100\n' > /etc/resolv.conf; chmod 644 /etc/resolv.conf" || true

  local user="${CONTAINER_USER:-raja}"
  local password="${CONTAINER_PASSWORD:-}"
  [[ -z "$password" ]] && { log_error "CONTAINER_PASSWORD must be set in .env"; return 1; }
  proxmox_ensure_container_user_exists "$vmid" "$user" || return 1
  proxmox_exec_in_container "$vmid" "echo '${user}:${password}' | chpasswd" || true
  proxmox_exec_in_container "$vmid" "ssh-keygen -A 2>/dev/null || true; systemctl restart ssh 2>/dev/null || systemctl restart sshd 2>/dev/null || true" || true
  if [[ -n "${SSH_PUBLIC_KEY:-}" ]]; then
    proxmox_exec_in_container "$vmid" "mkdir -p /home/${user}/.ssh && chmod 700 /home/${user}/.ssh && echo '${SSH_PUBLIC_KEY}' >> /home/${user}/.ssh/authorized_keys && chmod 600 /home/${user}/.ssh/authorized_keys && chown -R ${user}:${user} /home/${user}/.ssh" || true
  fi

  log_info "Enabling Tailscale TUN on VMID $vmid..."
  "${SCRIPT_DIR}/enable-lxc-tailscale-tun.sh" "$vmid"
  log_info "Joining tailnet as $container_name..."
  "${SCRIPT_DIR}/add-lxc-to-tailscale.sh" --required "$vmid" "$container_name"
}

ideate_wait_for_health() {
  local url="$1"
  local attempts="${2:-36}"
  local sleep_secs="${3:-5}"
  local i
  log_info "Waiting for health: $url"
  for ((i=1; i<=attempts; i++)); do
    if curl -sf "$url" >/dev/null 2>&1; then
      log_success "Healthy: $url"
      return 0
    fi
    sleep "$sleep_secs"
  done
  log_error "Health check failed: $url"
  return 1
}

ideate_native_copy() {
  local src="$1" dest="$2"
  cp -f "$src" "$dest"
}
