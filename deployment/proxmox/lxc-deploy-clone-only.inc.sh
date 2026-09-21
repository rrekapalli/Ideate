# shellcheck shell=bash
# Deploy scripts must clone existing profile templates (9001 Java, 9002 nginx), not download vztmpl.

lxc_deploy_vztmpl_fallback_disabled() {
    local service_hint="${1:-service}"
    log_error "Direct OS template (pveam) deploy is disabled for ${service_hint}."
    log_error "Set *_CLONE_TEMPLATE in deployment.conf and ensure MoneyTree bases 9001/9002 exist."
    exit 1
}

lxc_deploy_ensure_service_rootfs_gb() {
    local vmid="$1"
    local rootfs_gb="${2:-${LXC_ROOTFS_GB:-${LXC_BOOT_DISK_GB:-16}}}"
    [[ -z "$vmid" || ! "$vmid" =~ ^[0-9]+$ ]] && return 0
    [[ -z "$rootfs_gb" || ! "$rootfs_gb" =~ ^[0-9]+$ ]] && return 0
    log_info "Ensuring rootfs ${rootfs_gb}G on VMID ${vmid}..."
    if declare -f _pct_remote >/dev/null 2>&1 && [[ "${USE_REMOTE_PROXMOX:-false}" == true ]]; then
        _pct_remote "pct resize ${vmid} rootfs ${rootfs_gb}G" 2>/dev/null || log_info "Rootfs resize skipped (may already be ${rootfs_gb}G)"
    elif command -v pct >/dev/null 2>&1; then
        pct resize "$vmid" rootfs "${rootfs_gb}G" 2>/dev/null || log_info "Rootfs resize skipped (may already be ${rootfs_gb}G)"
    fi
}

lxc_deploy_require_clone_template_name() {
    local clone_template="$1"
    local service_hint="${2:-service}"
    if [[ "${REQUIRE_CLONE_TEMPLATE:-1}" != "1" ]]; then
        return 0
    fi
    if [[ -z "$clone_template" ]]; then
        log_error "${service_hint}: CLONE_TEMPLATE is empty. Need moneytree-lxc-base (9001) or moneytree-lxc-frontend-base (9002)."
        exit 1
    fi
}
