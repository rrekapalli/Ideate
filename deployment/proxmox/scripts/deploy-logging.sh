# deploy-logging.sh: timestamped log functions for deploy scripts (sourced).
# Prepends [HH:MM:SS] so Ansible "Output from deploy-*.sh" shows which step took longer.
# Source after SCRIPT_DIR and color vars are set (or use the colors below).

# Colors (if not already set)
RED="${RED:-\033[0;31m}"
GREEN="${GREEN:-\033[0;32m}"
YELLOW="${YELLOW:-\033[1;33m}"
BLUE="${BLUE:-\033[0;34m}"
CYAN="${CYAN:-\033[0;36m}"
NC="${NC:-\033[0m}"

_log_ts() { date '+%H:%M:%S'; }
log_info()    { echo -e "$(_log_ts) ${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "$(_log_ts) ${GREEN}[SUCCESS]${NC} $1"; }
log_warn()    { echo -e "$(_log_ts) ${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "$(_log_ts) ${RED}[ERROR]${NC} $1"; }
log_prompt()  { echo -e "$(_log_ts) ${CYAN}[?]${NC} $1"; }

# Idempotent Tailscale join after deploy verification (MagicDNS / stale identity refresh).
# Usage: ideate_deploy_final_tailscale <SCRIPT_DIR> [ --required ] <vmid> <container_name>
ideate_deploy_final_tailscale() {
    moneytree_deploy_final_tailscale "$@"
}
# Keep the MoneyTree helper name so copied Tailscale scripts still work if sourced.
moneytree_deploy_final_tailscale() {
    local d="${1:?}"
    shift
    local req=()
    while [[ "${1:-}" == --required ]]; do req+=(--required); shift; done
    local vmid="${1:?}"
    local cname="${2:?}"
    log_info "Final step: Tailscale join after successful deploy (idempotent)..."
    if [[ ${#req[@]} -gt 0 ]]; then
        "${d}/add-lxc-to-tailscale.sh" "${req[@]}" "$vmid" "$cname"
    else
        "${d}/add-lxc-to-tailscale.sh" "$vmid" "$cname" || true
    fi
}
